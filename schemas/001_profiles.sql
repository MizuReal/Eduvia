-- Eduvia profiles: app-owned user data keyed by Supabase Auth user id.

create type public.user_role as enum ('student', 'instructor', 'admin');
create type public.faculty as enum ('BSIT', 'BSEE', 'BSME');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  faculty public.faculty not null,
  role public.user_role not null default 'student',
  tos_version text not null,
  tos_accepted_at timestamptz not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_key unique (username),
  constraint profiles_username_lowercase check (username = lower(username)),
  constraint profiles_username_format check (username ~ '^[a-z][a-z0-9_]{2,19}$'),
  constraint profiles_tos_version_not_blank check (length(btrim(tos_version)) > 0)
);

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

-- Profile writes are backend-only: the API uses the service role to create
-- students, and no client policy can insert or promote itself.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

-- Ensure PostgREST sees the new table immediately after the migration.
notify pgrst, 'reload schema';
