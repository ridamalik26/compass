-- One cached advice row per user. Regenerated only when goals, balances or statuses change.
create table if not exists advice_cache (
  user_id uuid primary key references auth.users(id) on delete cascade,
  input_hash text not null,
  advice text not null,
  source text not null check (source in ('ai', 'rules')),
  created_at timestamptz not null default now()
);

alter table advice_cache enable row level security;

create policy ac_select on advice_cache for select to authenticated
  using (user_id = (select auth.uid()));
create policy ac_insert on advice_cache for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy ac_update on advice_cache for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
