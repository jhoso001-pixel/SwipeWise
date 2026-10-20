-- SwipeWise schema (PostgreSQL 13+). In pgAdmin: Query Tool > open file > Execute.
-- Plan data comes from plattsburgh.edu/plattslife/food-dining/meal-plans.html (2026/2027 student plans).

create extension if not exists citext;

-- 1. Accounts: your app's own users. Nothing here comes from the school's systems.
create table users (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  school_email  citext not null unique
                check (school_email ~* '^[^@\s]+@(.+\.)?plattsburgh\.edu$'),
  password_hash text not null,   -- bcrypt/argon2 hash made by your API; never store the raw password
  created_at    timestamptz not null default now()
);

-- 2. Semesters. Swipes and guest passes expire each term; Dining Dollars roll fall -> spring.
create table terms (
  id          smallint generated always as identity primary key,
  name        text not null unique,                       -- 'Fall 2026'
  season      text not null check (season in ('fall','spring')),
  start_date  date not null,
  end_date    date not null check (end_date > start_date)
);

-- 3. Catalog of meal plans (what the school offers).
create table meal_plans (
  id                     smallint generated always as identity primary key,
  academic_year          text not null default '2026/2027',
  code                   text not null,
  name                   text not null,
  audience               text not null check (audience in ('undergrad_resident','grad','off_campus')),
  swipe_mode             text not null check (swipe_mode in ('weekly_reset','semester_block','none')),
  swipes_per_week        smallint,                        -- weekly_reset: retail swipes that reset each week
  total_swipes           smallint,                        -- semester_block: one pool for the semester
  unlimited_dining_hall  boolean  not null default false, -- unlimited Clinton Dining Hall access
  dining_dollars         numeric(8,2) not null default 0,
  cardinal_cash          numeric(8,2) not null default 0,
  guest_passes           smallint not null default 0,
  est_meals_per_semester smallint,
  cost_per_semester      numeric(8,2) not null,
  min_credit_hours       smallint not null default 0,     -- eligibility: 0, 28 (Gold/Silver), 64 (Bronze)
  is_default             boolean  not null default false,
  notes                  text,
  unique (academic_year, code),
  check ((swipe_mode = 'weekly_reset'   and swipes_per_week is not null)
      or (swipe_mode = 'semester_block' and total_swipes   is not null)
      or  swipe_mode = 'none')
);

-- 4. Where students eat. pos_names = how the place appears on exported statements.
create table venues (
  id         smallint generated always as identity primary key,
  name       text not null unique,
  kind       text not null check (kind in ('dining_hall','retail')),
  pos_names  text[] not null default '{}'
);

-- 5. Which plan a user has in which term. Starting balances are copied in so extra 10-packs
--    and fall rollover Dining Dollars are captured.
create table user_plans (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references users(id) on delete cascade,
  term_id                 smallint not null references terms(id),
  plan_id                 smallint not null references meal_plans(id),
  starting_swipes         smallint     not null default 0,
  starting_dining_dollars numeric(8,2) not null default 0,   -- spring: include fall leftovers
  starting_cardinal_cash  numeric(8,2) not null default 0,
  starting_guest_passes   smallint     not null default 0,
  created_at              timestamptz  not null default now(),
  unique (user_id, term_id)
);

-- 6. Ledger: one row per purchase or top-up. Negative delta = spent, positive = added.
--    Balances are calculated from this (see v_balances), so they can never drift out of sync.
create table transactions (
  id                    bigint generated always as identity primary key,
  user_plan_id          uuid not null references user_plans(id) on delete cascade,
  venue_id              smallint references venues(id),
  occurred_at           timestamptz not null default now(),
  swipes_delta          smallint     not null default 0,
  dining_dollars_delta  numeric(8,2) not null default 0,
  cardinal_cash_delta   numeric(8,2) not null default 0,
  guest_passes_delta    smallint     not null default 0,
  source                text not null default 'manual' check (source in ('manual','csv_import','sync')),
  note                  text
);
create index on transactions (user_plan_id, occurred_at desc);

-- Live balances + days left: this is what the home screen reads.
create view v_balances as
select up.id as user_plan_id, up.user_id, t.name as term, p.name as plan,
       up.starting_swipes + coalesce(sum(x.swipes_delta), 0)                  as swipes_left,
       up.starting_dining_dollars + coalesce(sum(x.dining_dollars_delta), 0)  as dining_dollars_left,
       up.starting_cardinal_cash + coalesce(sum(x.cardinal_cash_delta), 0)    as cardinal_cash_left,
       up.starting_guest_passes + coalesce(sum(x.guest_passes_delta), 0)      as guest_passes_left,
       t.end_date,
       greatest(t.end_date - current_date, 1)                                 as days_left
from user_plans up
join terms t      on t.id = up.term_id
join meal_plans p on p.id = up.plan_id
left join transactions x on x.user_plan_id = up.id
group by up.id, t.id, p.id;

-- Swipes used per week (Platinum/Premium reset weekly, so the weekly cap matters).
create view v_weekly_swipes as
select user_plan_id,
       date_trunc('week', occurred_at at time zone 'America/New_York')::date as week_start,
       -sum(swipes_delta) as swipes_used
from transactions
where swipes_delta < 0
group by 1, 2;

-- Seed: meal plans
insert into meal_plans
 (code, name, audience, swipe_mode, swipes_per_week, total_swipes, unlimited_dining_hall,
  dining_dollars, cardinal_cash, guest_passes, est_meals_per_semester, cost_per_semester,
  min_credit_hours, is_default, notes) values
 ('platinum','Cardinal Platinum','undergrad_resident','weekly_reset',18,null,true, 225,  0,12,null,3760, 0,false,'One swipe per hour at Kent Café; swipes reset weekly'),
 ('premium', 'Cardinal Premium', 'undergrad_resident','weekly_reset',12,null,true, 100,  0, 8,null,3626, 0,true, 'Default plan; one swipe per hour at Kent Café; swipes reset weekly'),
 ('gold',    'Cardinal Gold',    'undergrad_resident','semester_block',null,200,false,500,0, 0, 240,3142,28,false,null),
 ('silver',  'Cardinal Silver',  'undergrad_resident','semester_block',null,150,false,450,0, 0, 200,2755,28,false,null),
 ('bronze',  'Cardinal Bronze',  'undergrad_resident','semester_block',null,100,false,350,0, 0, 130,1936,64,false,null),
 ('grad',    'Cardinal Grad',    'grad',              'semester_block',null, 60,false, 75,0, 0,  66,1025, 0,false,null),
 ('burghy850','Burghy 850',      'off_campus','none',null,null,false,700,150,0,null, 850,0,false,null),
 ('burghy550','Burghy 550',      'off_campus','none',null,null,false,450,100,0,null, 550,0,false,null),
 ('burghy275','Burghy 275',      'off_campus','none',null,null,false,225, 50,0,null, 275,0,false,null);

-- Seed: venues. pos_names are matched from your old statement and are GUESSES - verify them.
insert into venues (name, kind, pos_names) values
 ('Clinton Dining Hall',    'dining_hall', '{"SUNY CLINT POS 4"}'),
 ('Kent Café',              'dining_hall', '{}'),
 ('Cardinal Nest',          'retail',      '{"SUNYNEST POS 1 (WBlue)","SUNYNEST SOK (7, 8, 10)"}'),
 ('Cardinal Market & Café', 'retail',      '{"SUNYCMRKT SCO 1"}'),
 ('Ghost Kitchen',          'retail',      '{}'),
 ('Halal Shack',            'retail',      '{"SUNYHalal POS 11"}'),
 ('Jamal’s Chicken',        'retail',      '{}'),
 ('Einstein Bros. Bagels',  'retail',      '{"SUNYEBB SOK 5"}'),
 ('Chapter One',            'retail',      '{}');

-- Terms: fill in real dates from the academic calendar, e.g.
-- insert into terms (name, season, start_date, end_date) values ('Fall 2026','fall','2026-08-24','2026-12-18');
