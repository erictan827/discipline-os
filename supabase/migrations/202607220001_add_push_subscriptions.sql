create table if not exists public.discipline_os_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  identity_key text not null references public.discipline_os_states(identity_key) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  timezone text not null default 'Asia/Kuala_Lumpur',
  primary_hour smallint not null default 21 check (primary_hour between 0 and 23),
  fallback_hour smallint check (fallback_hour between 0 and 23),
  enabled boolean not null default true,
  last_notified_date text,
  last_notified_hour smallint,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists discipline_os_push_identity_idx
  on public.discipline_os_push_subscriptions(identity_key);

alter table public.discipline_os_push_subscriptions enable row level security;

drop policy if exists "users can manage their own push subscriptions" on public.discipline_os_push_subscriptions;
create policy "users can manage their own push subscriptions"
on public.discipline_os_push_subscriptions
for all
to authenticated
using (lower(coalesce(auth.jwt() ->> 'email', '')) = identity_key)
with check (lower(coalesce(auth.jwt() ->> 'email', '')) = identity_key);
