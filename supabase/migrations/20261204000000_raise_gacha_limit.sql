-- 第8週：ガチャの1日の上限を、ログイン中は1,000回に広げる
-- 上限は、学習記録を偽って作った券で、DBの無償枠を使い切られないためのもの。
-- ログインした利用者は、ふつうに学習してためた券を一度に使えるよう、1日1,000回までにする。
-- 未ログインの端末は、端末IDを作り直せるため、これまでどおり1日100回まで。
-- 値は src/domain/gacha.ts と合わせる。

drop trigger gacha_pulls_limit on public.gacha_pulls;

create function public.enforce_gacha_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_is_user boolean := new.user_id is not null;
  v_owner uuid := coalesce(new.user_id, new.device_id);
  v_limit integer := case when v_is_user then 1000 else 100 end;
  v_count bigint;
begin
  -- 同時に引かれても超えないよう、持ち主ごとに順番に数える。
  perform pg_advisory_xact_lock(
    hashtextextended('gacha_pulls:' || v_owner::text, 0)
  );
  select count(*) into v_count
  from public.gacha_pulls p
  where (case when v_is_user then p.user_id = v_owner else p.device_id = v_owner end)
    and p.created_at >= now() - interval '1 day';
  if v_count >= v_limit then
    raise exception 'row_limit' using detail = 'gacha_pulls';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_gacha_limit()
  from public, anon, authenticated, service_role;

create trigger gacha_pulls_limit before insert on public.gacha_pulls
  for each row execute function public.enforce_gacha_limit();
