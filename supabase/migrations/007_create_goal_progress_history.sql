create table if not exists goal_progress_history (
  id uuid primary key default gen_random_uuid(),
  user_session_id uuid not null,
  goal_type text not null check (goal_type in ('6month', '1year', '5year')),
  current_amount numeric(12, 2) not null,
  recorded_at timestamptz not null default now()
);

create index if not exists goal_progress_history_user_recorded
  on goal_progress_history (user_session_id, recorded_at desc);
