-- 第5週：利用者アカウントと権限の分離
-- 記録の持ち主を「端末」か「利用者」のどちらか1つにする。
-- 既存の記録は端末のもののまま残り、公開中の画面もそのまま動く。
-- 未ログイン（anon）は、これまでどおりDBに直接触れない。

-- ---- 学習記録 ----
alter table public.study_logs
  alter column device_id drop not null,
  add column user_id uuid references auth.users (id) on delete cascade,
  add constraint study_logs_one_owner
    check (num_nonnulls(device_id, user_id) = 1);

create index study_logs_user_ended_idx
  on public.study_logs (user_id, ended_at desc);

-- ---- 一問一答カード ----
alter table public.quiz_cards
  alter column device_id drop not null,
  add column user_id uuid references auth.users (id) on delete cascade,
  add constraint quiz_cards_one_owner
    check (num_nonnulls(device_id, user_id) = 1),
  add constraint quiz_cards_id_user_id_key unique (id, user_id);

create index quiz_cards_user_created_idx
  on public.quiz_cards (user_id, created_at desc);

-- ---- 解答 ----
-- 端末の解答は今ある外部キー、利用者の解答は下の外部キーで、
-- 自分のカードにしか記録できない（列がnullの側は検査されない）。
alter table public.answer_logs
  alter column device_id drop not null,
  add column user_id uuid references auth.users (id) on delete cascade,
  add constraint answer_logs_one_owner
    check (num_nonnulls(device_id, user_id) = 1),
  add constraint answer_logs_card_id_user_id_fkey
    foreign key (card_id, user_id) references public.quiz_cards (id, user_id);

create index answer_logs_user_answered_idx
  on public.answer_logs (user_id, answered_at desc);

-- ---- 設定 ----
-- 端末ごと、利用者ごとに1行。主キーは持ち主によらない id にする。
alter table public.user_settings
  drop constraint user_settings_pkey,
  alter column device_id drop not null,
  add column id uuid primary key default gen_random_uuid(),
  add column user_id uuid unique references auth.users (id) on delete cascade,
  add constraint user_settings_device_id_key unique (device_id),
  add constraint user_settings_one_owner
    check (num_nonnulls(device_id, user_id) = 1);

-- ---- 権限：ログインした本人の行だけ。削除は誰にも許さない ----
create policy study_logs_own on public.study_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy quiz_cards_own on public.quiz_cards for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy answer_logs_own on public.answer_logs for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy user_settings_own on public.user_settings for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert
  on public.study_logs, public.quiz_cards, public.answer_logs,
    public.user_settings
  to authenticated;
grant update (subject, question, answer, archived_at)
  on public.quiz_cards to authenticated;
-- user_id は、保存し直し（upsert）で同じ値を書くために要る。
-- 他人の値へは、上のポリシーが変えさせない。
grant update (user_id, world_id, updated_at)
  on public.user_settings to authenticated;

-- ---- 集計：ログイン中の本人だけ ----
-- 数え方は subject_stats と同じ。変えるときは両方を直す。
create function public.my_subject_stats(p_since timestamptz)
returns table (
  subject text,
  study_seconds bigint,
  answer_count bigint,
  correct_count bigint,
  knowledge_count bigint,
  understanding_count bigint,
  careless_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with studied as (
    select s.subject, sum(s.duration_seconds) as seconds
    from public.study_logs s
    where s.user_id = (select auth.uid()) and s.ended_at >= p_since
    group by s.subject
  ),
  answered as (
    select
      c.subject,
      count(*) as total,
      count(*) filter (where a.is_correct) as correct,
      count(*) filter (where a.mistake_reason = 'knowledge') as knowledge,
      count(*) filter (where a.mistake_reason = 'understanding') as understanding,
      count(*) filter (where a.mistake_reason = 'careless') as careless
    from public.answer_logs a
    join public.quiz_cards c on c.id = a.card_id and c.user_id = a.user_id
    where a.user_id = (select auth.uid())
      and a.answered_at >= p_since
      and c.archived_at is null
    group by c.subject
  )
  select
    coalesce(st.subject, an.subject),
    coalesce(st.seconds, 0)::bigint,
    coalesce(an.total, 0),
    coalesce(an.correct, 0),
    coalesce(an.knowledge, 0),
    coalesce(an.understanding, 0),
    coalesce(an.careless, 0)
  from studied st
  full join answered an on an.subject = st.subject;
$$;

-- 数え方は progress_totals と同じ。変えるときは両方を直す。
create function public.my_progress_totals()
returns table (study_seconds bigint, correct_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (
      select coalesce(sum(s.duration_seconds), 0)::bigint
      from public.study_logs s
      where s.user_id = (select auth.uid())
    ),
    (
      select count(*)
      from public.answer_logs a
      where a.user_id = (select auth.uid()) and a.is_correct
    );
$$;

revoke all on function
  public.my_subject_stats(timestamptz), public.my_progress_totals()
  from public, anon, authenticated, service_role;
grant execute on function
  public.my_subject_stats(timestamptz), public.my_progress_totals()
  to authenticated;

-- ---- 引き継ぎ：端末の記録を利用者へ移す ----
-- 1つの文で移すので、途中で失敗したら何も移らない。
-- 持ち主を変える権限をアプリの鍵に与えないため、所有者の権限で動かす。
-- 本人確認は呼び出し側（Route Handler）で済ませておくこと。
create function public.claim_device_records(p_device_id uuid, p_user_id uuid)
returns table (study_logs bigint, cards bigint, answers bigint)
language sql
volatile
security definer
set search_path = ''
as $$
  with moved_studies as (
    update public.study_logs s
    set device_id = null, user_id = p_user_id
    where s.device_id = p_device_id
    returning 1
  ),
  moved_cards as (
    update public.quiz_cards c
    set device_id = null, user_id = p_user_id
    where c.device_id = p_device_id
    returning c.archived_at
  ),
  moved_answers as (
    update public.answer_logs a
    set device_id = null, user_id = p_user_id
    where a.device_id = p_device_id
    returning 1
  ),
  -- アカウントに設定があれば、そちらを優先して移さない。
  moved_settings as (
    update public.user_settings u
    set device_id = null, user_id = p_user_id
    where u.device_id = p_device_id
      and not exists (
        select 1 from public.user_settings mine where mine.user_id = p_user_id
      )
    returning 1
  )
  select
    (select count(*) from moved_studies),
    -- 隠したカードも移すが、画面の枚数と合わせるため数えない。
    (select count(*) from moved_cards m where m.archived_at is null),
    (select count(*) from moved_answers);
$$;

revoke all on function public.claim_device_records(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_device_records(uuid, uuid)
  to service_role;
