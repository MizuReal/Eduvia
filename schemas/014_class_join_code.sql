-- Eduvia class join codes: globally unique, student-friendly class codes.
-- Apply after 013_profiles_registration.sql.

alter table public.courses
  add column join_code text;

create or replace function public.generate_course_join_code()
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  candidate text;
  position_index integer;
begin
  loop
    candidate := '';

    for position_index in 1..6 loop
      candidate := candidate || substr(
        alphabet,
        1 + floor(random() * length(alphabet))::integer,
        1
      );
    end loop;

    exit when not exists (
      select 1 from public.courses where join_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

do $$
declare
  course_row record;
begin
  for course_row in select id from public.courses loop
    update public.courses
    set join_code = public.generate_course_join_code()
    where id = course_row.id;
  end loop;
end;
$$;

alter table public.courses
  alter column join_code set not null,
  alter column join_code set default public.generate_course_join_code();

alter table public.courses
  add constraint courses_join_code_format
  check (join_code ~ '^[A-HJ-KM-NP-Z2-9]{6}$');

create unique index courses_join_code_key
on public.courses (join_code);

notify pgrst, 'reload schema';
