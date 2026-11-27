-- 第8週：毎日の記録と報酬（ログインボーナスとデイリーミッション）
-- 1日は日本時間の朝4時に切り替わる（夜ふかしの学習も、その日に数える）。
-- 受け取りは関数だけが記録し、同じ持ち主・日・種類は1回しか受け取れない。
-- 報酬は券と素材だけ。経験値は増やさない（レベルは実際の学習量のまま）。
-- 値は src/domain/daily.ts と合わせる。

-- ---- 受け取った記録。報酬もこの行に残す ----
create table public.daily_claims (
  id bigint generated always as identity primary key,
  device_id uuid,
  user_id uuid references auth.users (id) on delete cascade,
  day date not null,
  kind text not null
    check (kind in ('login', 'study', 'answers', 'explain', 'all_clear')),
  tickets smallint not null default 0 check (tickets between 0 and 3),
  -- もらった素材。なければ null。
  item_id text references public.gacha_items (id),
  created_at timestamptz not null default now(),
  constraint daily_claims_one_owner check (num_nonnulls(device_id, user_id) = 1),
  -- 持ち主ごとに、同じ日・同じ種類は1回だけ。
  unique (device_id, day, kind),
  unique (user_id, day, kind)
);

create index daily_claims_user_idx on public.daily_claims (user_id, day);

alter table public.daily_claims enable row level security;
revoke all on public.daily_claims
  from public, anon, authenticated, service_role;
create policy daily_claims_own on public.daily_claims
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select on public.daily_claims to authenticated, service_role;

-- ---- 計算：APIからは直接呼ばせない ----

-- その時刻が属する日。日本時間の朝4時で切り替わる。
create function public.daily_day(p_at timestamptz)
returns date
language sql
stable
security invoker
set search_path = ''
as $$
  select ((p_at at time zone 'Asia/Tokyo') - interval '4 hours')::date;
$$;

-- 今日の進み具合と、訪問の記録。
-- 学習・解答・説明は、サーバーが保存した時刻（created_at）で数える。
create function public.daily_status_of(p_device_id uuid, p_user_id uuid)
returns table (
  day date,
  claimed text[],
  study_seconds bigint,
  answers bigint,
  explanations bigint,
  -- 今日までの連続日数。今日まだ受け取っていなければ、昨日までの分。途切れたら0。
  streak integer,
  -- 今日より前で、最後にログインボーナスを受け取った日。
  last_visit date
)
language sql
stable
security invoker
set search_path = ''
as $$
  with today as (
    select public.daily_day(now()) as day
  ),
  mine as (
    select c.day, c.kind
    from public.daily_claims c
    where c.device_id = p_device_id or c.user_id = p_user_id
  ),
  visits as (
    select distinct m.day from mine m, today t
    where m.kind = 'login' and m.day <= t.day
  ),
  -- 続いた日どうしは、日付から順番を引くと同じ値になる。
  runs as (
    select v.day, v.day - (row_number() over (order by v.day))::integer as run
    from visits v
  ),
  latest as (
    select r.day, r.run from runs r order by r.day desc limit 1
  )
  select
    t.day,
    coalesce(
      (select array_agg(m.kind order by m.kind) from mine m where m.day = t.day),
      '{}'
    ),
    (
      select coalesce(sum(s.duration_seconds), 0)::bigint
      from public.study_logs s
      where (s.device_id = p_device_id or s.user_id = p_user_id)
        and public.daily_day(s.created_at) = t.day
    ),
    (
      select count(*)
      from public.answer_logs a
      where (a.device_id = p_device_id or a.user_id = p_user_id)
        and public.daily_day(a.created_at) = t.day
    ),
    (
      select count(*)
      from public.explanation_logs e
      where (e.device_id = p_device_id or e.user_id = p_user_id)
        and public.daily_day(e.created_at) = t.day
    ),
    coalesce(
      (
        select count(*)::integer from runs r, latest l
        where r.run = l.run and l.day >= t.day - 1
      ),
      0
    ),
    (select max(v.day) from visits v where v.day < t.day)
  from today t;
$$;

-- その世界線の、そのレアリティの素材を1つ選ぶ。
create function public.daily_material(p_world_id text, p_rarity text)
returns text
language sql
volatile
security invoker
set search_path = ''
as $$
  select i.id
  from public.gacha_items i
  where i.world_id = p_world_id and i.rarity = p_rarity
  order by random()
  limit 1;
$$;

-- 条件を確かめて受け取り、報酬を記録する。
-- login：券1枚。7日連続の日ごとに、券3枚とレアの素材。
-- study：今日15分以上の学習で券1枚。answers：今日5問以上でノーマルの素材。
-- explain：今日1つ以上の説明でレアの素材。all_clear：3つとも受け取ったら券1枚。
create function public.daily_claim_for(
  p_device_id uuid,
  p_user_id uuid,
  p_kind text,
  p_world_id text
)
returns table (kind text, tickets smallint, item_id text, streak integer)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_status record;
  v_streak integer;
  v_tickets smallint := 0;
  v_item text;
begin
  if num_nonnulls(p_device_id, p_user_id) <> 1 then
    raise exception 'invalid_owner';
  end if;
  if not exists (
    select 1 from public.gacha_items i where i.world_id = p_world_id
  ) then
    raise exception 'invalid_world';
  end if;

  select * into v_status from public.daily_status_of(p_device_id, p_user_id);
  if p_kind = any (v_status.claimed) then
    raise exception 'already_claimed';
  end if;
  v_streak := v_status.streak;

  case p_kind
    when 'login' then
      -- 今日の分を足した連続日数（途切れていれば streak は0なので、1になる）。
      v_streak := v_status.streak + 1;
      if v_streak % 7 = 0 then
        v_tickets := 3;
        v_item := public.daily_material(p_world_id, 'r');
      else
        v_tickets := 1;
      end if;
    when 'study' then
      if v_status.study_seconds < 15 * 60 then raise exception 'not_achieved'; end if;
      v_tickets := 1;
    when 'answers' then
      if v_status.answers < 5 then raise exception 'not_achieved'; end if;
      v_item := public.daily_material(p_world_id, 'n');
    when 'explain' then
      if v_status.explanations < 1 then raise exception 'not_achieved'; end if;
      v_item := public.daily_material(p_world_id, 'r');
    when 'all_clear' then
      if not (array['study', 'answers', 'explain'] <@ v_status.claimed) then
        raise exception 'not_achieved';
      end if;
      v_tickets := 1;
    else
      raise exception 'invalid_kind';
  end case;

  begin
    insert into public.daily_claims (device_id, user_id, day, kind, tickets, item_id)
    values (p_device_id, p_user_id, v_status.day, p_kind, v_tickets, v_item);
  exception when unique_violation then
    -- 同時に受け取ろうとしたとき。
    raise exception 'already_claimed';
  end;

  return query select p_kind, v_tickets, v_item, v_streak;
end;
$$;

-- ---- 入口：ログインした人は本人のトークンで、端末は secret key で呼ぶ ----
-- 受け取りの記録を本人に書き換えさせないため、所有者の権限で動かす。
-- 持ち主は引数で選ばせず、ログインした人は auth.uid() に決める。

create function public.my_daily_status()
returns table (
  day date,
  claimed text[],
  study_seconds bigint,
  answers bigint,
  explanations bigint,
  streak integer,
  last_visit date
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.daily_status_of(null, (select auth.uid()));
$$;

create function public.daily_status(p_device_id uuid)
returns table (
  day date,
  claimed text[],
  study_seconds bigint,
  answers bigint,
  explanations bigint,
  streak integer,
  last_visit date
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.daily_status_of(p_device_id, null);
$$;

create function public.my_daily_claim(p_kind text, p_world_id text)
returns table (kind text, tickets smallint, item_id text, streak integer)
language sql
volatile
security definer
set search_path = ''
as $$
  select * from public.daily_claim_for(null, (select auth.uid()), p_kind, p_world_id);
$$;

create function public.daily_claim(
  p_device_id uuid,
  p_kind text,
  p_world_id text
)
returns table (kind text, tickets smallint, item_id text, streak integer)
language sql
volatile
security definer
set search_path = ''
as $$
  select * from public.daily_claim_for(p_device_id, null, p_kind, p_world_id);
$$;

revoke all on function
  public.daily_day(timestamptz),
  public.daily_status_of(uuid, uuid),
  public.daily_material(text, text),
  public.daily_claim_for(uuid, uuid, text, text),
  public.my_daily_status(),
  public.daily_status(uuid),
  public.my_daily_claim(text, text),
  public.daily_claim(uuid, text, text)
  from public, anon, authenticated, service_role;
grant execute on function
  public.my_daily_status(),
  public.my_daily_claim(text, text)
  to authenticated;
grant execute on function
  public.daily_status(uuid),
  public.daily_claim(uuid, text, text)
  to service_role;

-- ---- ガチャの券と図鑑に、報酬を加える ----
-- 返す列は変えない。

create or replace function public.gacha_counts(p_device_id uuid, p_user_id uuid)
returns table (earned bigint, spent bigint, since_top bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  with studies as (
    select coalesce(sum(s.duration_seconds), 0)::bigint as seconds
    from public.study_logs s
    where s.device_id = p_device_id or s.user_id = p_user_id
  ),
  answers as (
    select count(*) as correct
    from public.answer_logs a
    where (a.device_id = p_device_id or a.user_id = p_user_id) and a.is_correct
  ),
  -- ログインボーナスとミッションでもらった券。
  bonus as (
    select coalesce(sum(c.tickets), 0)::bigint as tickets
    from public.daily_claims c
    where c.device_id = p_device_id or c.user_id = p_user_id
  ),
  pulls as (
    select p.id, g.rank
    from public.gacha_pulls p
    join public.gacha_items i on i.id = p.item_id
    join public.gacha_rarities g on g.id = i.rarity
    where p.device_id = p_device_id or p.user_id = p_user_id
  )
  select
    ((studies.seconds / 60) * 2 + answers.correct * 5) / 60 + bonus.tickets,
    (select count(*) from pulls),
    (
      select count(*) from pulls p
      where p.id > coalesce(
        (
          select max(t.id) from pulls t
          where t.rank >= (select g.rank from public.gacha_rarities g where g.id = 'ur')
        ),
        0
      )
    )
  from studies, answers, bonus;
$$;

-- 持っている景品と、その数。ガチャで出た分と、報酬でもらった素材を合わせる。
create or replace function public.my_gacha_collection()
returns table (item_id text, copies bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select owned.item_id, count(*)
  from (
    select p.item_id from public.gacha_pulls p
    where p.user_id = (select auth.uid())
    union all
    select c.item_id from public.daily_claims c
    where c.user_id = (select auth.uid()) and c.item_id is not null
  ) owned
  group by owned.item_id;
$$;

create or replace function public.gacha_collection(p_device_id uuid)
returns table (item_id text, copies bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select owned.item_id, count(*)
  from (
    select p.item_id from public.gacha_pulls p
    where p.device_id = p_device_id
    union all
    select c.item_id from public.daily_claims c
    where c.device_id = p_device_id and c.item_id is not null
  ) owned
  group by owned.item_id;
$$;

-- ---- 引き継ぎに、受け取った記録を加える ----
-- 利用者が同じ日・同じ種類をすでに受け取っていれば、その行は端末に残す（二重にしない）。
-- 返す列は変えない。
create or replace function public.claim_device_records(
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
  -- 返す数には入れないが、WITH の中の更新は必ず実行される。
  moved_gacha as (
    update public.gacha_pulls g
    set device_id = null, user_id = p_user_id
    where g.device_id = p_device_id
    returning 1
  ),
  moved_daily as (
    update public.daily_claims d
    set device_id = null, user_id = p_user_id
    where d.device_id = p_device_id
      and not exists (
        select 1 from public.daily_claims mine
        where mine.user_id = p_user_id and mine.day = d.day and mine.kind = d.kind
      )
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
