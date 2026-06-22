create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_session_id uuid not null,
  goal_6month_title text not null,
  goal_6month_amount numeric(12, 2) not null,
  goal_6month_description text,
  goal_1year_title text not null,
  goal_1year_amount numeric(12, 2) not null,
  goal_1year_description text,
  goal_5year_title text not null,
  goal_5year_amount numeric(12, 2) not null,
  goal_5year_description text,
  created_at timestamptz not null default now()
);
