-- Eduvia files: uploaded course assets and short-lived signed-URL access.
-- Apply after 004_outline_management.sql.

create table public.files (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  bucket text not null default 'course-files',
  storage_path text not null,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  checksum_sha256 text not null,
  file_class text not null,
  width integer,
  height integer,
  status text not null default 'processing',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint files_bucket_not_blank check (length(btrim(bucket)) > 0),
  constraint files_storage_path_not_blank check (length(btrim(storage_path)) > 0),
  constraint files_original_name_length check (length(btrim(original_name)) between 1 and 160),
  constraint files_mime_type_length check (length(btrim(mime_type)) between 3 and 160),
  constraint files_size_positive check (size_bytes > 0),
  constraint files_checksum_format check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  constraint files_file_class_check check (file_class in ('image', 'document')),
  constraint files_dimensions_check check (
    (width is null and height is null)
    or (width is not null and height is not null and width > 0 and height > 0)
  ),
  constraint files_status_check check (
    status in ('uploading', 'processing', 'ready', 'failed', 'quarantined')
  ),
  constraint files_topic_course_fkey foreign key (topic_id, course_id)
    references public.course_topics (id, course_id) on delete cascade,
  constraint files_storage_path_key unique (storage_path)
);

create index files_topic_idx
on public.files (topic_id)
where deleted_at is null;

create index files_course_idx
on public.files (course_id)
where deleted_at is null;

create index files_uploader_idx
on public.files (uploaded_by)
where deleted_at is null;

create trigger files_set_updated_at
before update on public.files
for each row
execute function public.set_updated_at();

alter table public.files enable row level security;

create policy "files_select_own"
on public.files
for select
to authenticated
using (public.owns_course(course_id) or public.is_admin());

create policy "files_insert_own"
on public.files
for insert
to authenticated
with check (
  (public.owns_course(course_id) or public.is_admin())
  and uploaded_by = (select auth.uid())
  and storage_path like ('courses/' || course_id::text || '/%')
);

create policy "files_update_own"
on public.files
for update
to authenticated
using (public.owns_course(course_id) or public.is_admin())
with check (
  (public.owns_course(course_id) or public.is_admin())
  and uploaded_by = (select auth.uid())
  and storage_path like ('courses/' || course_id::text || '/%')
);

revoke all on public.files from anon, authenticated;
grant select, insert, update on public.files to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-files',
  'course-files',
  false,
  26214400,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/markdown',
    'text/plain'
  ]
)
on conflict (id) do nothing;

create policy "course_files_objects_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'course-files'
  and exists (
    select 1
    from public.files f
    where f.storage_path = storage.objects.name
      and f.deleted_at is null
      and (public.owns_course(f.course_id) or public.is_admin())
  )
);

notify pgrst, 'reload schema';
