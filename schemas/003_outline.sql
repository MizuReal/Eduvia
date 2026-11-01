-- Eduvia course outline: ordered topics and lessons.
-- Apply after 002_courses.sql.

create table public.course_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  order_index integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint course_topics_title_length check (length(btrim(title)) between 2 and 120),
  constraint course_topics_order_index_non_negative check (order_index >= 0),
  constraint course_topics_id_course_key unique (id, course_id)
);

create index course_topics_course_order_idx
on public.course_topics (course_id, order_index)
where deleted_at is null;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null,
  title text not null,
  order_index integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_title_length check (length(btrim(title)) between 2 and 160),
  constraint lessons_order_index_non_negative check (order_index >= 0),
  constraint lessons_topic_course_fkey foreign key (topic_id, course_id)
    references public.course_topics (id, course_id) on delete cascade
);

create index lessons_topic_order_idx
on public.lessons (topic_id, order_index)
where deleted_at is null;

create index lessons_course_idx
on public.lessons (course_id)
where deleted_at is null;

create trigger course_topics_set_updated_at
before update on public.course_topics
for each row
execute function public.set_updated_at();

create trigger lessons_set_updated_at
before update on public.lessons
for each row
execute function public.set_updated_at();

create function public.owns_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.courses
    where id = target_course_id
      and instructor_id = (select auth.uid())
      and deleted_at is null
  );
$$;

revoke all on function public.owns_course(uuid) from public;
grant execute on function public.owns_course(uuid) to authenticated;

alter table public.course_topics enable row level security;
alter table public.lessons enable row level security;

create policy "course_topics_select_own"
on public.course_topics
for select
to authenticated
using (public.owns_course(course_id) or public.is_admin());

create policy "course_topics_insert_own"
on public.course_topics
for insert
to authenticated
with check (public.owns_course(course_id) or public.is_admin());

create policy "course_topics_update_own"
on public.course_topics
for update
to authenticated
using (public.owns_course(course_id) or public.is_admin())
with check (public.owns_course(course_id) or public.is_admin());

create policy "lessons_select_own"
on public.lessons
for select
to authenticated
using (public.owns_course(course_id) or public.is_admin());

create policy "lessons_insert_own"
on public.lessons
for insert
to authenticated
with check (public.owns_course(course_id) or public.is_admin());

create policy "lessons_update_own"
on public.lessons
for update
to authenticated
using (public.owns_course(course_id) or public.is_admin())
with check (public.owns_course(course_id) or public.is_admin());

revoke all on public.course_topics from anon, authenticated;
revoke all on public.lessons from anon, authenticated;
grant select, insert, update on public.course_topics to authenticated;
grant select, insert, update on public.lessons to authenticated;

notify pgrst, 'reload schema';
