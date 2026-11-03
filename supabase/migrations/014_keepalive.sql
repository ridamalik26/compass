-- A trivial, read-only RPC for the keepalive workflow (.github/workflows/keepalive.yml) to call
-- with the anon key, so the free Supabase project sees periodic activity and does not pause.
-- Touches no table and returns nothing of value if misused.
create or replace function public.keepalive() returns void
language sql as $$
  select 1;
$$;

revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
