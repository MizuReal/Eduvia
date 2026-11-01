-- Eduvia audit log: append-only record of content removals and admin actions.
-- Apply after 005_files.sql.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  course_id uuid references public.courses (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (length(btrim(action)) > 0),
  constraint audit_logs_entity_type_not_blank check (length(btrim(entity_type)) > 0),
  constraint audit_logs_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index audit_logs_course_created_idx
on public.audit_logs (course_id, created_at desc);

create index audit_logs_actor_created_idx
on public.audit_logs (actor_id, created_at desc);

alter table public.audit_logs enable row level security;

create policy "audit_logs_select_admin"
on public.audit_logs
for select
to authenticated
using (public.is_admin());

revoke all on public.audit_logs from anon, authenticated;
grant select on public.audit_logs to authenticated;
grant insert on public.audit_logs to service_role;

notify pgrst, 'reload schema';
