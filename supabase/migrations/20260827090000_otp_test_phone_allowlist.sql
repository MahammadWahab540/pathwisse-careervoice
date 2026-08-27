create table if not exists public.otp_test_phone_allowlist (
  phone text primary key,
  test_code text not null default '123456' check (test_code ~ '^[0-9]{6}$'),
  active boolean not null default true,
  reason text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.otp_test_phone_allowlist (phone, test_code, active, reason, updated_at)
values ('+919100886544', '123456', true, 'CareerVoice test OTP allowlist', now())
on conflict (phone) do update
set test_code = excluded.test_code,
    active = true,
    reason = excluded.reason,
    updated_at = now();

create index if not exists otp_test_phone_allowlist_active_idx
  on public.otp_test_phone_allowlist (phone)
  where active = true;
