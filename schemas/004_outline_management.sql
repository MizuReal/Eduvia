-- Eduvia outline management: CRUD, reorder, move, and restore.
-- Apply after 003_outline.sql.

alter table public.lessons
add column if not exists deleted_batch_id uuid;

create index if not exists lessons_deleted_batch_idx
on public.lessons (deleted_batch_id)
where deleted_at is not null;

create or replace function public.soft_delete_topic_lessons()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    update public.lessons
    set deleted_at = now(), deleted_batch_id = new.id
    where topic_id = new.id and deleted_at is null;
  end if;

  return new;
end;
$$;

create trigger course_topics_soft_delete_lessons
after update of deleted_at on public.course_topics
for each row
execute function public.soft_delete_topic_lessons();

create or replace function public.reorder_course_topics(
  target_course_id uuid,
  ordered_ids uuid[]
)
returns void
language sql
as $$
  update public.course_topics t
  set order_index = (v.ord - 1)::integer
  from unnest(ordered_ids) with ordinality as v(id, ord)
  where t.id = v.id
    and t.course_id = target_course_id
    and t.deleted_at is null;
$$;

create or replace function public.reorder_topic_lessons(
  target_topic_id uuid,
  ordered_ids uuid[]
)
returns void
language sql
as $$
  update public.lessons l
  set order_index = (v.ord - 1)::integer
  from unnest(ordered_ids) with ordinality as v(id, ord)
  where l.id = v.id
    and l.topic_id = target_topic_id
    and l.deleted_at is null;
$$;

create or replace function public.update_lesson(
  target_lesson_id uuid,
  new_title text,
  new_topic_id uuid
)
returns void
language plpgsql
as $$
declare
  current_lesson public.lessons;
  next_order integer;
begin
  select * into current_lesson
  from public.lessons
  where id = target_lesson_id and deleted_at is null
  for update;

  if not found then
    raise exception 'LESSON_NOT_FOUND';
  end if;

  if new_topic_id is not null and new_topic_id <> current_lesson.topic_id then
    if not exists (
      select 1
      from public.course_topics
      where id = new_topic_id
        and course_id = current_lesson.course_id
        and deleted_at is null
    ) then
      raise exception 'TOPIC_NOT_FOUND';
    end if;

    select coalesce(max(order_index) + 1, 0)
    into next_order
    from public.lessons
    where topic_id = new_topic_id and deleted_at is null;

    update public.lessons
    set topic_id = new_topic_id, order_index = next_order
    where id = target_lesson_id;
  end if;

  if new_title is not null then
    update public.lessons
    set title = new_title
    where id = target_lesson_id;
  end if;
end;
$$;

create or replace function public.restore_topic(target_topic_id uuid)
returns void
language plpgsql
as $$
declare
  current_topic public.course_topics;
  next_order integer;
begin
  select * into current_topic
  from public.course_topics
  where id = target_topic_id and deleted_at is not null
  for update;

  if not found then
    raise exception 'TOPIC_NOT_FOUND';
  end if;

  select coalesce(max(order_index) + 1, 0)
  into next_order
  from public.course_topics
  where course_id = current_topic.course_id and deleted_at is null;

  update public.course_topics
  set deleted_at = null, order_index = next_order
  where id = target_topic_id;

  update public.lessons
  set deleted_at = null, deleted_batch_id = null
  where topic_id = target_topic_id
    and deleted_at is not null
    and deleted_batch_id = target_topic_id;
end;
$$;

create or replace function public.restore_lesson(target_lesson_id uuid)
returns void
language plpgsql
as $$
declare
  current_lesson public.lessons;
  next_order integer;
begin
  select * into current_lesson
  from public.lessons
  where id = target_lesson_id and deleted_at is not null
  for update;

  if not found then
    raise exception 'LESSON_NOT_FOUND';
  end if;

  if not exists (
    select 1
    from public.course_topics
    where id = current_lesson.topic_id and deleted_at is null
  ) then
    raise exception 'TOPIC_DELETED';
  end if;

  select coalesce(max(order_index) + 1, 0)
  into next_order
  from public.lessons
  where topic_id = current_lesson.topic_id and deleted_at is null;

  update public.lessons
  set deleted_at = null, deleted_batch_id = null, order_index = next_order
  where id = target_lesson_id;
end;
$$;

revoke all on function public.reorder_course_topics(uuid, uuid[]) from public;
revoke all on function public.reorder_topic_lessons(uuid, uuid[]) from public;
revoke all on function public.update_lesson(uuid, text, uuid) from public;
revoke all on function public.restore_topic(uuid) from public;
revoke all on function public.restore_lesson(uuid) from public;

grant execute on function public.reorder_course_topics(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_topic_lessons(uuid, uuid[]) to authenticated;
grant execute on function public.update_lesson(uuid, text, uuid) to authenticated;
grant execute on function public.restore_topic(uuid) to authenticated;
grant execute on function public.restore_lesson(uuid) to authenticated;

grant execute on function public.reorder_course_topics(uuid, uuid[]) to service_role;
grant execute on function public.reorder_topic_lessons(uuid, uuid[]) to service_role;
grant execute on function public.update_lesson(uuid, text, uuid) to service_role;
grant execute on function public.restore_topic(uuid) to service_role;
grant execute on function public.restore_lesson(uuid) to service_role;

notify pgrst, 'reload schema';
