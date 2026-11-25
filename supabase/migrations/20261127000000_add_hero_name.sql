-- 第7週：主人公の名前
-- 設定に列を足すだけで、公開中の画面はそのまま動く。

-- 名前だけを先に決められるように、世界線が未選択（null）の行を許す。
alter table public.user_settings
  alter column world_id drop not null,
  add column hero_name text
    constraint user_settings_hero_name_check check (
      char_length(hero_name) between 1 and 12
      and hero_name = btrim(hero_name)
      and hero_name !~ '[[:cntrl:]]'
    );

grant update (hero_name) on public.user_settings to authenticated;

-- 引き継ぎに、名前を加える。ほかの動きは変えない。
-- アカウントに名前があれば、そちらを優先して移さない。
create or replace function public.claim_device_records(
  p_device_id uuid,
  p_user_id uuid
)
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
    -- 隠したカードも移すが、画面の枚数と合わせるため数えない。
    (select count(*) from moved_cards m where m.archived_at is null),
    (select count(*) from moved_answers);
$$;
