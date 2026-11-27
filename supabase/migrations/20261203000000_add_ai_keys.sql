-- 第8週：AIのAPIキー（BYOK）と、AIを呼んだ記録
-- キーはサーバーで暗号化してから保存する（暗号化の鍵は環境変数 BYOK_ENCRYPTION_KEY）。
-- 本人は、暗号文を読めない。読めるのは、サービスの種類と末尾4文字と更新日時だけ。
-- 暗号文を読むのは、AIを呼ぶRoute Handlerが secret key で行う。

-- ---- 利用者ごとのキー（1人1つ） ----
create table public.ai_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('gemini')),
  -- 「版.初期化ベクトル.認証タグ.暗号文」（どれもbase64）。
  ciphertext text not null check (char_length(ciphertext) between 20 and 1000),
  last4 text not null check (char_length(last4) = 4),
  updated_at timestamptz not null default now()
);

alter table public.ai_keys enable row level security;
revoke all on public.ai_keys from public, anon, authenticated, service_role;

create policy ai_keys_own on public.ai_keys
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- 本人は、暗号文以外を読め、登録・更新・削除ができる。
grant select (user_id, provider, last4, updated_at) on public.ai_keys to authenticated;
grant insert (user_id, provider, ciphertext, last4, updated_at) on public.ai_keys
  to authenticated;
grant update (provider, ciphertext, last4, updated_at) on public.ai_keys
  to authenticated;
grant delete on public.ai_keys to authenticated;
-- 暗号文を読むのは、AIを呼ぶときの secret key だけ。
grant select on public.ai_keys to service_role;

-- ---- AIを呼んだ記録。1日の回数の上限に使う ----
create table public.ai_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('cards', 'quest', 'check')),
  created_at timestamptz not null default now()
);

create index ai_requests_user_idx on public.ai_requests (user_id, created_at);

alter table public.ai_requests enable row level security;
revoke all on public.ai_requests from public, anon, authenticated, service_role;

create policy ai_requests_own on public.ai_requests
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select on public.ai_requests to authenticated;
grant insert (user_id, kind) on public.ai_requests to authenticated;

-- 1人1日20回まで。値は src/domain/limits.ts と合わせる。
-- enforce_row_limit は端末の列も見るため、ここでは利用者だけを数える専用のトリガーにする。
create function public.enforce_ai_request_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count bigint;
begin
  perform pg_advisory_xact_lock(
    hashtextextended('ai_requests:' || new.user_id::text, 0)
  );
  select count(*) into v_count
  from public.ai_requests r
  where r.user_id = new.user_id and r.created_at >= now() - interval '1 day';
  if v_count >= 20 then
    raise exception 'row_limit' using detail = 'ai_requests';
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_ai_request_limit()
  from public, anon, authenticated, service_role;

create trigger ai_requests_limit before insert on public.ai_requests
  for each row execute function public.enforce_ai_request_limit();
