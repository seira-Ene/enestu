-- 第7週：言語化チェック（用語とキーワード、説明の記録）
-- 表の追加と、引き継ぎの関数の置き換え。公開中の画面はそのまま動く。

-- ---- 用語 ----
create table public.explain_terms (
  id uuid primary key,
  device_id uuid,
  user_id uuid references auth.users (id) on delete cascade,
  subject text not null check (char_length(btrim(subject)) between 1 and 50),
  term text not null check (char_length(btrim(term)) between 1 and 50),
  -- 1つが1つの観点。「/」で区切ると、どれか1つを含めばよい言い換えになる。
  keywords text[] not null check (
    array_ndims(keywords) = 1
    and cardinality(keywords) between 1 and 10
    and array_position(keywords, null) is null
    and array_position(keywords, '') is null
    and char_length(array_to_string(keywords, '')) <= 600
  ),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  constraint explain_terms_one_owner
    check (num_nonnulls(device_id, user_id) = 1),
  unique (id, device_id),
  unique (id, user_id)
);

create index explain_terms_device_idx
  on public.explain_terms (device_id, created_at desc);
create index explain_terms_user_idx
  on public.explain_terms (user_id, created_at desc);

-- ---- 説明の記録 ----
create table public.explanation_logs (
  id uuid primary key,
  device_id uuid,
  user_id uuid references auth.users (id) on delete cascade,
  term_id uuid not null,
  body text not null check (char_length(body) <= 1000 and body ~ '\S'),
  total_count smallint not null check (total_count between 1 and 10),
  -- 足りなかった観点。後で用語を直しても、そのときの結果を残す。
  missing text[] not null check (
    cardinality(missing) <= total_count
    and array_position(missing, null) is null
    and char_length(array_to_string(missing, '')) <= 600
  ),
  explained_at timestamptz not null,
  created_at timestamptz not null default now(),
  constraint explanation_logs_one_owner
    check (num_nonnulls(device_id, user_id) = 1),
  -- 自分の用語にだけ記録できる（列がnullの側は検査されない）
  foreign key (term_id, device_id)
    references public.explain_terms (id, device_id),
  foreign key (term_id, user_id)
    references public.explain_terms (id, user_id)
);

create index explanation_logs_device_idx
  on public.explanation_logs (device_id, explained_at desc);
create index explanation_logs_user_idx
  on public.explanation_logs (user_id, explained_at desc);

-- ---- 権限：ログインした本人の行だけ。削除は誰にも許さない ----
alter table public.explain_terms enable row level security;
alter table public.explanation_logs enable row level security;
revoke all on public.explain_terms, public.explanation_logs
  from public, anon, authenticated, service_role;

create policy explain_terms_own on public.explain_terms
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy explanation_logs_own on public.explanation_logs
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert on public.explain_terms, public.explanation_logs
  to authenticated, service_role;
grant update (subject, term, keywords, archived_at) on public.explain_terms
  to authenticated, service_role;

-- ---- 引き継ぎに、用語と説明を加える ----
-- 返す列が増えるため、作り直す。ほかの動きは変えない。
drop function public.claim_device_records(uuid, uuid);

create function public.claim_device_records(
  p_device_id uuid,
  p_user_id uuid
)
returns table (
  study_logs bigint,
  cards bigint,
  answers bigint,
  terms bigint,
  explanations bigint
)
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
  moved_terms as (
    update public.explain_terms t
    set device_id = null, user_id = p_user_id
    where t.device_id = p_device_id
    returning t.archived_at
  ),
  moved_explanations as (
    update public.explanation_logs e
    set device_id = null, user_id = p_user_id
    where e.device_id = p_device_id
    returning 1
  ),
  -- アカウントに設定がなければ、設定ごと移す。
  moved_settings as (
    update public.user_settings u
    set device_id = null, user_id = p_user_id
    where u.device_id = p_device_id
      and not exists (
        select 1 from public.user_settings mine where mine.user_id = p_user_id
      )
    returning 1
  ),
  -- 設定はあるが名前がなければ、名前だけを写し、端末からは消す。
  copied_name as (
    update public.user_settings mine
    set hero_name = device.hero_name
    from public.user_settings device
    where mine.user_id = p_user_id
      and mine.hero_name is null
      and device.device_id = p_device_id
      and device.hero_name is not null
    returning 1
  ),
  cleared_name as (
    update public.user_settings device
    set hero_name = null
    where device.device_id = p_device_id
      and device.hero_name is not null
      and exists (
        select 1 from public.user_settings mine
        where mine.user_id = p_user_id and mine.hero_name is null
      )
    returning 1
  )
  select
    (select count(*) from moved_studies),
    -- 隠したカードと用語も移すが、画面の枚数と合わせるため数えない。
    (select count(*) from moved_cards m where m.archived_at is null),
    (select count(*) from moved_answers),
    (select count(*) from moved_terms m where m.archived_at is null),
    (select count(*) from moved_explanations);
$$;

revoke all on function public.claim_device_records(uuid, uuid)
  from public, anon, authenticated, service_role;
grant execute on function public.claim_device_records(uuid, uuid)
  to service_role;
