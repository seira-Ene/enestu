-- 第3週：誤答原因の記録と科目別の集計
-- 既存の解答は mistake_reason が null（未分類）のまま残る。

alter table public.answer_logs
  add column mistake_reason text
    check (mistake_reason in ('knowledge', 'understanding', 'careless')),
  add constraint answer_logs_reason_only_when_wrong
    check (not is_correct or mistake_reason is null);

-- p_since 以降の学習時間と解答を、科目ごとに数える。
-- 正答率や苦手の判定は src/domain で行う。
create function public.subject_stats(p_device_id uuid, p_since timestamptz)
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
    where a.device_id = p_device_id and a.answered_at >= p_since
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

revoke all on function public.subject_stats(uuid, timestamptz)
  from public, anon, authenticated;
grant execute on function public.subject_stats(uuid, timestamptz)
  to service_role;
