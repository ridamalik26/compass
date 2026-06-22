create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

alter table users enable row level security;

create policy "Users can view own data"
  on users for select
  using (auth.uid() = id);

create policy "Users can insert own data"
  on users for insert
  with check (auth.uid() = id);

create policy "Users can update own data"
  on users for update
  using (auth.uid() = id);
