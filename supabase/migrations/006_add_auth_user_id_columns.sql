alter table goals
  add column if not exists auth_user_id uuid references auth.users(id);

alter table goal_progress
  add column if not exists auth_user_id uuid references auth.users(id);
