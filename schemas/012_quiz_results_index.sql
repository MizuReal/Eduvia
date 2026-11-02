-- Eduvia teacher quiz results: graded attempts are read by quiz.
-- Apply after 011_student_learning.sql.

create index quiz_attempts_quiz_graded_idx
on public.quiz_attempts (quiz_id)
where status = 'graded';
