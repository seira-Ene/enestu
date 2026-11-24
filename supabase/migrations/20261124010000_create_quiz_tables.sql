-- 第2週：一問一答カードと解答履歴
-- 第1週と同じく、RLSを有効にして許可ポリシーを置かず、
-- secret key を持つ Route Handler 経由でだけ読み書きする。

create table public.quiz_cards (
  id uuid primary key,
  device_id uuid not null,
  subject text not null check (char_length(btrim(subject)) between 1 and 50),
  question text not null check (char_length(btrim(question)) between 1 and 200),
  answer text not null check (char_length(btrim(answer)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique (id, device_id)
);

create index quiz_cards_device_created_idx
  on public.quiz_cards (device_id, created_at desc);

create table public.answer_logs (
  id uuid primary key,
  device_id uuid not null,
  card_id uuid not null,
  user_answer text not null check (char_length(user_answer) <= 100),
  is_correct boolean not null,
  answered_at timestamptz not null,
  created_at timestamptz not null default now(),
  -- 他の端末のカードには解答を記録できない
  foreign key (card_id, device_id) references public.quiz_cards (id, device_id)
);

create index answer_logs_device_answered_idx
  on public.answer_logs (device_id, answered_at desc);

alter table public.quiz_cards enable row level security;
alter table public.answer_logs enable row level security;

revoke all on public.quiz_cards, public.answer_logs from anon, authenticated;
grant select, insert on public.quiz_cards, public.answer_logs to service_role;
