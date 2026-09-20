-- Daily AI usage counters: one row per user per UTC day, plus one sentinel row for the global cap.
create table if not exists ai_usage (
  user_id uuid not null,
  day date not null default (now() at time zone 'utc')::date,
  count int not null default 0,
  primary key (user_id, day)
);

-- RLS on with NO policies: clients cannot read or write it directly. Only the function below can.
alter table ai_usage enable row level security;
revoke all on ai_usage from anon, authenticated;

-- Returns true and counts one use if both the per-user limit (5/day) and the global cap (150/day)
-- allow it; returns false otherwise. The limits are fixed here so callers cannot raise them.
create or replace function consume_ai_quota() returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_day date := (now() at time zone 'utc')::date;
  v_user_limit constant int := 5;
  v_global_limit constant int := 150;
  v_global_id constant uuid := '00000000-0000-0000-0000-000000000000';
  c int;
begin
  if v_user is null then
    return false;
  end if;

  -- global daily cap
  insert into ai_usage (user_id, day, count) values (v_global_id, v_day, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
    where ai_usage.count < v_global_limit
  returning count into c;
  if c is null then
    return false;
  end if;

  -- per-user daily limit
  c := null;
  insert into ai_usage (user_id, day, count) values (v_user, v_day, 1)
  on conflict (user_id, day) do update set count = ai_usage.count + 1
    where ai_usage.count < v_user_limit
  returning count into c;
  if c is null then
    -- user is over their limit: give back the global slot
    update ai_usage set count = ai_usage.count - 1 where user_id = v_global_id and day = v_day;
    return false;
  end if;

  return true;
end $$;

revoke execute on function consume_ai_quota() from public, anon;
grant execute on function consume_ai_quota() to authenticated;
