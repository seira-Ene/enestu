-- 第8週：ガチャ（DBと計算）
-- 学習の成果だけで引ける、無料のガチャ。お金は扱わない。
-- 券は記録から毎回数え（経験値60で1枚）、引いた記録は追記だけにする。
-- 値は src/domain/gacha.ts と合わせる。

-- ---- レアリティ：rank が高いほど珍しい。weight は1000回あたりの回数 ----
create table public.gacha_rarities (
  id text primary key,
  rank smallint not null unique check (rank between 1 and 6),
  weight integer not null check (weight > 0)
);

insert into public.gacha_rarities (id, rank, weight) values
  ('n', 1, 500),   -- ノーマル
  ('r', 2, 300),   -- レア
  ('sr', 3, 130),  -- スペシャルレア
  ('ssr', 4, 50),  -- スペシャルスーパーレア
  ('ur', 5, 15),   -- ウルトラレア
  ('pr', 6, 5);    -- パラレルレア

-- ---- 景品：世界線ごとに12種類。名前と絵は画面側が持つ ----
create table public.gacha_items (
  id text primary key check (id ~ '^[a-z]+-[a-z]+[0-9]$'),
  world_id text not null
    check (world_id in ('dungeon', 'otome', 'detective', 'live', 'cafe')),
  rarity text not null references public.gacha_rarities (id)
);

insert into public.gacha_items (id, world_id, rarity)
select w.id || '-' || s.slot, w.id, s.rarity
from (values ('dungeon'), ('otome'), ('detective'), ('live'), ('cafe')) as w (id)
cross join (
  values
    ('n1', 'n'), ('n2', 'n'), ('n3', 'n'),
    ('r1', 'r'), ('r2', 'r'), ('r3', 'r'),
    ('sr1', 'sr'), ('sr2', 'sr'),
    ('ssr1', 'ssr'), ('ssr2', 'ssr'),
    ('ur1', 'ur'),
    ('pr1', 'pr')
) as s (slot, rarity);

-- ---- 引いた記録：追記だけ。書き換えも削除もさせない ----
create table public.gacha_pulls (
  -- 引いた順。天井までの回数を数えるのに使う。
  id bigint generated always as identity primary key,
  device_id uuid,
  user_id uuid references auth.users (id) on delete cascade,
  -- 1回の操作（単発か10連）で引いた分。seq はその中の順番。
  batch_id uuid not null,
  seq smallint not null check (seq between 1 and 10),
  item_id text not null references public.gacha_items (id),
  created_at timestamptz not null default now(),
  constraint gacha_pulls_one_owner check (num_nonnulls(device_id, user_id) = 1),
  unique (batch_id, seq)
);

create index gacha_pulls_device_idx on public.gacha_pulls (device_id, id);
create index gacha_pulls_user_idx on public.gacha_pulls (user_id, id);

-- ---- 権限：景品の表は誰にも見せない。記録は本人の行だけを読める ----
alter table public.gacha_rarities enable row level security;
alter table public.gacha_items enable row level security;
alter table public.gacha_pulls enable row level security;
revoke all on public.gacha_rarities, public.gacha_items, public.gacha_pulls
  from public, anon, authenticated, service_role;

create policy gacha_pulls_own on public.gacha_pulls
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
grant select on public.gacha_pulls to authenticated, service_role;

create trigger gacha_pulls_limit before insert on public.gacha_pulls
  for each row execute function public.enforce_row_limit('100', '1 day');

-- ---- 計算：APIからは直接呼ばせない ----

-- p_roll（0以上1未満）に当たるレアリティ。p_min より低いものは出さない。
create function public.gacha_rarity_for(p_min text, p_roll double precision)
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select r.id
  from (
    select
      g.id,
      g.rank,
      sum(g.weight) over (order by g.rank) as upper,
      sum(g.weight) over () as total
    from public.gacha_rarities g
    where g.rank >= (select m.rank from public.gacha_rarities m where m.id = p_min)
  ) r
  where p_roll * r.total < r.upper
  order by r.rank
  limit 1;
$$;

-- その1回で、少なくとも出すレアリティ。
-- 天井：ウルトラレア以上が出ないまま99回引いたら、100回目はウルトラレア以上。
-- 10連：9回目までにスペシャルレア以上がなければ、10回目はスペシャルレア以上。
create function public.gacha_min_rarity(
  p_since_top bigint,
  p_count integer,
  p_seq integer,
  p_has_super boolean
)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select case
    when p_since_top >= 99 then 'ur'
    when p_count = 10 and p_seq = 10 and not p_has_super then 'sr'
    else 'n'
  end;
$$;

-- 持ち主の、もらった券・使った券・ウルトラレア以上が最後に出てから引いた回数。
-- 経験値の数え方は progress_totals と、券は src/domain/gacha.ts と同じ。
create function public.gacha_counts(p_device_id uuid, p_user_id uuid)
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
  pulls as (
    select p.id, g.rank
    from public.gacha_pulls p
    join public.gacha_items i on i.id = p.item_id
    join public.gacha_rarities g on g.id = i.rarity
    where p.device_id = p_device_id or p.user_id = p_user_id
  )
  select
    ((studies.seconds / 60) * 2 + answers.correct * 5) / 60,
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
  from studies, answers;
$$;

-- 券を使って引き、記録する。p_count は1（単発）か10（10連）。
create function public.gacha_draw(
  p_device_id uuid,
  p_user_id uuid,
  p_world_id text,
  p_count integer
)
returns table (seq smallint, item_id text, rarity text)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_counts record;
  v_batch uuid := gen_random_uuid();
  v_super smallint := (select g.rank from public.gacha_rarities g where g.id = 'sr');
  v_top smallint := (select g.rank from public.gacha_rarities g where g.id = 'ur');
  v_since bigint;
  v_has_super boolean := false;
  v_rarity text;
  v_rank smallint;
  v_item text;
begin
  if num_nonnulls(p_device_id, p_user_id) <> 1 then
    raise exception 'invalid_owner';
  end if;
  if p_count is null or p_count not in (1, 10) then
    raise exception 'invalid_count';
  end if;
  if not exists (
    select 1 from public.gacha_items i where i.world_id = p_world_id
  ) then
    raise exception 'invalid_world';
  end if;

  -- 同時に引かれても券の残りを超えないよう、持ち主ごとに順番に処理する。
  perform pg_advisory_xact_lock(
    hashtextextended('gacha:' || coalesce(p_user_id, p_device_id)::text, 0)
  );
  select * into v_counts from public.gacha_counts(p_device_id, p_user_id);
  if v_counts.earned - v_counts.spent < p_count then
    raise exception 'not_enough_tickets';
  end if;

  v_since := v_counts.since_top;
  for v_seq in 1..p_count loop
    v_rarity := public.gacha_rarity_for(
      public.gacha_min_rarity(v_since, p_count, v_seq, v_has_super),
      random()
    );
    select i.id into v_item
    from public.gacha_items i
    where i.world_id = p_world_id and i.rarity = v_rarity
    order by random()
    limit 1;
    insert into public.gacha_pulls (device_id, user_id, batch_id, seq, item_id)
    values (p_device_id, p_user_id, v_batch, v_seq, v_item);

    v_rank := (select g.rank from public.gacha_rarities g where g.id = v_rarity);
    v_since := case when v_rank >= v_top then 0 else v_since + 1 end;
    v_has_super := v_has_super or v_rank >= v_super;
  end loop;

  return query
    select p.seq, p.item_id, i.rarity
    from public.gacha_pulls p
    join public.gacha_items i on i.id = p.item_id
    where p.batch_id = v_batch
    order by p.seq;
end;
$$;

-- ---- 入口：ログインした人は本人のトークンで、端末は secret key で呼ぶ ----
-- 券と記録は本人に書き換えさせないため、所有者の権限で動かす。
-- 持ち主は引数で選ばせず、ログインした人は auth.uid() に決める。

create function public.my_gacha_status()
returns table (earned bigint, spent bigint, since_top bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.gacha_counts(null, (select auth.uid()));
$$;

create function public.gacha_status(p_device_id uuid)
returns table (earned bigint, spent bigint, since_top bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.gacha_counts(p_device_id, null);
$$;

create function public.my_gacha_pull(p_world_id text, p_count integer)
returns table (seq smallint, item_id text, rarity text)
language sql
volatile
security definer
set search_path = ''
as $$
  select * from public.gacha_draw(null, (select auth.uid()), p_world_id, p_count);
$$;

create function public.gacha_pull(
  p_device_id uuid,
  p_world_id text,
  p_count integer
)
returns table (seq smallint, item_id text, rarity text)
language sql
volatile
security definer
set search_path = ''
as $$
  select * from public.gacha_draw(p_device_id, null, p_world_id, p_count);
$$;

-- 持っている景品と、その数。RLSで本人の行だけを読む。
create function public.my_gacha_collection()
returns table (item_id text, copies bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.item_id, count(*)
  from public.gacha_pulls p
  where p.user_id = (select auth.uid())
  group by p.item_id;
$$;

create function public.gacha_collection(p_device_id uuid)
returns table (item_id text, copies bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.item_id, count(*)
  from public.gacha_pulls p
  where p.device_id = p_device_id
  group by p.item_id;
$$;

revoke all on function
  public.gacha_rarity_for(text, double precision),
  public.gacha_min_rarity(bigint, integer, integer, boolean),
  public.gacha_counts(uuid, uuid),
  public.gacha_draw(uuid, uuid, text, integer),
  public.my_gacha_status(),
  public.gacha_status(uuid),
  public.my_gacha_pull(text, integer),
  public.gacha_pull(uuid, text, integer),
  public.my_gacha_collection(),
  public.gacha_collection(uuid)
  from public, anon, authenticated, service_role;
grant execute on function
  public.my_gacha_status(),
  public.my_gacha_pull(text, integer),
  public.my_gacha_collection()
  to authenticated;
grant execute on function
  public.gacha_status(uuid),
  public.gacha_pull(uuid, text, integer),
  public.gacha_collection(uuid)
  to service_role;

-- ---- 引き継ぎに、ガチャの記録を加える ----
-- 返す列は変えない（券は記録から数えるので、学習の記録と一緒に移れば合う）。
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
