-- Eduvia topic content: slides, docs, and uploaded presentations.
-- Apply after 006_audit_logs.sql.

create table public.topic_content_items (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null,
  kind text not null,
  title text not null,
  content jsonb not null default '{}'::jsonb,
  file_id uuid,
  summary text,
  order_index integer not null default 0,
  slide_count integer generated always as (
    case
      when kind = 'slides' and jsonb_typeof(content -> 'slides') = 'array'
        then jsonb_array_length(content -> 'slides')
      else null
    end
  ) stored,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_content_items_kind_check
    check (kind in ('slides', 'doc', 'presentation')),
  constraint topic_content_items_title_length
    check (length(btrim(title)) between 2 and 160),
  constraint topic_content_items_summary_length
    check (summary is null or length(btrim(summary)) between 20 and 1000),
  constraint topic_content_items_order_non_negative
    check (order_index >= 0),
  constraint topic_content_items_file_unique unique (file_id),
  constraint topic_content_items_topic_course_fkey
    foreign key (topic_id, course_id)
    references public.course_topics (id, course_id) on delete cascade,
  constraint topic_content_items_file_fkey
    foreign key (file_id) references public.files (id) on delete restrict,
  constraint topic_content_items_shape_check check (
    (
      kind = 'presentation'
      and file_id is not null
      and summary is not null
      and content = '{}'::jsonb
    )
    or (
      kind in ('slides', 'doc')
      and file_id is null
      and summary is null
      and jsonb_typeof(content) = 'object'
    )
  )
);

create index topic_content_items_topic_kind_order_idx
on public.topic_content_items (topic_id, kind, order_index)
where deleted_at is null;

create index topic_content_items_course_idx
on public.topic_content_items (course_id)
where deleted_at is null;

create trigger topic_content_items_set_updated_at
before update on public.topic_content_items
for each row
execute function public.set_updated_at();

alter table public.files
add column if not exists content_id uuid references public.topic_content_items (id) on delete cascade;

create index if not exists files_content_idx
on public.files (content_id)
where deleted_at is null;

alter table public.topic_content_items enable row level security;

create policy "topic_content_items_select_own"
on public.topic_content_items
for select
to authenticated
using (public.owns_course(course_id) or public.is_admin());

create policy "topic_content_items_insert_own"
on public.topic_content_items
for insert
to authenticated
with check (
  (public.owns_course(course_id) or public.is_admin())
  and (
    file_id is null
    or exists (
      select 1
      from public.files f
      where f.id = topic_content_items.file_id
        and f.course_id = topic_content_items.course_id
        and f.topic_id = topic_content_items.topic_id
        and f.deleted_at is null
    )
  )
);

create policy "topic_content_items_update_own"
on public.topic_content_items
for update
to authenticated
using (public.owns_course(course_id) or public.is_admin())
with check (
  (public.owns_course(course_id) or public.is_admin())
  and (
    file_id is null
    or exists (
      select 1
      from public.files f
      where f.id = topic_content_items.file_id
        and f.course_id = topic_content_items.course_id
        and f.topic_id = topic_content_items.topic_id
        and f.deleted_at is null
    )
  )
);

revoke all on public.topic_content_items from anon, authenticated;
grant select, insert, update on public.topic_content_items to authenticated;

create or replace function public.create_topic_presentation(
  target_course_id uuid,
  target_topic_id uuid,
  target_uploaded_by uuid,
  target_bucket text,
  target_storage_path text,
  target_original_name text,
  target_mime_type text,
  target_size_bytes bigint,
  target_checksum_sha256 text,
  target_title text,
  target_summary text,
  target_order_index integer
)
returns jsonb
language plpgsql
as $$
declare
  new_file_id uuid;
  new_content_id uuid;
begin
  insert into public.files (
    course_id,
    topic_id,
    uploaded_by,
    bucket,
    storage_path,
    original_name,
    mime_type,
    size_bytes,
    checksum_sha256,
    file_class,
    status
  )
  values (
    target_course_id,
    target_topic_id,
    target_uploaded_by,
    target_bucket,
    target_storage_path,
    target_original_name,
    target_mime_type,
    target_size_bytes,
    target_checksum_sha256,
    'document',
    'ready'
  )
  returning id into new_file_id;

  insert into public.topic_content_items (
    course_id,
    topic_id,
    kind,
    title,
    content,
    file_id,
    summary,
    order_index
  )
  values (
    target_course_id,
    target_topic_id,
    'presentation',
    target_title,
    '{}'::jsonb,
    new_file_id,
    target_summary,
    target_order_index
  )
  returning id into new_content_id;

  return jsonb_build_object(
    'contentId', new_content_id,
    'fileId', new_file_id
  );
end;
$$;

create or replace function public.update_topic_content(
  target_content_id uuid,
  new_title text,
  new_content jsonb,
  referenced_file_ids uuid[]
)
returns void
language plpgsql
as $$
declare
  effective_file_ids uuid[] := coalesce(referenced_file_ids, '{}'::uuid[]);
begin
  update public.topic_content_items
  set title = new_title,
      content = new_content
  where id = target_content_id
    and deleted_at is null
    and kind in ('slides', 'doc');

  if not found then
    raise exception 'CONTENT_NOT_FOUND';
  end if;

  update public.files
  set deleted_at = null
  where content_id = target_content_id
    and deleted_at is not null
    and id = any(effective_file_ids);

  update public.files
  set deleted_at = now()
  where content_id = target_content_id
    and deleted_at is null
    and not (id = any(effective_file_ids));
end;
$$;

create or replace function public.soft_delete_topic_content(
  target_content_id uuid,
  target_actor_id uuid
)
returns void
language plpgsql
as $$
declare
  item public.topic_content_items;
  embedded_file_count integer;
begin
  select *
  into item
  from public.topic_content_items
  where id = target_content_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'CONTENT_NOT_FOUND';
  end if;

  select count(*)::integer
  into embedded_file_count
  from public.files
  where content_id = target_content_id
    and deleted_at is null;

  update public.topic_content_items
  set deleted_at = now()
  where id = target_content_id;

  update public.files
  set deleted_at = now()
  where deleted_at is null
    and (id = item.file_id or content_id = target_content_id);

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    course_id,
    metadata
  )
  values (
    target_actor_id,
    'content.deleted',
    'topic_content_item',
    target_content_id,
    item.course_id,
    jsonb_build_object(
      'kind', item.kind,
      'title', item.title,
      'fileId', item.file_id,
      'embeddedFileCount', embedded_file_count
    )
  );
end;
$$;

revoke all on function public.create_topic_presentation(
  uuid, uuid, uuid, text, text, text, text, bigint, text, text, text, integer
) from public;
revoke all on function public.update_topic_content(uuid, text, jsonb, uuid[]) from public;
revoke all on function public.soft_delete_topic_content(uuid, uuid) from public;

grant execute on function public.create_topic_presentation(
  uuid, uuid, uuid, text, text, text, text, bigint, text, text, text, integer
) to service_role;
grant execute on function public.update_topic_content(uuid, text, jsonb, uuid[]) to service_role;
grant execute on function public.soft_delete_topic_content(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
