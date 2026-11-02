-- Eduvia registration: full names, registration roles, and TUPT usernames.
-- Apply after 012_quiz_results_index.sql.

alter table public.profiles
  add column first_name text not null default '',
  add column middle_name text not null default '',
  add column last_name text not null default '';

-- New registrations require TUPT-XX-XXXX usernames. Legacy usernames remain
-- valid so existing accounts can still sign in and be updated.
alter table public.profiles
  drop constraint profiles_username_format;

alter table public.profiles
  add constraint profiles_username_format
  check (
    username ~ '^tupt-[0-9]{2}-[0-9]{4}$'
    or username ~ '^[a-z][a-z0-9_]{2,19}$'
  );

-- Existing rows predate the full-name requirement; new rows must carry all
-- three names. Validate this constraint after legacy profiles are backfilled.
alter table public.profiles
  add constraint profiles_names_not_blank
  check (
    length(btrim(first_name)) > 0
    and length(btrim(middle_name)) > 0
    and length(btrim(last_name)) > 0
  ) not valid;

notify pgrst, 'reload schema';
