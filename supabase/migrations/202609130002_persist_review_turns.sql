alter table public.proposed_edits
  add column issue_ids uuid[] not null default '{}',
  add column citations jsonb not null default '[]'::jsonb;
