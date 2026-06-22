create table if not exists goal_progress (
  id uuid primary key default gen_random_uuid(),
  user_session_id uuid not null,
  goal_type text not null check (goal_type in ('6month', '1year', '5year')),
  current_amount numeric(12, 2) not null default 0,
  updated_at timestamptz not null default now(),
  unique(user_session_id, goal_type)
);
