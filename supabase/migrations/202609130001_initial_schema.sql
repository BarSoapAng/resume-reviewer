create extension if not exists pgcrypto;

create type public.discipline as enum ('software', 'mechanical');
create type public.version_creator as enum ('user', 'ai', 'system');
create type public.review_state as enum ('imported', 'initial_review', 'probing', 'ready_to_edit', 'editing', 'final_review', 'complete');
create type public.message_role as enum ('user', 'assistant', 'system');
create type public.issue_severity as enum ('high', 'medium', 'low');
create type public.issue_status as enum ('open', 'probing', 'resolved', 'skipped');
create type public.edit_status as enum ('pending', 'accepted', 'rejected', 'stale');
create type public.payment_status as enum ('paid', 'refunded');
create type public.entitlement_status as enum ('available', 'consumed', 'revoked');

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.resume_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  discipline public.discipline not null,
  current_source text not null check (octet_length(current_source) <= 1048576),
  current_version_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.resume_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.resume_projects(id) on delete cascade,
  parent_version_id uuid references public.resume_versions(id) on delete set null,
  latex_source text not null check (octet_length(latex_source) <= 1048576),
  created_by public.version_creator not null,
  reason text not null check (char_length(reason) between 1 and 500),
  created_at timestamptz not null default now()
);
alter table public.resume_projects add constraint resume_projects_current_version_fk
  foreign key (current_version_id) references public.resume_versions(id) on delete set null;

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.resume_projects(id) on delete cascade,
  rubric_version text not null,
  state public.review_state not null default 'imported',
  model text not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.review_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  role public.message_role not null,
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

create table public.resume_facts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.resume_projects(id) on delete cascade,
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  subject text,
  section text,
  statement text not null,
  source_type text not null check (source_type in ('resume', 'user_message')),
  source_id text not null,
  created_at timestamptz not null default now()
);

create table public.review_issues (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  rule_id text not null,
  severity public.issue_severity not null,
  category text not null,
  description text not null,
  reasoning text not null,
  source_anchor jsonb not null check (source_anchor ?& array['versionId', 'exactText', 'occurrence']),
  status public.issue_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.proposed_edits (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  base_version_id uuid not null references public.resume_versions(id) on delete cascade,
  old_text text not null,
  new_text text not null,
  explanation text not null,
  status public.edit_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.review_sessions(id) on delete cascade,
  model text not null,
  input_tokens integer not null check (input_tokens >= 0),
  output_tokens integer not null check (output_tokens >= 0),
  estimated_cost numeric(12, 6) not null check (estimated_cost >= 0),
  created_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  provider_payment_id text not null,
  email text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null check (char_length(currency) = 3),
  status public.payment_status not null,
  created_at timestamptz not null default now(),
  unique (provider, provider_payment_id)
);

create table public.review_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id uuid not null unique references public.payments(id) on delete restrict,
  session_id uuid unique references public.review_sessions(id) on delete set null,
  status public.entitlement_status not null default 'available',
  created_at timestamptz not null default now(),
  check ((status = 'available' and session_id is null) or (status <> 'available'))
);

create index resume_projects_user_idx on public.resume_projects(user_id);
create index resume_versions_project_idx on public.resume_versions(project_id, created_at desc);
create index review_sessions_project_idx on public.review_sessions(project_id);
create index review_messages_session_idx on public.review_messages(session_id, created_at);
create index resume_facts_session_idx on public.resume_facts(session_id);
create index review_issues_session_idx on public.review_issues(session_id);
create index proposed_edits_session_idx on public.proposed_edits(session_id);
create index entitlements_user_status_idx on public.review_entitlements(user_id, status);

create function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end $$;
create trigger resume_projects_set_updated_at before update on public.resume_projects
for each row execute function public.set_updated_at();

create function public.create_profile_for_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.profiles(user_id) values (new.id) on conflict (user_id) do nothing; return new; end $$;
create trigger auth_user_created after insert on auth.users
for each row execute function public.create_profile_for_user();

alter table public.profiles enable row level security;
alter table public.resume_projects enable row level security;
alter table public.resume_versions enable row level security;
alter table public.review_sessions enable row level security;
alter table public.review_messages enable row level security;
alter table public.resume_facts enable row level security;
alter table public.review_issues enable row level security;
alter table public.proposed_edits enable row level security;
alter table public.usage_events enable row level security;
alter table public.payments enable row level security;
alter table public.review_entitlements enable row level security;

create policy profiles_owner on public.profiles for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy projects_owner on public.resume_projects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy versions_owner on public.resume_versions for all using (exists (select 1 from public.resume_projects p where p.id = project_id and p.user_id = auth.uid())) with check (exists (select 1 from public.resume_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy sessions_owner on public.review_sessions for all using (exists (select 1 from public.resume_projects p where p.id = project_id and p.user_id = auth.uid())) with check (exists (select 1 from public.resume_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy messages_owner on public.review_messages for all using (exists (select 1 from public.review_sessions s join public.resume_projects p on p.id = s.project_id where s.id = session_id and p.user_id = auth.uid())) with check (exists (select 1 from public.review_sessions s join public.resume_projects p on p.id = s.project_id where s.id = session_id and p.user_id = auth.uid()));
create policy facts_owner on public.resume_facts for all using (exists (select 1 from public.resume_projects p where p.id = project_id and p.user_id = auth.uid())) with check (exists (select 1 from public.resume_projects p where p.id = project_id and p.user_id = auth.uid()));
create policy issues_owner on public.review_issues for all using (exists (select 1 from public.review_sessions s join public.resume_projects p on p.id = s.project_id where s.id = session_id and p.user_id = auth.uid())) with check (exists (select 1 from public.review_sessions s join public.resume_projects p on p.id = s.project_id where s.id = session_id and p.user_id = auth.uid()));
create policy edits_owner on public.proposed_edits for all using (exists (select 1 from public.review_sessions s join public.resume_projects p on p.id = s.project_id where s.id = session_id and p.user_id = auth.uid())) with check (exists (select 1 from public.review_sessions s join public.resume_projects p on p.id = s.project_id where s.id = session_id and p.user_id = auth.uid()));
create policy usage_owner on public.usage_events for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy payments_owner_read on public.payments for select using (auth.uid() = user_id);
create policy entitlements_owner_read on public.review_entitlements for select using (auth.uid() = user_id);

revoke all on public.payments, public.review_entitlements from anon, authenticated;
grant select on public.payments, public.review_entitlements to authenticated;
