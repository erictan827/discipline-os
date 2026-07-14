create table if not exists public.discipline_os_states (
  identity_key text primary key,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  name text not null default 'Eric',
  state jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.discipline_os_states add column if not exists identity_key text;
alter table public.discipline_os_states add column if not exists user_id uuid references auth.users (id) on delete set null;
alter table public.discipline_os_states add column if not exists email text;
alter table public.discipline_os_states add column if not exists name text not null default 'Eric';
alter table public.discipline_os_states add column if not exists state jsonb not null default '{}'::jsonb;
alter table public.discipline_os_states add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.discipline_os_states
set
  email = lower(trim(coalesce(email, ''))),
  identity_key = lower(trim(coalesce(email, ''))),
  name = coalesce(nullif(trim(name), ''), 'Eric')
where true;

delete from public.discipline_os_states target
using (
  select ctid,
         row_number() over (
           partition by identity_key
           order by updated_at desc nulls last, ctid desc
         ) as rn
  from public.discipline_os_states
  where identity_key is not null
    and identity_key <> ''
) ranked
where target.ctid = ranked.ctid
  and ranked.rn > 1;

alter table public.discipline_os_states
  drop constraint if exists discipline_os_states_pkey;

alter table public.discipline_os_states
  alter column identity_key set not null;

alter table public.discipline_os_states
  add constraint discipline_os_states_pkey primary key (identity_key);

alter table public.discipline_os_states
  alter column user_id drop not null;

create index if not exists discipline_os_states_user_id_idx
  on public.discipline_os_states (user_id);

create unique index if not exists discipline_os_states_identity_key_key
  on public.discipline_os_states (identity_key);

alter table public.discipline_os_states enable row level security;

drop policy if exists "users can read their own discipline state" on public.discipline_os_states;
drop policy if exists "users can insert their own discipline state" on public.discipline_os_states;
drop policy if exists "users can update their own discipline state" on public.discipline_os_states;
drop policy if exists "users can read their own discipline state by email" on public.discipline_os_states;
drop policy if exists "users can insert their own discipline state by email" on public.discipline_os_states;
drop policy if exists "users can update their own discipline state by email" on public.discipline_os_states;

create policy "users can read their own discipline state by email"
on public.discipline_os_states
for select
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = identity_key
);

create policy "users can insert their own discipline state by email"
on public.discipline_os_states
for insert
to authenticated
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = identity_key
);

create policy "users can update their own discipline state by email"
on public.discipline_os_states
for update
to authenticated
using (
  lower(coalesce(auth.jwt() ->> 'email', '')) = identity_key
)
with check (
  lower(coalesce(auth.jwt() ->> 'email', '')) = identity_key
);
