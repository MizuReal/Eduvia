-- Eduvia quizzes: one multiple-choice quiz per topic, with native questions or
-- an uploaded paper plus an A-D answer key. Apply after 008_singleton_topic_content.sql.

alter table public.files
add column if not exists preview_html text;

alter table public.files
drop constraint if exists files_preview_html_size;

alter table public.files
add constraint files_preview_html_size
check (preview_html is null or length(preview_html) <= 2097152);

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null,
  mode text not null,
  title text not null,
  instructions text not null default '',
  passing_score integer not null default 75,
  status text not null default 'draft',
  version integer not null default 1,
  file_id uuid,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quizzes_mode_check check (mode in ('native', 'document')),
  constraint quizzes_status_check check (status in ('draft', 'published')),
  constraint quizzes_title_length check (length(btrim(title)) between 2 and 160),
  constraint quizzes_instructions_length check (length(instructions) <= 5000),
  constraint quizzes_passing_score_check check (passing_score between 0 and 100),
  constraint quizzes_version_positive check (version >= 1),
  constraint quizzes_topic_course_fkey foreign key (topic_id, course_id)
    references public.course_topics (id, course_id) on delete cascade,
  constraint quizzes_file_fkey foreign key (file_id)
    references public.files (id) on delete restrict,
  constraint quizzes_file_unique unique (file_id),
  constraint quizzes_file_mode_check check (
    (mode = 'native' and file_id is null)
    or mode = 'document'
  )
);

create unique index quizzes_topic_active_key
on public.quizzes (topic_id)
where deleted_at is null;

create index quizzes_course_idx
on public.quizzes (course_id)
where deleted_at is null;

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  order_index integer not null default 0,
  prompt text,
  option_a text,
  option_b text,
  option_c text,
  option_d text,
  correct_option text not null,
  explanation text,
  points integer not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_questions_order_non_negative check (order_index >= 0),
  constraint quiz_questions_correct_option_check
    check (correct_option in ('A', 'B', 'C', 'D')),
  constraint quiz_questions_points_check check (points between 1 and 100),
  constraint quiz_questions_prompt_length check (
    prompt is null or length(btrim(prompt)) between 2 and 2000
  ),
  constraint quiz_questions_option_a_length check (
    option_a is null or length(btrim(option_a)) between 1 and 500
  ),
  constraint quiz_questions_option_b_length check (
    option_b is null or length(btrim(option_b)) between 1 and 500
  ),
  constraint quiz_questions_option_c_length check (
    option_c is null or length(btrim(option_c)) between 1 and 500
  ),
  constraint quiz_questions_option_d_length check (
    option_d is null or length(btrim(option_d)) between 1 and 500
  ),
  constraint quiz_questions_explanation_length check (
    explanation is null or length(explanation) <= 2000
  )
);

create unique index quiz_questions_quiz_order_key
on public.quiz_questions (quiz_id, order_index)
where deleted_at is null;

create trigger quizzes_set_updated_at
before update on public.quizzes
for each row
execute function public.set_updated_at();

create trigger quiz_questions_set_updated_at
before update on public.quiz_questions
for each row
execute function public.set_updated_at();

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;

create policy "quizzes_select_own"
on public.quizzes
for select
to authenticated
using (public.owns_course(course_id) or public.is_admin());

create policy "quizzes_insert_own"
on public.quizzes
for insert
to authenticated
with check (public.owns_course(course_id) or public.is_admin());

create policy "quizzes_update_own"
on public.quizzes
for update
to authenticated
using (public.owns_course(course_id) or public.is_admin())
with check (public.owns_course(course_id) or public.is_admin());

create policy "quiz_questions_select_own"
on public.quiz_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and q.deleted_at is null
      and (public.owns_course(q.course_id) or public.is_admin())
  )
);

create policy "quiz_questions_insert_own"
on public.quiz_questions
for insert
to authenticated
with check (
  exists (
    select 1
    from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and q.deleted_at is null
      and (public.owns_course(q.course_id) or public.is_admin())
  )
);

create policy "quiz_questions_update_own"
on public.quiz_questions
for update
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and q.deleted_at is null
      and (public.owns_course(q.course_id) or public.is_admin())
  )
)
with check (
  exists (
    select 1
    from public.quizzes q
    where q.id = quiz_questions.quiz_id
      and q.deleted_at is null
      and (public.owns_course(q.course_id) or public.is_admin())
  )
);

revoke all on public.quizzes from anon, authenticated;
revoke all on public.quiz_questions from anon, authenticated;
grant select, insert, update on public.quizzes to authenticated;
grant select, insert, update on public.quiz_questions to authenticated;

create or replace function public.save_quiz(
  target_quiz_id uuid,
  new_title text,
  new_instructions text,
  new_passing_score integer,
  new_questions jsonb
)
returns void
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.quizzes
    where id = target_quiz_id
      and deleted_at is null
  ) then
    raise exception 'QUIZ_NOT_FOUND';
  end if;

  if jsonb_typeof(new_questions) <> 'array' then
    raise exception 'INVALID_QUESTIONS';
  end if;

  update public.quiz_questions
  set deleted_at = now()
  where quiz_id = target_quiz_id
    and deleted_at is null;

  insert into public.quiz_questions (
    quiz_id,
    order_index,
    prompt,
    option_a,
    option_b,
    option_c,
    option_d,
    correct_option,
    explanation,
    points
  )
  select
    target_quiz_id,
    (entry.position - 1)::integer,
    entry.question ->> 'prompt',
    entry.question ->> 'optionA',
    entry.question ->> 'optionB',
    entry.question ->> 'optionC',
    entry.question ->> 'optionD',
    entry.question ->> 'correctOption',
    entry.question ->> 'explanation',
    1
  from jsonb_array_elements(new_questions)
    with ordinality as entry(question, position);

  update public.quizzes
  set title = new_title,
      instructions = new_instructions,
      passing_score = new_passing_score,
      version = case
        when status = 'published' then version + 1
        else version
      end
  where id = target_quiz_id
    and deleted_at is null;
end;
$$;

create or replace function public.replace_quiz_paper(
  target_quiz_id uuid,
  target_course_id uuid,
  target_topic_id uuid,
  target_uploaded_by uuid,
  target_bucket text,
  target_storage_path text,
  target_original_name text,
  target_mime_type text,
  target_size_bytes bigint,
  target_checksum_sha256 text,
  target_preview_html text,
  target_actor_id uuid
)
returns jsonb
language plpgsql
as $$
declare
  current_quiz public.quizzes;
  new_file_id uuid;
begin
  select *
  into current_quiz
  from public.quizzes
  where id = target_quiz_id
    and deleted_at is null
  for update;

  if current_quiz.id is null then
    raise exception 'QUIZ_NOT_FOUND';
  end if;

  if current_quiz.mode <> 'document' then
    raise exception 'QUIZ_MODE_MISMATCH';
  end if;

  if current_quiz.course_id <> target_course_id
    or current_quiz.topic_id <> target_topic_id then
    raise exception 'QUIZ_TOPIC_MISMATCH';
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
    status,
    preview_html
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
    'ready',
    target_preview_html
  )
  returning id into new_file_id;

  update public.quizzes
  set file_id = new_file_id,
      version = case
        when status = 'published' then version + 1
        else version
      end
  where id = target_quiz_id;

  update public.files
  set deleted_at = now()
  where id = current_quiz.file_id
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
    'quiz.paper_replaced',
    'quiz',
    target_quiz_id,
    target_course_id,
    jsonb_build_object(
      'oldFileId', current_quiz.file_id,
      'newFileId', new_file_id
    )
  );

  return jsonb_build_object('fileId', new_file_id);
end;
$$;

create or replace function public.remove_quiz_paper(
  target_quiz_id uuid,
  target_actor_id uuid
)
returns void
language plpgsql
as $$
declare
  current_quiz public.quizzes;
begin
  select *
  into current_quiz
  from public.quizzes
  where id = target_quiz_id
    and deleted_at is null
  for update;

  if current_quiz.id is null then
    raise exception 'QUIZ_NOT_FOUND';
  end if;

  if current_quiz.mode <> 'document' then
    raise exception 'QUIZ_MODE_MISMATCH';
  end if;

  update public.quizzes
  set file_id = null,
      status = 'draft',
      version = version + 1
  where id = target_quiz_id;

  update public.files
  set deleted_at = now()
  where id = current_quiz.file_id
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
    'quiz.paper_removed',
    'quiz',
    target_quiz_id,
    current_quiz.course_id,
    jsonb_build_object('fileId', current_quiz.file_id)
  );
end;
$$;

create or replace function public.publish_quiz(
  target_quiz_id uuid,
  target_actor_id uuid
)
returns public.quizzes
language plpgsql
as $$
declare
  current_quiz public.quizzes;
  published_quiz public.quizzes;
begin
  select *
  into current_quiz
  from public.quizzes
  where id = target_quiz_id
    and deleted_at is null
  for update;

  if current_quiz.id is null then
    raise exception 'QUIZ_NOT_FOUND';
  end if;

  update public.quizzes
  set status = 'published',
      version = current_quiz.version + 1
  where id = target_quiz_id
  returning * into published_quiz;

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
    'quiz.published',
    'quiz',
    target_quiz_id,
    current_quiz.course_id,
    jsonb_build_object(
      'previousVersion', current_quiz.version,
      'version', published_quiz.version
    )
  );

  return published_quiz;
end;
$$;

create or replace function public.soft_delete_quiz(
  target_quiz_id uuid,
  target_actor_id uuid
)
returns void
language plpgsql
as $$
declare
  current_quiz public.quizzes;
begin
  select *
  into current_quiz
  from public.quizzes
  where id = target_quiz_id
    and deleted_at is null
  for update;

  if current_quiz.id is null then
    raise exception 'QUIZ_NOT_FOUND';
  end if;

  update public.quizzes
  set deleted_at = now()
  where id = target_quiz_id;

  update public.quiz_questions
  set deleted_at = now()
  where quiz_id = target_quiz_id
    and deleted_at is null;

  update public.files
  set deleted_at = now()
  where id = current_quiz.file_id
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
    'quiz.deleted',
    'quiz',
    target_quiz_id,
    current_quiz.course_id,
    jsonb_build_object(
      'title', current_quiz.title,
      'mode', current_quiz.mode
    )
  );
end;
$$;

revoke all on function public.save_quiz(uuid, text, text, integer, jsonb) from public;
revoke all on function public.replace_quiz_paper(
  uuid, uuid, uuid, uuid, text, text, text, text, bigint, text, text, uuid
) from public;
revoke all on function public.remove_quiz_paper(uuid, uuid) from public;
revoke all on function public.publish_quiz(uuid, uuid) from public;
revoke all on function public.soft_delete_quiz(uuid, uuid) from public;

grant execute on function public.save_quiz(uuid, text, text, integer, jsonb) to service_role;
grant execute on function public.replace_quiz_paper(
  uuid, uuid, uuid, uuid, text, text, text, text, bigint, text, text, uuid
) to service_role;
grant execute on function public.remove_quiz_paper(uuid, uuid) to service_role;
grant execute on function public.publish_quiz(uuid, uuid) to service_role;
grant execute on function public.soft_delete_quiz(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
