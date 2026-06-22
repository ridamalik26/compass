create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  user_session_id uuid not null,
  transaction_id text not null unique,
  amount numeric(12, 2) not null,
  date date not null,
  description text,
  category text,
  created_at timestamptz not null default now()
);
