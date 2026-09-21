begin;

-- goals: full CRUD on own row
alter table goals enable row level security;
create policy goals_select on goals for select to authenticated using (user_session_id = (select auth.uid()));
create policy goals_insert on goals for insert to authenticated with check (user_session_id = (select auth.uid()));
create policy goals_update on goals for update to authenticated
  using (user_session_id = (select auth.uid())) with check (user_session_id = (select auth.uid()));
create policy goals_delete on goals for delete to authenticated using (user_session_id = (select auth.uid()));

-- goal_progress: same (upsert needs select+insert+update)
alter table goal_progress enable row level security;
create policy gp_select on goal_progress for select to authenticated using (user_session_id = (select auth.uid()));
create policy gp_insert on goal_progress for insert to authenticated with check (user_session_id = (select auth.uid()));
create policy gp_update on goal_progress for update to authenticated
  using (user_session_id = (select auth.uid())) with check (user_session_id = (select auth.uid()));
create policy gp_delete on goal_progress for delete to authenticated using (user_session_id = (select auth.uid()));

-- history: append-only, plus delete for the reset button
alter table goal_progress_history enable row level security;
create policy gph_select on goal_progress_history for select to authenticated using (user_session_id = (select auth.uid()));
create policy gph_insert on goal_progress_history for insert to authenticated with check (user_session_id = (select auth.uid()));
create policy gph_delete on goal_progress_history for delete to authenticated using (user_session_id = (select auth.uid()));

-- transactions: written by the sync route under the user's JWT
alter table transactions enable row level security;
create policy tx_select on transactions for select to authenticated using (user_session_id = (select auth.uid()));
create policy tx_insert on transactions for insert to authenticated with check (user_session_id = (select auth.uid()));
create policy tx_update on transactions for update to authenticated
  using (user_session_id = (select auth.uid())) with check (user_session_id = (select auth.uid()));

-- plaid_tokens: RLS on, NO policies = only the service role can touch it
alter table plaid_tokens enable row level security;
revoke all on plaid_tokens from anon, authenticated;

commit;

-- rollback per table: alter table <t> disable row level security;
