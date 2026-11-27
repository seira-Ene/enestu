-- 第7週：件数の上限
-- 無償枠を使い切られないよう、持ち主（端末か利用者）ごとに件数を制限する。
-- 普段の使い方では届かない値にする。値は src/domain/limits.ts と合わせる。

-- 引数：上限の件数、数える期間（空なら全期間）
create function public.enforce_row_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_limit integer := tg_argv[0]::integer;
  v_window interval := nullif(tg_argv[1], '')::interval;
  v_column text := case when new.user_id is null then 'device_id' else 'user_id' end;
  v_owner uuid := coalesce(new.user_id, new.device_id);
  v_count bigint;
begin
  -- 同時に送られても超えないよう、持ち主ごとに順番に数える。
  perform pg_advisory_xact_lock(
    hashtextextended(tg_table_name || ':' || v_owner::text, 0)
  );
  -- 同じ行の再送は数えない。
  execute format(
    'select count(*) from public.%I
     where %I = $1 and id <> $2 and ($3::interval is null or created_at >= now() - $3)',
    tg_table_name,
    v_column
  )
  into v_count
  using v_owner, new.id, v_window;
  if v_count >= v_limit then
    raise exception 'row_limit' using detail = tg_table_name;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_row_limit()
  from public, anon, authenticated, service_role;

create trigger quiz_cards_limit before insert on public.quiz_cards
  for each row execute function public.enforce_row_limit('2000', '');
create trigger explain_terms_limit before insert on public.explain_terms
  for each row execute function public.enforce_row_limit('1000', '');
create trigger study_logs_limit before insert on public.study_logs
  for each row execute function public.enforce_row_limit('200', '1 day');
create trigger answer_logs_limit before insert on public.answer_logs
  for each row execute function public.enforce_row_limit('2000', '1 day');
create trigger explanation_logs_limit before insert on public.explanation_logs
  for each row execute function public.enforce_row_limit('500', '1 day');
