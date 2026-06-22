create table if not exists plaid_tokens (
  id uuid primary key default gen_random_uuid(),
  user_session_id uuid not null,
  access_token text not null,
  item_id text not null,
  created_at timestamptz not null default now(),
  unique(user_session_id)
);
