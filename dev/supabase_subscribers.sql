-- 20 Wells Games website — "nudge me" launch-notification list
-- Run once in the Supabase SQL editor (Dashboard → SQL → New query → Run).
-- Security model: the anon key is public. Nobody can read, update or delete
-- this table with it, and nobody can even INSERT directly: the only way in is
-- the subscribe() function below, which validates the address, ignores
-- duplicates (so it never reveals whether an email is already on the list),
-- and refuses more than 30 sign-ups per 10 minutes site-wide so a script
-- cannot fill the database that also holds the Ringer leaderboard.

create extension if not exists citext;

create table if not exists public.subscribers (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  email       citext not null unique,
  source      text not null default 'site',
  constraint subscribers_email_format check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) between 6 and 254),
  constraint subscribers_source_len   check (length(source) <= 32)
);
create index if not exists subscribers_created_at_idx on public.subscribers (created_at desc);

alter table public.subscribers enable row level security;
revoke all on public.subscribers from anon, authenticated;

create or replace function public.subscribe(p_email text, p_source text default 'site')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email  citext := lower(trim(p_email));
  v_recent int;
begin
  if v_email is null or length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  select count(*) into v_recent from public.subscribers where created_at > now() - interval '10 minutes';
  if v_recent >= 30 then
    raise exception 'rate limited' using errcode = 'P0001';
  end if;
  insert into public.subscribers (email, source)
  values (v_email, left(coalesce(p_source, 'site'), 32))
  on conflict (email) do nothing;
end
$$;

revoke all on function public.subscribe(text, text) from public;
grant execute on function public.subscribe(text, text) to anon;

-- Read the list from the dashboard (service role bypasses RLS):
--   select email, created_at from public.subscribers order by created_at desc;
