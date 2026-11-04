alter table resume_versions add column metadata jsonb not null default '{}';
alter table review_messages add column turn_id uuid;
alter table review_messages add column parts jsonb not null default '[]';
create table conversation_turns (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references review_sessions(id) on delete cascade,
  content text not null,
  answers jsonb,
  status text not null default 'running' check (status in ('running', 'failed', 'completed')),
  result jsonb,
  updated_at timestamptz not null default now()
);
create unique index conversation_one_running_turn on conversation_turns(session_id) where status = 'running';
alter table conversation_turns enable row level security;
create policy own_conversation_turns on conversation_turns for select using (auth.uid() = user_id);
