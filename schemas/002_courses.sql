-- Eduvia courses: teacher-owned subjects.
-- Apply after 001_profiles.sql.

create type public.course_term as enum (
  'first_trimester',
  'second_trimester',
  'third_trimester'
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  code text not null,
  term public.course_term not null,
  year_level smallint not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint courses_name_length check (length(btrim(name)) between 3 and 120),
  constraint courses_code_format check (code ~ '^[A-Z0-9][A-Z0-9-]{2,19}$'),
  constraint courses_year_level_range check (year_level between 1 and 4)
);

create unique index courses_instructor_code_term_year_key
on public.courses (instructor_id, code, term, year_level)
where deleted_at is null;

create index courses_instructor_created_idx
on public.courses (instructor_id, created_at desc)
where deleted_at is null;

create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

create function public.is_instructor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'instructor'
      and deleted_at is null
  );
$$;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and deleted_at is null
  );
$$;

revoke all on function public.is_instructor() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.is_instructor() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.courses enable row level security;

create policy "courses_select_own"
on public.courses
for select
to authenticated
using (instructor_id = (select auth.uid()) or public.is_admin());

create policy "courses_insert_own"
on public.courses
for insert
to authenticated
with check (
  instructor_id = (select auth.uid())
  and public.is_instructor()
);

create policy "courses_update_own"
on public.courses
for update
to authenticated
using (instructor_id = (select auth.uid()) or public.is_admin())
with check (instructor_id = (select auth.uid()) or public.is_admin());

revoke all on public.courses from anon, authenticated;
grant select, insert, update on public.courses to authenticated;

notify pgrst, 'reload schema';
