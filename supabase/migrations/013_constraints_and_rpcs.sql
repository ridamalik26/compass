-- Data-quality constraints and two RPCs that bundle multi-table writes into one transaction.
--
-- Constraints are added NOT VALID so adding them does not scan or lock existing rows, then
-- validated in a separate statement. If VALIDATE CONSTRAINT fails here, some existing row
-- violates it (a negative amount, or a title over 80 characters) and must be fixed before this
-- migration can complete; the earlier add/validate pairs will already be in effect either way.
begin;

alter table goals
  add constraint goals_6month_amount_nonneg check (goal_6month_amount >= 0) not valid,
  add constraint goals_1year_amount_nonneg  check (goal_1year_amount  >= 0) not valid,
  add constraint goals_5year_amount_nonneg  check (goal_5year_amount  >= 0) not valid,
  add constraint goals_6month_title_len check (char_length(goal_6month_title) <= 80) not valid,
  add constraint goals_1year_title_len  check (char_length(goal_1year_title)  <= 80) not valid,
  add constraint goals_5year_title_len  check (char_length(goal_5year_title)  <= 80) not valid;

alter table goal_progress
  add constraint goal_progress_current_amount_nonneg check (current_amount >= 0) not valid;

commit;

begin;

alter table goals validate constraint goals_6month_amount_nonneg;
alter table goals validate constraint goals_1year_amount_nonneg;
alter table goals validate constraint goals_5year_amount_nonneg;
alter table goals validate constraint goals_6month_title_len;
alter table goals validate constraint goals_1year_title_len;
alter table goals validate constraint goals_5year_title_len;
alter table goal_progress validate constraint goal_progress_current_amount_nonneg;

commit;

-- save_progress: one balance upsert plus one history insert, atomic. Runs as the caller (not
-- security definer), so the existing RLS policies on goal_progress and goal_progress_history
-- still decide what it may write; it only ever writes the calling user's own rows.
create or replace function public.save_progress(goal_type text, amount_cents bigint) returns void
language plpgsql set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_amount numeric(12, 2);
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;
  if goal_type not in ('6month', '1year', '5year') then
    raise exception 'Invalid goal_type: %', goal_type;
  end if;
  if amount_cents < 0 then
    raise exception 'amount_cents must not be negative';
  end if;

  v_amount := amount_cents / 100.0;

  insert into goal_progress (user_session_id, goal_type, current_amount, updated_at)
  values (v_user, goal_type, v_amount, now())
  on conflict (user_session_id, goal_type)
    do update set current_amount = excluded.current_amount, updated_at = excluded.updated_at;

  insert into goal_progress_history (user_session_id, goal_type, current_amount)
  values (v_user, goal_type, v_amount);
end $$;

revoke execute on function public.save_progress(text, bigint) from public, anon;
grant execute on function public.save_progress(text, bigint) to authenticated;

-- reset_goals: deletes the calling user's history, progress and goals rows in one transaction,
-- so a failure partway through cannot leave orphaned rows.
create or replace function public.reset_goals() returns void
language plpgsql set search_path = public as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  delete from goal_progress_history where user_session_id = v_user;
  delete from goal_progress where user_session_id = v_user;
  delete from goals where user_session_id = v_user;
end $$;

revoke execute on function public.reset_goals() from public, anon;
grant execute on function public.reset_goals() to authenticated;
