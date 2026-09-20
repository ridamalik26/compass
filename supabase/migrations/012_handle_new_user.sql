-- Create the public.users profile row whenever an auth user is created (email sign up, Google, etc).
-- Name comes from raw_user_meta_data ("name" for email sign up, "full_name" for Google),
-- falling back to the part of the email before the @.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, full_name, email)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(new.email, '@', 1), '')
    ),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: the login page no longer creates profile rows, so cover existing accounts that lack one.
insert into public.users (id, full_name, email)
select
  u.id,
  coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
    nullif(split_part(u.email, '@', 1), '')
  ),
  u.email
from auth.users u
on conflict (id) do nothing;
