-- Promly core schema (docs/PLAN.md section 4).
-- All money is stored as integers in minor units (øre / cents).

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  role         text not null default 'promoter' check (role in ('business', 'promoter', 'admin')),
  is_demo      boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- businesses
-- ---------------------------------------------------------------------------
create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  city        text not null default '' check (char_length(city) <= 80),
  country     text not null check (country in ('NO', 'ES')),
  currency    text not null check (currency in ('NOK', 'EUR')),
  category    text not null check (category in (
                'barbershop', 'beauty', 'restaurant', 'experience', 'water_sports',
                'jet_ski', 'boat_tour', 'fitness', 'other')),
  logo_url    text,
  is_demo     boolean not null default false,
  created_at  timestamptz not null default now(),
  constraint businesses_country_currency check (
    (country = 'NO' and currency = 'NOK') or (country = 'ES' and currency = 'EUR'))
);
create index businesses_owner_id_idx on public.businesses (owner_id);

-- ---------------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------------
create table public.campaigns (
  id                   uuid primary key default gen_random_uuid(),
  business_id          uuid not null references public.businesses (id) on delete cascade,
  service_name         text not null check (char_length(service_name) between 1 and 120),
  description          text not null default '' check (char_length(description) <= 4000),
  image_url            text,
  price_minor          bigint not null check (price_minor > 0),
  commission_minor     bigint not null default 0 check (commission_minor >= 0), -- copied from the current agreement
  currency             text not null check (currency in ('NOK', 'EUR')),       -- copied from the business
  status               text not null default 'draft' check (status in ('draft', 'published', 'paused')),
  current_agreement_id uuid,
  published_at         timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index campaigns_business_id_idx on public.campaigns (business_id);
create index campaigns_status_idx on public.campaigns (status);

-- ---------------------------------------------------------------------------
-- agreements: versioned terms per campaign, built from the standard template
-- ---------------------------------------------------------------------------
create table public.agreements (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references public.campaigns (id) on delete cascade,
  version              int not null,
  template_version     text not null default 'promly-standard-v1',
  commission_minor     bigint not null check (commission_minor > 0),
  payout_days          int not null check (payout_days in (7, 14)),
  refund_window_days   int not null check (refund_window_days between 0 and 14),
  allowed_channels     text[] not null default '{}' check (allowed_channels <@ array[
                         'tiktok', 'instagram', 'snapchat', 'whatsapp', 'facebook',
                         'word_of_mouth', 'qr_print', 'other']::text[]),
  brand_rules          text not null default '' check (char_length(brand_rules) <= 2000),
  business_accepted_at timestamptz,
  created_at           timestamptz not null default now(),
  unique (campaign_id, version),
  constraint agreements_refund_before_payout check (refund_window_days <= payout_days)
);

alter table public.campaigns
  add constraint campaigns_current_agreement_fk
  foreign key (current_agreement_id) references public.agreements (id) on delete set null;

-- ---------------------------------------------------------------------------
-- campaign_memberships: a promoter joined a campaign and accepted its agreement
-- ---------------------------------------------------------------------------
create table public.campaign_memberships (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references public.campaigns (id) on delete cascade,
  promoter_id          uuid not null references public.profiles (id) on delete cascade,
  agreement_id         uuid not null references public.agreements (id) on delete cascade,
  promoter_accepted_at timestamptz not null default now(),
  created_at           timestamptz not null default now(),
  unique (campaign_id, promoter_id)
);
create index campaign_memberships_promoter_idx on public.campaign_memberships (promoter_id);

-- ---------------------------------------------------------------------------
-- referral_links: one unique code per membership -> /r/<code>
-- ---------------------------------------------------------------------------
create table public.referral_links (
  id            uuid primary key default gen_random_uuid(),
  membership_id uuid not null unique references public.campaign_memberships (id) on delete cascade,
  campaign_id   uuid not null references public.campaigns (id) on delete cascade,
  promoter_id   uuid not null references public.profiles (id) on delete cascade,
  code          text not null unique check (code ~ '^[a-z0-9]{10}$'),
  created_at    timestamptz not null default now()
);
create index referral_links_promoter_idx on public.referral_links (promoter_id);

-- ---------------------------------------------------------------------------
-- referral_events: visits to a referral link (no personal data)
-- ---------------------------------------------------------------------------
create table public.referral_events (
  id               bigint generated always as identity primary key,
  referral_link_id uuid not null references public.referral_links (id) on delete cascade,
  type             text not null default 'visit' check (type in ('visit')),
  created_at       timestamptz not null default now()
);
create index referral_events_link_idx on public.referral_events (referral_link_id);

-- ---------------------------------------------------------------------------
-- bookings: customer booking with the commission terms FROZEN at booking time
-- ---------------------------------------------------------------------------
create table public.bookings (
  id                    uuid primary key default gen_random_uuid(),
  campaign_id           uuid not null references public.campaigns (id) on delete cascade,
  business_id           uuid not null references public.businesses (id) on delete cascade,
  referral_link_id      uuid not null references public.referral_links (id) on delete cascade,
  promoter_id           uuid not null references public.profiles (id) on delete cascade,
  agreement_id          uuid not null references public.agreements (id) on delete cascade,
  slot_start            timestamptz not null,
  status                text not null default 'pending'
                          check (status in ('pending', 'verified', 'refunded', 'cancelled')),
  -- frozen terms
  price_minor           bigint not null check (price_minor > 0),
  commission_minor      bigint not null check (commission_minor >= 0),
  fee_bps               int not null check (fee_bps between 0 and 10000),
  fee_minor             bigint not null check (fee_minor >= 0),
  business_total_minor  bigint not null,
  currency              text not null check (currency in ('NOK', 'EUR')),
  payout_days           int not null,
  refund_window_days    int not null,
  -- lifecycle
  verified_at           timestamptz,
  refund_window_ends_at timestamptz,
  payout_at             timestamptz,
  released_at           timestamptz,
  refunded_at           timestamptz,
  created_at            timestamptz not null default now(),
  constraint bookings_total_is_commission_plus_fee
    check (business_total_minor = commission_minor + fee_minor)
);
create index bookings_business_idx on public.bookings (business_id);
create index bookings_promoter_idx on public.bookings (promoter_id);
-- No double booking: one active booking per business per time slot.
create unique index bookings_no_double_booking
  on public.bookings (business_id, slot_start)
  where status in ('pending', 'verified');

-- ---------------------------------------------------------------------------
-- booking_contacts: customer contact details, readable by the business only
-- (kept apart from bookings so promoters never see customer phone numbers)
-- ---------------------------------------------------------------------------
create table public.booking_contacts (
  booking_id     uuid primary key references public.bookings (id) on delete cascade,
  customer_name  text not null check (char_length(customer_name) between 1 and 100),
  customer_phone text not null check (char_length(customer_phone) between 3 and 40)
);

-- ---------------------------------------------------------------------------
-- ledger_entries: append-only money log. Balances = sums of rows.
-- ---------------------------------------------------------------------------
create table public.ledger_entries (
  id           bigint generated always as identity primary key,
  booking_id   uuid not null references public.bookings (id) on delete restrict,
  account      text not null check (account in ('promoter', 'business', 'platform')),
  party_id     uuid, -- promoter profile id, business id, or null for the platform
  bucket       text not null check (bucket in ('pending', 'available')),
  entry_type   text not null check (entry_type in (
                 'commission', 'platform_fee', 'business_charge', 'release', 'reversal')),
  amount_minor bigint not null check (amount_minor <> 0),
  currency     text not null check (currency in ('NOK', 'EUR')),
  created_at   timestamptz not null default now(),
  -- Idempotency: each one-time entry can exist only once per booking.
  unique (booking_id, entry_type, account, bucket),
  constraint ledger_platform_has_no_party check ((account = 'platform') = (party_id is null))
);
create index ledger_entries_party_idx on public.ledger_entries (account, party_id);

-- ---------------------------------------------------------------------------
-- notifications: activity feed ("Alex joined your campaign", ...)
-- ---------------------------------------------------------------------------
create table public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       text not null check (type in (
               'promoter_joined', 'booking_created', 'booking_verified',
               'commission_available', 'booking_refunded')),
  title      text not null,
  payload    jsonb not null default '{}'::jsonb,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

-- ===========================================================================
-- Triggers
-- ===========================================================================

-- Create a profile whenever someone signs up. Role comes from sign-up
-- metadata ('business' or 'promoter'); nobody can sign up as admin.
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(coalesce(new.email, ''), '@', 1)), 80),
    case when new.raw_user_meta_data ->> 'role' = 'business' then 'business' else 'promoter' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Campaigns: currency comes from the business, commission from the accepted
-- agreement, and publishing requires an accepted agreement.
create function public.campaigns_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_agreement public.agreements;
begin
  if tg_op = 'UPDATE' and new.business_id <> old.business_id then
    raise exception 'campaign_cannot_change_business';
  end if;

  new.currency := (select b.currency from public.businesses b where b.id = new.business_id);

  if new.current_agreement_id is not null then
    select * into v_agreement from public.agreements a where a.id = new.current_agreement_id;
    if v_agreement.campaign_id <> new.id or v_agreement.business_accepted_at is null then
      raise exception 'agreement_not_accepted_for_this_campaign';
    end if;
    new.commission_minor := v_agreement.commission_minor;
  end if;

  if new.status = 'published' and new.current_agreement_id is null then
    raise exception 'agreement_required_to_publish';
  end if;
  if new.commission_minor > new.price_minor then
    raise exception 'commission_exceeds_price';
  end if;
  if new.status = 'published' and (tg_op = 'INSERT' or old.status <> 'published') then
    new.published_at := now();
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger campaigns_before_write
  before insert or update on public.campaigns
  for each row execute function public.campaigns_before_write();

-- Agreements: version numbers are automatic, acceptance time is set by the
-- server clock, and an accepted agreement can never be changed.
create function public.agreements_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.version := (select coalesce(max(a.version), 0) + 1
                    from public.agreements a where a.campaign_id = new.campaign_id);
  else
    if old.business_accepted_at is not null then
      raise exception 'agreement_is_accepted_and_cannot_change';
    end if;
    new.campaign_id := old.campaign_id;
    new.version := old.version;
  end if;
  new.template_version := 'promly-standard-v1';
  if new.business_accepted_at is not null then
    new.business_accepted_at := now();
  end if;
  return new;
end $$;

create trigger agreements_before_write
  before insert or update on public.agreements
  for each row execute function public.agreements_before_write();

-- Memberships: acceptance time from the server clock; the agreement must
-- belong to the campaign and be accepted by the business.
create function public.memberships_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.agreements a
                 where a.id = new.agreement_id and a.campaign_id = new.campaign_id
                   and a.business_accepted_at is not null) then
    raise exception 'invalid_agreement_for_campaign';
  end if;
  new.promoter_accepted_at := now();
  return new;
end $$;

create trigger memberships_before_insert
  before insert on public.campaign_memberships
  for each row execute function public.memberships_before_insert();

-- After joining: create the promoter's unique referral link and tell the business.
create function public.memberships_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_name  text;
begin
  insert into public.referral_links (membership_id, campaign_id, promoter_id, code)
  values (new.id, new.campaign_id, new.promoter_id,
          substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));

  select b.owner_id into v_owner
  from public.campaigns c join public.businesses b on b.id = c.business_id
  where c.id = new.campaign_id;
  select p.display_name into v_name from public.profiles p where p.id = new.promoter_id;

  insert into public.notifications (user_id, type, title, payload)
  values (v_owner, 'promoter_joined', coalesce(nullif(v_name, ''), 'A promoter') || ' joined your campaign.',
          jsonb_build_object('campaign_id', new.campaign_id, 'membership_id', new.id));
  return new;
end $$;

create trigger memberships_after_insert
  after insert on public.campaign_memberships
  for each row execute function public.memberships_after_insert();

-- Ledger is append-only. The only exception is the admin demo purge, which
-- switches on a transaction-local setting before deleting demo rows.
create function public.ledger_append_only()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and current_setting('promly.allow_ledger_purge', true) = 'on' then
    return old;
  end if;
  raise exception 'ledger_entries is append-only';
end $$;

create trigger ledger_no_update_delete
  before update or delete on public.ledger_entries
  for each row execute function public.ledger_append_only();

create trigger ledger_no_truncate
  before truncate on public.ledger_entries
  for each statement execute function public.ledger_append_only();
