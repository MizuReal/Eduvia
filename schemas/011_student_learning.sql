-- Eduvia student learning: topic slide progress and graded quiz attempts.
-- Apply after 010_enrollment.sql.

create table public.topic_progress (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null,
  student_id uuid not null references public.profiles (id) on delete cascade,
  presentation_highest_slide_index integer not null default -1,
  slides_highest_slide_index integer not null default -1,
  presentation_completed_at timestamptz,
  slides_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint topic_progress_topic_course_fkey foreign key (topic_id, course_id)
    references public.course_topics (id, course_id) on delete cascade,
  constraint topic_progress_student_topic_key unique (topic_id, student_id),
  constraint topic_progress_presentation_index_check
    check (presentation_highest_slide_index >= -1),
  constraint topic_progress_slides_index_check
    check (slides_highest_slide_index >= -1)
);

create index topic_progress_course_student_idx
on public.topic_progress (course_id, student_id);

create trigger topic_progress_set_updated_at
before update on public.topic_progress
for each row
execute function public.set_updated_at();

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  topic_id uuid not null,
  student_id uuid not null references public.profiles (id) on delete cascade,
  attempt_number integer not null,
  status text not null default 'in_progress',
  snapshot jsonb not null,
  score integer,
  max_score integer,
  percentage integer,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quiz_attempts_topic_course_fkey foreign key (topic_id, course_id)
    references public.course_topics (id, course_id) on delete cascade,
  constraint quiz_attempts_attempt_number_positive check (attempt_number >= 1),
  constraint quiz_attempts_status_check
    check (status in ('in_progress', 'graded')),
  constraint quiz_attempts_snapshot_object_check
    check (jsonb_typeof(snapshot) = 'object'),
  constraint quiz_attempts_score_check check (score is null or score >= 0),
  constraint quiz_attempts_max_score_check
    check (max_score is null or max_score >= 0),
  constraint quiz_attempts_percentage_check
    check (percentage is null or percentage between 0 and 100),
  constraint quiz_attempts_student_number_key
    unique (quiz_id, student_id, attempt_number)
);

create unique index quiz_attempts_in_progress_key
on public.quiz_attempts (quiz_id, student_id)
where status = 'in_progress';

create index quiz_attempts_course_student_idx
on public.quiz_attempts (course_id, student_id);

create index quiz_attempts_student_quiz_idx
on public.quiz_attempts (student_id, quiz_id, attempt_number desc);

create trigger quiz_attempts_set_updated_at
before update on public.quiz_attempts
for each row
execute function public.set_updated_at();

create table public.attempt_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null,
  selected_option text not null,
  is_correct boolean,
  points_awarded integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attempt_answers_selected_option_check
    check (selected_option in ('A', 'B', 'C', 'D')),
  constraint attempt_answers_points_check
    check (points_awarded is null or points_awarded >= 0),
  constraint attempt_answers_attempt_question_key
    unique (attempt_id, question_id)
);

create index attempt_answers_attempt_idx
on public.attempt_answers (attempt_id);

create trigger attempt_answers_set_updated_at
before update on public.attempt_answers
for each row
execute function public.set_updated_at();

alter table public.topic_progress enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.attempt_answers enable row level security;

create policy "topic_progress_select_own"
on public.topic_progress
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.owns_course(course_id)
  or public.is_admin()
);

create policy "quiz_attempts_select_own"
on public.quiz_attempts
for select
to authenticated
using (
  student_id = (select auth.uid())
  or public.owns_course(course_id)
  or public.is_admin()
);

create policy "attempt_answers_select_own"
on public.attempt_answers
for select
to authenticated
using (
  exists (
    select 1
    from public.quiz_attempts a
    where a.id = attempt_answers.attempt_id
      and (
        a.student_id = (select auth.uid())
        or public.owns_course(a.course_id)
        or public.is_admin()
      )
  )
);

create policy "quizzes_select_student"
on public.quizzes
for select
to authenticated
using (
  status = 'published'
  and deleted_at is null
  and exists (
    select 1
    from public.enrollments e
    where e.course_id = quizzes.course_id
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  )
);

create policy "quiz_questions_select_student"
on public.quiz_questions
for select
to authenticated
using (
  exists (
    select 1
    from public.quizzes q
    join public.enrollments e on e.course_id = q.course_id
    where q.id = quiz_questions.quiz_id
      and q.status = 'published'
      and q.deleted_at is null
      and quiz_questions.deleted_at is null
      and e.student_id = (select auth.uid())
      and e.status = 'active'
  )
);

revoke all on public.topic_progress from anon, authenticated;
revoke all on public.quiz_attempts from anon, authenticated;
revoke all on public.attempt_answers from anon, authenticated;
grant select on public.topic_progress to authenticated;
grant select on public.quiz_attempts to authenticated;
grant select on public.attempt_answers to authenticated;

create or replace function public.record_topic_slide_progress(
  target_course_id uuid,
  target_topic_id uuid,
  target_student_id uuid,
  target_source text,
  target_slide_index integer,
  target_slide_count integer
)
returns public.topic_progress
language plpgsql
as $$
declare
  completed_at timestamptz;
  result public.topic_progress;
begin
  if target_source not in ('presentation', 'slides') then
    raise exception 'INVALID_PROGRESS_SOURCE';
  end if;

  if target_slide_index < 0 or target_slide_count <= 0 then
    raise exception 'INVALID_PROGRESS_INDEX';
  end if;

  if target_slide_index >= target_slide_count then
    raise exception 'INVALID_PROGRESS_INDEX';
  end if;

  completed_at := case
    when target_slide_index >= target_slide_count - 1 then now()
    else null
  end;

  insert into public.topic_progress (
    course_id,
    topic_id,
    student_id,
    presentation_highest_slide_index,
    slides_highest_slide_index,
    presentation_completed_at,
    slides_completed_at
  )
  values (
    target_course_id,
    target_topic_id,
    target_student_id,
    case when target_source = 'presentation' then target_slide_index else -1 end,
    case when target_source = 'slides' then target_slide_index else -1 end,
    case when target_source = 'presentation' then completed_at else null end,
    case when target_source = 'slides' then completed_at else null end
  )
  on conflict (topic_id, student_id) do update
  set presentation_highest_slide_index = case
        when target_source = 'presentation' then greatest(
          topic_progress.presentation_highest_slide_index,
          target_slide_index
        )
        else topic_progress.presentation_highest_slide_index
      end,
      slides_highest_slide_index = case
        when target_source = 'slides' then greatest(
          topic_progress.slides_highest_slide_index,
          target_slide_index
        )
        else topic_progress.slides_highest_slide_index
      end,
      presentation_completed_at = case
        when target_source = 'presentation'
          and topic_progress.presentation_completed_at is null
          and completed_at is not null
        then completed_at
        else topic_progress.presentation_completed_at
      end,
      slides_completed_at = case
        when target_source = 'slides'
          and topic_progress.slides_completed_at is null
          and completed_at is not null
        then completed_at
        else topic_progress.slides_completed_at
      end
  returning * into result;

  return result;
end;
$$;

create or replace function public.create_quiz_attempt(
  target_quiz_id uuid,
  target_course_id uuid,
  target_topic_id uuid,
  target_student_id uuid,
  target_snapshot jsonb
)
returns public.quiz_attempts
language plpgsql
as $$
declare
  existing_attempt public.quiz_attempts;
  next_number integer;
  result public.quiz_attempts;
begin
  select *
  into existing_attempt
  from public.quiz_attempts
  where quiz_id = target_quiz_id
    and student_id = target_student_id
    and status = 'in_progress'
  for update;

  if existing_attempt.id is not null then
    return existing_attempt;
  end if;

  select coalesce(max(attempt_number), 0) + 1
  into next_number
  from public.quiz_attempts
  where quiz_id = target_quiz_id
    and student_id = target_student_id;

  insert into public.quiz_attempts (
    quiz_id,
    course_id,
    topic_id,
    student_id,
    attempt_number,
    status,
    snapshot
  )
  values (
    target_quiz_id,
    target_course_id,
    target_topic_id,
    target_student_id,
    next_number,
    'in_progress',
    target_snapshot
  )
  returning * into result;

  return result;
end;
$$;

create or replace function public.save_quiz_attempt_answers(
  target_attempt_id uuid,
  target_student_id uuid,
  target_answers jsonb
)
returns void
language plpgsql
as $$
declare
  attempt public.quiz_attempts;
begin
  select *
  into attempt
  from public.quiz_attempts
  where id = target_attempt_id
    and student_id = target_student_id
  for update;

  if attempt.id is null then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if attempt.status <> 'in_progress' then
    raise exception 'ATTEMPT_NOT_EDITABLE';
  end if;

  if jsonb_typeof(target_answers) <> 'array' then
    raise exception 'INVALID_ANSWERS';
  end if;

  delete from public.attempt_answers
  where attempt_id = target_attempt_id;

  insert into public.attempt_answers (
    attempt_id,
    question_id,
    selected_option
  )
  select
    target_attempt_id,
    (entry.answer ->> 'questionId')::uuid,
    entry.answer ->> 'selectedOption'
  from jsonb_array_elements(target_answers)
    with ordinality as entry(answer, position);
end;
$$;

create or replace function public.grade_quiz_attempt(
  target_attempt_id uuid,
  target_student_id uuid,
  target_grades jsonb,
  target_score integer,
  target_max_score integer,
  target_percentage integer,
  target_passed boolean
)
returns public.quiz_attempts
language plpgsql
as $$
declare
  attempt public.quiz_attempts;
  result public.quiz_attempts;
begin
  select *
  into attempt
  from public.quiz_attempts
  where id = target_attempt_id
    and student_id = target_student_id
  for update;

  if attempt.id is null then
    raise exception 'ATTEMPT_NOT_FOUND';
  end if;

  if attempt.status <> 'in_progress' then
    raise exception 'ATTEMPT_NOT_EDITABLE';
  end if;

  if jsonb_typeof(target_grades) <> 'array' then
    raise exception 'INVALID_GRADES';
  end if;

  update public.attempt_answers a
  set is_correct = (entry.grade ->> 'isCorrect')::boolean,
      points_awarded = (entry.grade ->> 'pointsAwarded')::integer
  from jsonb_array_elements(target_grades) as entry(grade)
  where a.attempt_id = target_attempt_id
    and a.question_id = (entry.grade ->> 'questionId')::uuid;

  update public.quiz_attempts
  set status = 'graded',
      score = target_score,
      max_score = target_max_score,
      percentage = target_percentage,
      passed = target_passed,
      submitted_at = now(),
      graded_at = now()
  where id = target_attempt_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.record_topic_slide_progress(
  uuid, uuid, uuid, text, integer, integer
) from public;
revoke all on function public.create_quiz_attempt(
  uuid, uuid, uuid, uuid, jsonb
) from public;
revoke all on function public.save_quiz_attempt_answers(
  uuid, uuid, jsonb
) from public;
revoke all on function public.grade_quiz_attempt(
  uuid, uuid, jsonb, integer, integer, integer, boolean
) from public;

grant execute on function public.record_topic_slide_progress(
  uuid, uuid, uuid, text, integer, integer
) to service_role;
grant execute on function public.create_quiz_attempt(
  uuid, uuid, uuid, uuid, jsonb
) to service_role;
grant execute on function public.save_quiz_attempt_answers(
  uuid, uuid, jsonb
) to service_role;
grant execute on function public.grade_quiz_attempt(
  uuid, uuid, jsonb, integer, integer, integer, boolean
) to service_role;

notify pgrst, 'reload schema';
