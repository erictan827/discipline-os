alter table public.discipline_os_push_subscriptions
  add column if not exists last_notified_at timestamptz;
