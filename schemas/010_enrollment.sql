-- Eduvia enrollment: students join subjects by invite link. Teachers choose
-- approval or auto-accept, can close enrollment, and can remove students.
-- Apply after 009_quizzes.sql.

alter table public.courses
add column enrollment_open boolean not null default false;

alter table public.courses
add column enrollment_mode text not null default 'approval';

alter table public.courses
add constraint courses_enrollment_mode_check
check (enrollment_mode in ('approval', 'auto'));

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending',
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  removed_by uuid references public.profiles (id) on delete set null,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enrollments_status_check
    check (status in ('pending', 'active', 'rejected', 'removed')),
  constraint enrollments_course_student_key unique (course_id, student_id)
);

create index enrollments_course_status_idx
on public.enrollments (course_id, status);

create index enrollments_student_status_idx
on public.enrollments (student_id, status);

create trigger enrollments_set_updated_at
before update on public.enrollments
for each row
execute function public.set_updated_at();

create function public.is_student()
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
      and role = 'student'
      and deleted_at is null
  );
$$;

revoke all on function public.is_student() from public;
grant execute on function public.is_student() to authenticated;

alter table public.enrollments enable row level security;

create policy "enrollments_select_own"
on public.enrollments
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.owns_course(course_id)
  or public.is_admin()
);

revoke all on public.enrollments from anon, authenticated;
grant select on public.enrollments to authenticated;

create policy "courses_select_open"
on public.courses
for select
to authenticated
using (
  deleted_at is null
  and enrollment_open
  and public.is_student()
);

create policy "courses_select_enrolled"
on public.courses
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.enrollments e
    where e.course_id = courses.id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  )
);

create policy "course_topics_select_enrolled"
on public.course_topics
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.course_id = course_topics.course_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and c.deleted_at is null
  )
);

create policy "lessons_select_enrolled"
on public.lessons
for select
to authenticated
using (
  deleted_at is null
  and exists (
    select 1
    from public.enrollments e
    join public.courses c on c.id = e.course_id
    where e.course_id = lessons.course_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
      and c.deleted_at is null
  )
);

create or replace function public.request_enrollment(
  target_course_id uuid,
  target_student_id uuid
)
returns public.enrollments
language plpgsql
as $$
declare
  target_course public.courses;
  existing_enrollment public.enrollments;
  next_status text;
  result public.enrollments;
begin
  if not exists (
    select 1
    from public.profiles
    where id = target_student_id
      and role = 'student'
      and deleted_at is null
  ) then
    raise exception 'STUDENT_NOT_FOUND';
  end if;

  select *
  into target_course
  from public.courses
  where id = target_course_id
    and deleted_at is null
  for update;

  if target_course.id is null then
    raise exception 'COURSE_NOT_FOUND';
  end if;

  if not target_course.enrollment_open then
    raise exception 'ENROLLMENT_CLOSED';
  end if;

  next_status := case
    when target_course.enrollment_mode = 'auto' then 'active'
    else 'pending'
  end;

  select *
  into existing_enrollment
  from public.enrollments
  where course_id = target_course_id
    and student_id = target_student_id
  for update;

  if existing_enrollment.id is null then
    begin
      insert into public.enrollments (
        course_id,
        student_id,
        status,
        decided_at
      )
      values (
        target_course_id,
        target_student_id,
        next_status,
        case when next_status = 'active' then now() else null end
      )
      returning * into result;
    exception when unique_violation then
      select *
      into result
      from public.enrollments
      where course_id = target_course_id
        and student_id = target_student_id;
    end;

    return result;
  end if;

  if existing_enrollment.status in ('pending', 'active') then
    return existing_enrollment;
  end if;

  update public.enrollments
  set status = next_status,
      decided_by = null,
      decided_at = case when next_status = 'active' then now() else null end,
      removed_by = null,
      removed_at = null
  where id = existing_enrollment.id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.request_enrollment(uuid, uuid) from public;
grant execute on function public.request_enrollment(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
