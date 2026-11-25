-- 第6週：スマホとPCで同期する、写真とメモ
-- ログインした利用者だけが使う。表・置き場・合図の追加だけで、今ある表は変えない。

-- ---- メモ ----
create table public.notes (
  -- 画面側で発行する。再送しても二重登録にならない。
  id uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 500),
  has_image boolean not null default false,
  -- 写真を送り終えた時刻。null の間は、一覧に出さない。
  image_uploaded_at timestamptz,
  created_at timestamptz not null default now(),
  -- 文章か写真のどちらかは要る
  constraint notes_not_empty check (has_image or body ~ '\S'),
  constraint notes_image_only_when_has_image
    check (has_image or image_uploaded_at is null)
);

create index notes_user_created_idx
  on public.notes (user_id, created_at desc);

-- ---- 写真の置き場（非公開、1枚1MBまで） ----
-- 写真の名前は「利用者のID/メモのID」。
insert into storage.buckets
  (id, name, public, file_size_limit, allowed_mime_types)
values
  ('notes', 'notes', false, 1048576, array['image/jpeg', 'image/webp']);

-- ---- 権限：ログインした本人の行だけ ----
alter table public.notes enable row level security;
revoke all on public.notes from public, anon, authenticated, service_role;
grant select, delete on public.notes to authenticated;
grant insert (id, user_id, body, has_image) on public.notes to authenticated;
grant update (image_uploaded_at) on public.notes to authenticated;

create policy notes_select_own on public.notes for select to authenticated
  using (user_id = (select auth.uid()));
create policy notes_insert_own on public.notes for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy notes_update_own on public.notes for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- 写真が残っている間は消せない。行だけ消して写真をためるのを防ぐ。
create policy notes_delete_own on public.notes for delete to authenticated
  using (
    user_id = (select auth.uid())
    and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'notes'
        and o.name = notes.user_id::text || '/' || notes.id::text
    )
  );

-- 写真は、自分のメモの分だけ。上書きはできない。
create policy notes_image_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'notes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
create policy notes_image_insert_own on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'notes'
    and exists (
      select 1 from public.notes n
      where n.user_id = (select auth.uid())
        and n.has_image
        and objects.name = n.user_id::text || '/' || n.id::text
    )
  );
create policy notes_image_delete_own on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'notes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- ---- 件数の上限：1人200件 ----
create function public.enforce_notes_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- 同時に送られても超えないよう、利用者ごとに順番に数える。
  perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 0));
  -- 同じメモの再送は数えない。
  if (
    select count(*) from public.notes n
    where n.user_id = new.user_id and n.id <> new.id
  ) >= 200 then
    raise exception 'notes_limit';
  end if;
  return new;
end;
$$;

create trigger notes_limit before insert on public.notes
  for each row execute function public.enforce_notes_limit();

-- ---- 変わったことの合図 ----
-- 中身は送らない。受け取った画面が、APIで取り直す。
-- 合図の表（realtime.messages）へ書くため、所有者の権限で動かす。
-- トリガーからしか呼べず、持ち主あてにしか送らない。
create function public.notify_notes_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    '{}'::jsonb,
    'notes_changed',
    'notes:' || coalesce(new.user_id, old.user_id)::text,
    true
  );
  return null;
end;
$$;

create trigger notes_changed after insert or update or delete on public.notes
  for each row execute function public.notify_notes_changed();

revoke all on function
  public.enforce_notes_limit(), public.notify_notes_changed()
  from public, anon, authenticated, service_role;

-- 受け取れるのは本人あての合図だけ。送る許可は置かない。
create policy notes_signal_own on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and realtime.topic() = 'notes:' || (select auth.uid())::text
  );
