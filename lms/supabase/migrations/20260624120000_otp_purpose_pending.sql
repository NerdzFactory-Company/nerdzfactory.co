-- Pending OTP purpose (sign up vs password reset) for the Send SMS hook.
-- Set by the app immediately before signInWithOtp; consumed by the send-sms Edge Function.

create table if not exists public.lms_otp_purpose_pending (
  phone text primary key,
  purpose text not null check (purpose in ('signup', 'recovery')),
  created_at timestamptz not null default now()
);

create index if not exists lms_otp_purpose_pending_created_at_idx
  on public.lms_otp_purpose_pending (created_at);

alter table public.lms_otp_purpose_pending enable row level security;

-- Nigerian phone → +234XXXXXXXXXX (matches lms/src/lib/phone.ts)
create or replace function public.lms_normalize_phone(p_raw text)
returns text
language plpgsql
immutable
as $$
declare
  d text;
begin
  if p_raw is null or length(trim(p_raw)) = 0 then
    return null;
  end if;
  d := regexp_replace(p_raw, '\D', '', 'g');
  if length(d) = 11 and d like '0%' then
    return '+234' || substring(d from 2);
  elsif length(d) = 13 and d like '234%' then
    return '+' || d;
  elsif length(d) = 10 and d ~ '^[789]' then
    return '+234' || d;
  end if;
  return null;
end;
$$;

-- Called from the LMS app before requesting an SMS code
create or replace function public.lms_set_otp_purpose(p_phone text, p_purpose text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
begin
  if p_purpose is null or p_purpose not in ('signup', 'recovery') then
    raise exception 'INVALID_PURPOSE';
  end if;
  v_phone := lms_normalize_phone(p_phone);
  if v_phone is null then
    raise exception 'INVALID_PHONE';
  end if;
  insert into public.lms_otp_purpose_pending (phone, purpose)
  values (v_phone, p_purpose)
  on conflict (phone) do update
    set purpose = excluded.purpose,
        created_at = now();
end;
$$;

-- Called from send-sms Edge Function (service role) when building the SMS text
create or replace function public.lms_consume_otp_purpose(p_phone text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text;
  v_purpose text;
begin
  v_phone := lms_normalize_phone(p_phone);
  if v_phone is null then
    return null;
  end if;
  select purpose into v_purpose
  from public.lms_otp_purpose_pending
  where phone = v_phone
    and created_at > now() - interval '15 minutes'
  order by created_at desc
  limit 1;

  if v_purpose is not null then
    delete from public.lms_otp_purpose_pending where phone = v_phone;
  end if;

  return v_purpose;
end;
$$;

grant execute on function public.lms_set_otp_purpose(text, text) to anon, authenticated;
grant execute on function public.lms_consume_otp_purpose(text) to service_role;
