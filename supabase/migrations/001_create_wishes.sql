create table if not exists public.wishes (
  user_id text not null,
  id uuid not null,
  text text not null check (char_length(text) <= 180),
  status text not null check (status in ('waiting', 'returned', 'doing', 'later', 'expired', 'done')),
  created_at bigint not null,
  updated_at bigint not null,
  primary key (user_id, id)
);

alter table public.wishes enable row level security;

create index if not exists wishes_user_updated_at_idx
  on public.wishes (user_id, updated_at desc);
