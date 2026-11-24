-- 第1週：学習記録
-- 認証導入（第5週）までは、RLSを有効にして許可ポリシーを置かず、
-- secret key を持つ Route Handler 経由でだけ読み書きする。

create table public.study_logs (
  -- 画面側で発行する。再送しても二重登録にならない。
  id uuid primary key,
  device_id uuid not null,
  subject text not null check (char_length(btrim(subject)) between 1 and 50),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  duration_seconds integer not null generated always as
    (floor(extract(epoch from (ended_at - started_at)))::integer) stored,
  created_at timestamptz not null default now(),
  check (duration_seconds between 1 and 86400)
);

create index study_logs_device_ended_idx
  on public.study_logs (device_id, ended_at desc);

alter table public.study_logs enable row level security;

revoke all on public.study_logs from anon, authenticated;
grant select, insert on public.study_logs to service_role;
