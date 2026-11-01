-- Eduvia singleton topic content: one slides document, one doc, and one uploaded
-- presentation per topic. Apply after 007_topic_content.sql.

-- Temp tables are not reliable through Supabase's connection pooler: each
-- statement can land on a different session. Keep the cleanup in one DO block.
drop table if exists eduvia_duplicate_topic_content;

do $$
declare
  duplicate record;
begin
  for duplicate in
    select id, file_id, course_id
    from (
      select
        id,
        file_id,
        course_id,
        row_number() over (
          partition by topic_id, kind
          order by created_at asc, id asc
        ) as position
      from public.topic_content_items
      where deleted_at is null
    ) ranked
    where position > 1
  loop
    update public.topic_content_items
    set deleted_at = now()
    where id = duplicate.id;

    update public.files
    set deleted_at = now()
    where deleted_at is null
      and (
        id = duplicate.file_id
        or content_id = duplicate.id
      );

    insert into public.audit_logs (
      actor_id,
      action,
      entity_type,
      entity_id,
      course_id,
      metadata
    )
    values (
      null,
      'content.deduped',
      'topic_content_item',
      duplicate.id,
      duplicate.course_id,
      jsonb_build_object('reason', 'singleton_migration')
    );
  end loop;
end;
$$;

create unique index if not exists topic_content_items_topic_kind_active_key
on public.topic_content_items (topic_id, kind)
where deleted_at is null;

drop function if exists public.create_topic_presentation(
  uuid, uuid, uuid, text, text, text, text, bigint, text, text, text, integer
);

create or replace function public.upsert_topic_presentation(
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
  target_actor_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  existing_content public.topic_content_items;
  new_file_id uuid;
  new_content_id uuid;
begin
  select *
  into existing_content
  from public.topic_content_items
  where topic_id = target_topic_id
    and kind = 'presentation'
    and deleted_at is null
  for update;

  if existing_content.id is not null
    and existing_content.course_id <> target_course_id then
    raise exception 'PRESENTATION_TOPIC_MISMATCH';
  end if;

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

  if existing_content.id is not null then
    update public.topic_content_items
    set file_id = new_file_id,
        title = target_title,
        summary = target_summary
    where id = existing_content.id;

    update public.files
    set deleted_at = now()
    where id = existing_content.file_id
      and deleted_at is null;

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
      'content.presentation_replaced',
      'topic_content_item',
      existing_content.id,
      target_course_id,
      jsonb_build_object(
        'oldFileId', existing_content.file_id,
        'newFileId', new_file_id,
        'title', target_title
      )
    );

    return jsonb_build_object(
      'contentId', existing_content.id,
      'fileId', new_file_id
    );
  end if;

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
    0
  )
  returning id into new_content_id;

  return jsonb_build_object(
    'contentId', new_content_id,
    'fileId', new_file_id
  );
end;
$$;

revoke all on function public.upsert_topic_presentation(
  uuid, uuid, uuid, text, text, text, text, bigint, text, text, text, uuid
) from public;

grant execute on function public.upsert_topic_presentation(
  uuid, uuid, uuid, text, text, text, text, bigint, text, text, text, uuid
) to service_role;

notify pgrst, 'reload schema';
