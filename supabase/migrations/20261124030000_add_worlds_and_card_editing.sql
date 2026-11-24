-- 第4週：世界線の設定、カードの編集・削除、レベル用の合計
-- テーブル・列・関数の追加と、集計関数の置き換え。公開中の画面はそのまま動く。

-- 4-1 選んでいる世界線
create table public.user_settings (
  device_id uuid primary key,
  world_id text not null
    check (world_id in ('dungeon', 'otome', 'detective', 'live', 'cafe')),
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;
revoke all on public.user_settings from anon, authenticated;
grant select, insert, update on public.user_settings to service_role;

-- 4-2 カードの編集・削除（削除は隠すだけで、解答の記録は残す）
alter table public.quiz_cards add column archived_at timestamptz;

grant update (subject, question, answer, archived_at)
  on public.quiz_cards to service_role;

-- 隠したカードの解答を集計から外す。解けない科目がクエストに出ないようにするため。
create or replace function public.subject_stats(
  p_device_id uuid,
  p_since timestamptz
)
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
    where s.device_id = p_device_id and s.ended_at >= p_since
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
    join public.quiz_cards c on c.id = a.card_id and c.device_id = a.device_id
    where a.device_id = p_device_id
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

-- 4-3 レベル用の、これまでの合計。カードを隠しても減らない。
create function public.progress_totals(p_device_id uuid)
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
      where s.device_id = p_device_id
    ),
    (
      select count(*)
      from public.answer_logs a
      where a.device_id = p_device_id and a.is_correct
    );
$$;

revoke all on function public.progress_totals(uuid)
  from public, anon, authenticated;
grant execute on function public.progress_totals(uuid) to service_role;
