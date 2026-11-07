-- Payments and settlement (docs/PAYMENTS.md). Stripe TEST MODE, behind PAYMENTS_ENABLED.
--
-- ADDITIVE: new tables, new server-only functions, new columns
-- (bookings.final_at; campaigns.age_rating default '18+' and age_restricted)
-- and new triggers that only act on overdue invoices or age rules.
-- Existing behaviour is unchanged for everyone who isn't a 16-17 promoter:
--   * ledger_entries / notifications / business category checks: same values plus new ones.
--   * every existing campaign becomes 18+; promoters without an age band (all
--     existing accounts) see and join exactly what they did before.
--   * campaigns visibility policy, is_published_campaign, memberships_before_insert:
--     same rules plus "16-17 promoters: 16+ campaigns only (and a guardian payout account to join)".
--   * agreements_before_write: still forces 'promly-standard-v1' unless the
--     server explicitly asks for 'promly-standard-v2'.
--   * purge_demo_data: first clears demo invoices/payouts (none exist today),
--     then runs exactly the old body.
-- Money still moves only through server-only functions (service role).

-- ===========================================================================
-- 0. Wider value lists (supersets; every existing row stays valid)
-- ===========================================================================
alter table public.ledger_entries
  drop constraint ledger_entries_entry_type_check,
  add constraint ledger_entries_entry_type_check check (entry_type in (
    'commission', 'platform_fee', 'business_charge', 'release', 'reversal', 'clawback'));

alter table public.notifications
  drop constraint notifications_type_check,
  add constraint notifications_type_check check (type in (
    'promoter_joined', 'booking_created', 'booking_verified',
    'commission_available', 'booking_refunded',
    'booking_cancelled', 'invoice_created', 'invoice_paid', 'invoice_overdue',
    'payout_sent', 'clawback'));

-- Commission is final this many days after the business verifies the service.
create function public.final_after_days()
returns int language sql immutable set search_path = '' as $$ select 14 $$;

-- ===========================================================================
-- 1. bookings.final_at: when the commission became final (null = not yet)
-- ===========================================================================
alter table public.bookings add column final_at timestamptz;

-- ===========================================================================
-- 2. Tables
-- ===========================================================================

-- Promoter age band (no birth dates: Stripe verifies age during onboarding).
-- Readable only by its owner. Written only by set_age_band.
-- A promoter without a row is a legacy account and is treated like 18+ for visibility.
create table public.promoter_age (
  profile_id   uuid primary key references public.profiles (id) on delete cascade,
  age_band     text not null check (age_band in ('16-17', '18+')),
  confirmed_at timestamptz not null default now()
);

-- Promoter payout account. Only the Stripe account id, payouts status, and who
-- holds it: the promoter (18+), or a parent/guardian for a 16-17 promoter,
-- with the time the guardian confirmed consent. Never bank details or ID.
create table public.stripe_accounts (
  profile_id          uuid primary key references public.profiles (id) on delete cascade,
  stripe_account_id   text not null unique check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  payouts_enabled     boolean not null default false,
  holder              text not null default 'self' check (holder in ('self', 'guardian')),
  guardian_consent_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint stripe_accounts_guardian_consent check ((holder = 'guardian') = (guardian_consent_at is not null))
);

-- Business billing: the Stripe Customer that receives Promly's invoices.
create table public.stripe_customers (
  business_id        uuid primary key references public.businesses (id) on delete cascade,
  stripe_customer_id text not null unique check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  created_at         timestamptz not null default now()
);

-- One invoice per business per month: final commissions + Promly's fee.
create table public.business_invoices (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses (id) on delete restrict,
  period_month       date not null check (extract(day from period_month) = 1),
  currency           text not null check (currency in ('NOK', 'EUR')),
  commission_minor   bigint not null check (commission_minor >= 0),
  fee_minor          bigint not null, -- net of fee credits from fraud clawbacks
  total_minor        bigint not null check (total_minor > 0),
  status             text not null default 'draft'
                       check (status in ('draft', 'open', 'paid', 'void', 'uncollectible')),
  stripe_invoice_id  text unique check (stripe_invoice_id ~ '^in_[A-Za-z0-9]+$'),
  hosted_invoice_url text check (hosted_invoice_url ~ '^https://'),
  due_at             timestamptz,
  finalized_at       timestamptz,
  paid_at            timestamptz,
  payment_failed_at  timestamptz,
  overdue_at         timestamptz,
  voided_at          timestamptz,
  created_at         timestamptz not null default now(),
  constraint business_invoices_total check (total_minor = commission_minor + fee_minor),
  constraint business_invoices_open_has_stripe check (status = 'draft' or stripe_invoice_id is not null)
);
create unique index business_invoices_one_per_month
  on public.business_invoices (business_id, period_month) where status <> 'void';
create index business_invoices_business_idx on public.business_invoices (business_id);

-- A line per booking ('booking': commission + fee), plus 'fee_credit' lines that
-- give a business back the fee of a booking reversed by a fraud clawback.
-- `active` turns false only if the invoice is voided, so the line can go on a
-- later invoice; at most one active line of each kind per booking.
create table public.invoice_lines (
  id               bigint generated always as identity primary key,
  invoice_id       uuid not null references public.business_invoices (id) on delete cascade,
  business_id      uuid not null references public.businesses (id) on delete restrict,
  booking_id       uuid not null references public.bookings (id) on delete restrict,
  promoter_id      uuid not null references public.profiles (id) on delete restrict,
  kind             text not null default 'booking' check (kind in ('booking', 'fee_credit')),
  commission_minor bigint not null,
  fee_minor        bigint not null,
  currency         text not null check (currency in ('NOK', 'EUR')),
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  constraint invoice_lines_amounts check (
    (kind = 'booking' and commission_minor >= 0 and fee_minor >= 0)
    or (kind = 'fee_credit' and commission_minor = 0 and fee_minor < 0))
);
create unique index invoice_lines_one_active_per_booking on public.invoice_lines (booking_id, kind) where active;
create index invoice_lines_invoice_idx on public.invoice_lines (invoice_id);
create index invoice_lines_promoter_idx on public.invoice_lines (promoter_id);

-- Campaigns Promly paused because an invoice is overdue (un-paused on payment).
create table public.billing_paused_campaigns (
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  invoice_id  uuid not null references public.business_invoices (id) on delete cascade,
  paused_at   timestamptz not null default now(),
  primary key (campaign_id, invoice_id)
);

-- Admin-only fraud clawback, with a required reason.
create table public.clawbacks (
  booking_id   uuid primary key references public.bookings (id) on delete restrict,
  admin_id     uuid not null references public.profiles (id) on delete restrict,
  reason       text not null check (char_length(btrim(reason)) between 10 and 1000),
  amount_minor bigint not null check (amount_minor > 0),
  -- The 2.75% fee to credit back on the business's next invoice (0 if the booking was never invoiced).
  fee_credit_minor bigint not null default 0 check (fee_credit_minor >= 0),
  currency     text not null check (currency in ('NOK', 'EUR')),
  created_at   timestamptz not null default now()
);

-- One transfer to a promoter per monthly run.
create table public.payouts (
  id                 uuid primary key default gen_random_uuid(),
  promoter_id        uuid not null references public.profiles (id) on delete restrict,
  stripe_account_id  text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  currency           text not null check (currency in ('NOK', 'EUR')),
  amount_minor       bigint not null check (amount_minor > 0),
  status             text not null default 'pending'
                       check (status in ('pending', 'transferred', 'failed', 'reversed')),
  idempotency_key    text not null unique check (char_length(idempotency_key) between 10 and 255),
  stripe_transfer_id text unique check (stripe_transfer_id ~ '^tr_[A-Za-z0-9]+$'),
  failure_reason     text check (char_length(failure_reason) <= 500),
  created_at         timestamptz not null default now(),
  transferred_at     timestamptz,
  failed_at          timestamptz,
  reversed_at        timestamptz,
  constraint payouts_transferred_has_id check (status <> 'transferred' or stripe_transfer_id is not null)
);
create index payouts_promoter_idx on public.payouts (promoter_id);

-- What a payout paid for. `active` turns false only if the transfer failed,
-- so the commission can be paid by a later run; never paid twice.
create table public.payout_items (
  id              bigint generated always as identity primary key,
  payout_id       uuid not null references public.payouts (id) on delete cascade,
  booking_id      uuid not null references public.bookings (id) on delete restrict,
  invoice_line_id bigint references public.invoice_lines (id) on delete restrict,
  kind            text not null check (kind in ('commission', 'clawback')),
  amount_minor    bigint not null,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint payout_items_sign check (
    (kind = 'commission' and amount_minor > 0 and invoice_line_id is not null)
    or (kind = 'clawback' and amount_minor < 0))
);
create unique index payout_items_once on public.payout_items (booking_id, kind) where active;
create index payout_items_payout_idx on public.payout_items (payout_id);

-- Stripe webhook events we have handled (dedupe; handlers are idempotent too).
create table public.stripe_events (
  id           text primary key check (id ~ '^evt_[A-Za-z0-9]+$'),
  type         text not null check (char_length(type) <= 100),
  received_at  timestamptz not null default now(),
  processed_at timestamptz
);

-- ===========================================================================
-- 3. Privileges and RLS (read through policies; all writes are server-only)
-- ===========================================================================
revoke all on public.promoter_age, public.stripe_accounts, public.stripe_customers,
  public.business_invoices, public.invoice_lines, public.billing_paused_campaigns,
  public.clawbacks, public.payouts, public.payout_items, public.stripe_events
  from anon, authenticated;

grant select on public.promoter_age, public.stripe_accounts, public.stripe_customers,
  public.business_invoices, public.invoice_lines, public.billing_paused_campaigns,
  public.clawbacks, public.payouts, public.payout_items
  to authenticated;
-- stripe_events: no access for anyone but the server.

alter table public.promoter_age             enable row level security;
alter table public.stripe_accounts          enable row level security;
alter table public.stripe_customers         enable row level security;
alter table public.business_invoices        enable row level security;
alter table public.invoice_lines            enable row level security;
alter table public.billing_paused_campaigns enable row level security;
alter table public.clawbacks                enable row level security;
alter table public.payouts                  enable row level security;
alter table public.payout_items             enable row level security;
alter table public.stripe_events            enable row level security;

create policy "promoter_age: own" on public.promoter_age
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "stripe_accounts: own" on public.stripe_accounts
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "stripe_customers: business owner" on public.stripe_customers
  for select to authenticated using (public.is_business_owner(business_id));
create policy "business_invoices: business owner" on public.business_invoices
  for select to authenticated using (public.is_business_owner(business_id));
create policy "invoice_lines: business owner or the line's promoter" on public.invoice_lines
  for select to authenticated
  using (public.is_business_owner(business_id) or promoter_id = (select auth.uid()));
create policy "billing_paused_campaigns: campaign owner" on public.billing_paused_campaigns
  for select to authenticated using (public.owns_campaign(campaign_id));
create policy "clawbacks: for bookings I can see" on public.clawbacks
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = clawbacks.booking_id));
create policy "payouts: own" on public.payouts
  for select to authenticated using (promoter_id = (select auth.uid()));
create policy "payout_items: of my payouts" on public.payout_items
  for select to authenticated
  using (exists (select 1 from public.payouts p where p.id = payout_items.payout_id));

-- ===========================================================================
-- 4. Agreement template v2 (rule 7). Unchanged unless the server asks for v2.
-- ===========================================================================
create or replace function public.agreements_before_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.version := (select coalesce(max(a.version), 0) + 1
                    from public.agreements a where a.campaign_id = new.campaign_id);
    if new.template_version is distinct from 'promly-standard-v2' then
      new.template_version := 'promly-standard-v1';
    end if;
  else
    if old.business_accepted_at is not null then
      raise exception 'agreement_is_accepted_and_cannot_change';
    end if;
    new.campaign_id := old.campaign_id;
    new.version := old.version;
    new.template_version := old.template_version;
  end if;
  if new.business_accepted_at is not null then
    new.business_accepted_at := now();
  end if;
  return new;
end $$;

grant insert (template_version) on public.agreements to authenticated;

-- ===========================================================================
-- 5. Billing hold: an overdue invoice blocks (re)publishing the business's campaigns.
--    A new trigger; it can only fire once an overdue invoice exists.
-- ===========================================================================
create function public.campaigns_billing_hold()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.business_invoices i
             where i.business_id = new.business_id and i.status = 'open' and i.overdue_at is not null) then
    raise exception 'billing_overdue';
  end if;
  return new;
end $$;

create trigger campaigns_billing_hold
  before insert or update of status on public.campaigns
  for each row when (new.status = 'published')
  execute function public.campaigns_billing_hold();

-- ===========================================================================
-- 5b. Age ratings: campaigns are 16+ or 18+ (default 18+, so every existing
--     campaign becomes 18+). Age-restricted categories and campaigns are always 18+.
--     16-17 promoters only see and join 16+ campaigns (RLS + join trigger).
-- ===========================================================================
alter table public.businesses
  drop constraint businesses_category_check,
  add constraint businesses_category_check check (category in (
    'barbershop', 'beauty', 'restaurant', 'experience', 'water_sports',
    'jet_ski', 'boat_tour', 'fitness', 'other',
    'nightlife', 'club', 'alcohol'));

create function public.is_age_restricted_category(p_category text)
returns boolean language sql immutable set search_path = '' as $$
  select p_category in ('nightlife', 'club', 'alcohol');
$$;

alter table public.campaigns
  add column age_rating     text not null default '18+' check (age_rating in ('16+', '18+')),
  add column age_restricted boolean not null default false;

grant insert (age_rating, age_restricted) on public.campaigns to authenticated;
grant update (age_rating, age_restricted) on public.campaigns to authenticated;

create function public.promoter_is_minor(p_profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.promoter_age pa
                 where pa.profile_id = p_profile_id and pa.age_band = '16-17');
$$;

-- Can the logged-in user see a campaign with this rating? Only 16-17 promoters are limited.
create function public.can_see_age_rating(p_age_rating text)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_age_rating = '16+' or not public.promoter_is_minor((select auth.uid()));
$$;

create function public.campaigns_age_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_category text;
begin
  if tg_op = 'UPDATE' and old.age_restricted and not new.age_restricted then
    raise exception 'age_restriction_cannot_be_removed';
  end if;
  select b.category into v_category from public.businesses b where b.id = new.business_id;
  if (new.age_restricted or public.is_age_restricted_category(v_category)) and new.age_rating <> '18+' then
    raise exception 'age_restricted_campaign_is_18_plus';
  end if;
  if tg_op = 'UPDATE' and old.age_rating = '16+' and new.age_rating = '18+'
     and exists (select 1 from public.campaign_memberships m
                 join public.promoter_age pa on pa.profile_id = m.promoter_id
                 where m.campaign_id = new.id and pa.age_band = '16-17') then
    raise exception 'minor_promoters_joined';
  end if;
  return new;
end $$;

create trigger campaigns_age_rating
  before insert or update of age_rating, age_restricted on public.campaigns
  for each row execute function public.campaigns_age_rating();

-- A business can't move to an age-restricted category while it has 16+ campaigns.
create function public.businesses_age_category()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_age_restricted_category(new.category)
     and exists (select 1 from public.campaigns c where c.business_id = new.id and c.age_rating = '16+') then
    raise exception 'campaigns_rated_16_plus';
  end if;
  return new;
end $$;

create trigger businesses_age_category
  before update of category on public.businesses
  for each row execute function public.businesses_age_category();

-- Visibility: same rule as before, except 16-17 promoters don't see 18+ campaigns.
alter policy "campaigns: published, own, or joined" on public.campaigns
  using ((status = 'published' and public.can_see_age_rating(age_rating))
         or public.is_business_owner(business_id)
         or public.is_campaign_member(id));

-- Campaign photos follow the same rule (unchanged for everyone except 16-17 promoters).
create or replace function public.is_published_campaign(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaigns c
                 where c.id = p_campaign_id and c.status = 'published'
                   and public.can_see_age_rating(c.age_rating));
$$;

-- Joining: same as before (Jakob's version), plus the age rules for 16-17 promoters:
-- 16+ campaigns only, and only once a parent/guardian holds the payout account and consented.
create or replace function public.memberships_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.agreements a
                 where a.id = new.agreement_id and a.campaign_id = new.campaign_id
                   and a.business_accepted_at is not null) then
    raise exception 'invalid_agreement_for_campaign';
  end if;
  if exists (select 1 from public.campaigns c join public.businesses b on b.id = c.business_id
             where c.id = new.campaign_id and b.owner_id = new.promoter_id) then
    raise exception 'cannot_promote_own_business';
  end if;
  if public.promoter_is_minor(new.promoter_id) then
    if (select c.age_rating from public.campaigns c where c.id = new.campaign_id) <> '16+' then
      raise exception 'campaign_is_18_plus';
    end if;
    if not exists (select 1 from public.stripe_accounts s
                   where s.profile_id = new.promoter_id and s.holder = 'guardian'
                     and s.guardian_consent_at is not null and s.payouts_enabled) then
      raise exception 'guardian_payout_account_required';
    end if;
  end if;
  new.promoter_accepted_at := now();
  return new;
end $$;

-- ===========================================================================
-- 6. Server-only money functions
-- ===========================================================================

-- Age band (rule 6). The acting promoter confirms "16-17" or "18+". Under 16 can't use Promly.
-- It can go up (a 16-17 promoter turns 18), never down.
create function public.set_age_band(p_actor_id uuid, p_age_band text)
returns void language plpgsql set search_path = '' as $$
begin
  if p_age_band is null or p_age_band not in ('16-17', '18+') then
    raise exception 'invalid_age_band';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_actor_id and p.role = 'promoter') then
    raise exception 'not_a_promoter';
  end if;
  if p_age_band = '16-17' and exists (select 1 from public.promoter_age pa
                                      where pa.profile_id = p_actor_id and pa.age_band = '18+') then
    raise exception 'age_band_cannot_go_down';
  end if;
  insert into public.promoter_age (profile_id, age_band) values (p_actor_id, p_age_band)
  on conflict (profile_id) do update set age_band = excluded.age_band, confirmed_at = now();
end $$;

-- Payout account (rules 5 + 6): 18+ promoters use their own Stripe account; a 16-17
-- promoter's account is held by a parent/guardian who confirmed consent.
-- Status updates come from account.updated.
create function public.save_stripe_account(p_profile_id uuid, p_stripe_account_id text, p_payouts_enabled boolean,
                                           p_holder text, p_guardian_consent_at timestamptz)
returns public.stripe_accounts language plpgsql set search_path = '' as $$
declare
  v      public.stripe_accounts;
  v_band text;
begin
  if not exists (select 1 from public.profiles p where p.id = p_profile_id and p.role = 'promoter') then
    raise exception 'not_a_promoter';
  end if;
  select pa.age_band into v_band from public.promoter_age pa where pa.profile_id = p_profile_id;
  if v_band is null then
    raise exception 'age_band_required';
  end if;
  if v_band = '18+' and p_holder is distinct from 'self' then
    raise exception 'adult_uses_own_account';
  end if;
  if v_band = '16-17' and (p_holder is distinct from 'guardian' or p_guardian_consent_at is null) then
    raise exception 'guardian_consent_required';
  end if;
  insert into public.stripe_accounts (profile_id, stripe_account_id, payouts_enabled, holder, guardian_consent_at)
  values (p_profile_id, p_stripe_account_id, coalesce(p_payouts_enabled, false), p_holder,
          case when p_holder = 'guardian' then p_guardian_consent_at end)
  on conflict (profile_id) do update
    set payouts_enabled = excluded.payouts_enabled, updated_at = now()
    where public.stripe_accounts.stripe_account_id = excluded.stripe_account_id
  returning * into v;
  if not found then
    raise exception 'stripe_account_mismatch'; -- a different Stripe account is already linked
  end if;
  return v;
end $$;

create function public.update_stripe_account_status(p_stripe_account_id text, p_payouts_enabled boolean)
returns void language sql set search_path = '' as $$
  update public.stripe_accounts
  set payouts_enabled = coalesce(p_payouts_enabled, false), updated_at = now()
  where stripe_account_id = p_stripe_account_id;
$$;

create function public.save_stripe_customer(p_business_id uuid, p_stripe_customer_id text)
returns void language sql set search_path = '' as $$
  insert into public.stripe_customers (business_id, stripe_customer_id)
  values (p_business_id, p_stripe_customer_id)
  on conflict (business_id) do nothing;
$$;

-- Internal: mark one verified booking final, releasing its ledger balance if needed.
create function public._finalize_booking(p_booking public.bookings)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
begin
  update public.bookings set final_at = now() where id = p_booking.id and final_at is null
  returning * into v;
  if not found then
    select * into v from public.bookings where id = p_booking.id;
    return v;
  end if;
  if v.released_at is null then
    v := public._release_booking(v);
  end if;
  return v;
end $$;

-- Daily job: commission becomes final 14 days after verification (rule 2). Idempotent.
create function public.finalize_due_bookings()
returns int language plpgsql set search_path = '' as $$
declare
  r public.bookings;
  n int := 0;
begin
  for r in
    select * from public.bookings
    where status = 'verified' and final_at is null
      and verified_at + make_interval(days => public.final_after_days()) <= now()
    for update skip locked
  loop
    perform public._finalize_booking(r);
    n := n + 1;
  end loop;
  return n;
end $$;

-- Demo Mode only (the server checks DEMO_MODE): "Simulate end of 14-day holding period".
create function public.simulate_end_of_holding_period(p_booking_id uuid, p_actor_id uuid)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
begin
  v := public._lock_booking_for_owner(p_booking_id, p_actor_id);
  if v.final_at is not null then
    return v;
  end if;
  if v.status <> 'verified' then
    raise exception 'booking_not_verified';
  end if;
  return public._finalize_booking(v);
end $$;

-- Refund inside the 14 days (rule 2): reverses commission AND fee with new rows. Idempotent.
create function public.refund_booking_before_final(p_booking_id uuid, p_actor_id uuid)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
  r record;
begin
  v := public._lock_booking_for_owner(p_booking_id, p_actor_id);
  if v.status = 'refunded' then
    return v;
  end if;
  if v.status = 'cancelled' then
    raise exception 'booking_cancelled';
  end if;
  if v.final_at is not null
     or (v.status = 'verified' and v.verified_at + make_interval(days => public.final_after_days()) <= now()) then
    raise exception 'commission_is_final';
  end if;
  if exists (select 1 from public.invoice_lines l where l.booking_id = v.id and l.active) then
    raise exception 'already_invoiced';
  end if;

  for r in
    select account, party_id, bucket, sum(amount_minor) as balance
    from public.ledger_entries
    where booking_id = v.id
    group by account, party_id, bucket
    having sum(amount_minor) <> 0
  loop
    insert into public.ledger_entries (booking_id, account, party_id, bucket, entry_type, amount_minor, currency)
    values (v.id, r.account, r.party_id, r.bucket, 'reversal', -r.balance, v.currency);
  end loop;

  update public.bookings set status = 'refunded', refunded_at = now()
  where id = v.id returning * into v;

  insert into public.notifications (user_id, type, title, payload)
  values (v.promoter_id, 'booking_refunded', 'A booking was refunded — commission reversed.',
          jsonb_build_object('booking_id', v.id));
  return v;
end $$;

-- Daily job: a service not verified within 7 days of the appointment counts as cancelled (rule 4).
create function public.cancel_unverified_bookings()
returns int language plpgsql set search_path = '' as $$
declare
  r public.bookings;
  n int := 0;
begin
  for r in
    update public.bookings set status = 'cancelled'
    where status = 'pending' and coalesce(slot_start, created_at) + interval '7 days' < now()
    returning *
  loop
    insert into public.notifications (user_id, type, title, payload)
    values (r.promoter_id, 'booking_cancelled', 'A booking wasn''t verified within 7 days and was cancelled.',
            jsonb_build_object('booking_id', r.id));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Monthly run, step 1: draft invoice with a line per final, not-yet-invoiced booking.
-- Returns the draft id (also an earlier draft that still needs its Stripe invoice), or null.
create function public.create_invoice_draft(p_business_id uuid, p_period_month date)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_existing public.business_invoices;
  v_currency text;
  v_id       uuid;
  v_comm     bigint;
  v_fee      bigint;
begin
  if p_period_month is null or extract(day from p_period_month) <> 1 then
    raise exception 'invalid_period_month';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('promly-invoice:' || p_business_id::text, 0));

  select * into v_existing from public.business_invoices
  where business_id = p_business_id and period_month = p_period_month and status <> 'void';
  if found then
    return case when v_existing.status = 'draft' then v_existing.id else null end;
  end if;

  select currency into v_currency from public.businesses where id = p_business_id;
  if v_currency is null then
    raise exception 'business_not_found';
  end if;

  -- Charges: final, not yet invoiced, not clawed back.
  select coalesce(sum(b.commission_minor), 0), coalesce(sum(b.fee_minor), 0)
  into v_comm, v_fee
  from public.bookings b
  where b.business_id = p_business_id and b.status = 'verified' and b.final_at is not null
    and not exists (select 1 from public.invoice_lines l where l.booking_id = b.id and l.kind = 'booking' and l.active)
    and not exists (select 1 from public.clawbacks c where c.booking_id = b.id);
  -- Credits: the fee of clawed-back bookings that were invoiced before (not yet credited).
  select v_fee - coalesce(sum(c.fee_credit_minor), 0) into v_fee
  from public.clawbacks c join public.bookings b on b.id = c.booking_id
  where b.business_id = p_business_id and c.fee_credit_minor > 0
    and not exists (select 1 from public.invoice_lines l where l.booking_id = c.booking_id and l.kind = 'fee_credit' and l.active);
  if v_comm + v_fee <= 0 then
    return null; -- nothing to charge (or credits exceed charges): carry over to a later month
  end if;

  insert into public.business_invoices (business_id, period_month, currency, commission_minor, fee_minor, total_minor)
  values (p_business_id, p_period_month, v_currency, v_comm, v_fee, v_comm + v_fee)
  returning id into v_id;

  insert into public.invoice_lines (invoice_id, business_id, booking_id, promoter_id, kind, commission_minor, fee_minor, currency)
  select v_id, b.business_id, b.id, b.promoter_id, 'booking', b.commission_minor, b.fee_minor, b.currency
  from public.bookings b
  where b.business_id = p_business_id and b.status = 'verified' and b.final_at is not null
    and not exists (select 1 from public.invoice_lines l where l.booking_id = b.id and l.kind = 'booking' and l.active)
    and not exists (select 1 from public.clawbacks c where c.booking_id = b.id);

  insert into public.invoice_lines (invoice_id, business_id, booking_id, promoter_id, kind, commission_minor, fee_minor, currency)
  select v_id, b.business_id, b.id, b.promoter_id, 'fee_credit', 0, -c.fee_credit_minor, c.currency
  from public.clawbacks c join public.bookings b on b.id = c.booking_id
  where b.business_id = p_business_id and c.fee_credit_minor > 0
    and not exists (select 1 from public.invoice_lines l where l.booking_id = c.booking_id and l.kind = 'fee_credit' and l.active);

  return v_id;
end $$;

-- Monthly run, step 2: the Stripe invoice was created and finalized.
create function public.attach_stripe_invoice(p_invoice_id uuid, p_stripe_invoice_id text,
                                             p_hosted_invoice_url text, p_due_at timestamptz)
returns public.business_invoices language plpgsql set search_path = '' as $$
declare
  v public.business_invoices;
  v_owner uuid;
begin
  select * into v from public.business_invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'invoice_not_found';
  end if;
  if v.status <> 'draft' then
    if v.stripe_invoice_id = p_stripe_invoice_id then
      return v; -- already attached
    end if;
    raise exception 'invoice_not_draft';
  end if;

  update public.business_invoices
  set status = 'open', stripe_invoice_id = p_stripe_invoice_id, hosted_invoice_url = p_hosted_invoice_url,
      due_at = p_due_at, finalized_at = now()
  where id = v.id returning * into v;

  select b.owner_id into v_owner from public.businesses b where b.id = v.business_id;
  insert into public.notifications (user_id, type, title, payload)
  values (v_owner, 'invoice_created', 'Your Promly invoice is ready.',
          jsonb_build_object('invoice_id', v.id, 'amount_minor', v.total_minor, 'currency', v.currency));
  return v;
end $$;

-- Internal: un-pause campaigns paused for billing, once nothing is overdue any more.
create function public._release_billing_hold(p_business_id uuid)
returns void language plpgsql set search_path = '' as $$
begin
  if exists (select 1 from public.business_invoices i
             where i.business_id = p_business_id and i.status = 'open' and i.overdue_at is not null) then
    return;
  end if;
  update public.campaigns c set status = 'published'
  where c.status = 'paused'
    and c.id in (select bp.campaign_id from public.billing_paused_campaigns bp
                 join public.business_invoices i on i.id = bp.invoice_id
                 where i.business_id = p_business_id);
  delete from public.billing_paused_campaigns bp
  using public.business_invoices i
  where i.id = bp.invoice_id and i.business_id = p_business_id;
end $$;

-- Webhook invoice.paid (ONLY the verified webhook calls this). Idempotent.
create function public.mark_invoice_paid(p_stripe_invoice_id text, p_paid_at timestamptz)
returns public.business_invoices language plpgsql set search_path = '' as $$
declare
  v public.business_invoices;
  v_owner uuid;
begin
  select * into v from public.business_invoices where stripe_invoice_id = p_stripe_invoice_id for update;
  if not found then
    raise exception 'invoice_not_found';
  end if;
  if v.status = 'paid' then
    return v;
  end if;
  if v.status not in ('open', 'uncollectible') then
    raise exception 'invoice_not_payable';
  end if;

  update public.business_invoices set status = 'paid', paid_at = coalesce(p_paid_at, now())
  where id = v.id returning * into v;
  perform public._release_billing_hold(v.business_id);

  select b.owner_id into v_owner from public.businesses b where b.id = v.business_id;
  insert into public.notifications (user_id, type, title, payload)
  values (v_owner, 'invoice_paid', 'Thanks — your Promly invoice is paid.',
          jsonb_build_object('invoice_id', v.id));
  return v;
end $$;

-- Webhook invoice.payment_failed: record it; the invoice stays open.
create function public.mark_invoice_payment_failed(p_stripe_invoice_id text)
returns void language sql set search_path = '' as $$
  update public.business_invoices set payment_failed_at = now()
  where stripe_invoice_id = p_stripe_invoice_id and status = 'open';
$$;

-- Webhook invoice.overdue: pause the business's published campaigns (rule 4). Idempotent.
create function public.mark_invoice_overdue(p_stripe_invoice_id text)
returns public.business_invoices language plpgsql set search_path = '' as $$
declare
  v public.business_invoices;
  v_owner uuid;
begin
  select * into v from public.business_invoices where stripe_invoice_id = p_stripe_invoice_id for update;
  if not found then
    raise exception 'invoice_not_found';
  end if;
  if v.status <> 'open' or v.overdue_at is not null then
    return v;
  end if;
  if v.due_at is null or v.due_at > now() then
    raise exception 'invoice_not_due';
  end if;

  update public.business_invoices set overdue_at = now() where id = v.id returning * into v;

  insert into public.billing_paused_campaigns (campaign_id, invoice_id)
  select c.id, v.id from public.campaigns c
  where c.business_id = v.business_id and c.status = 'published'
  on conflict do nothing;
  update public.campaigns set status = 'paused'
  where business_id = v.business_id and status = 'published';

  select b.owner_id into v_owner from public.businesses b where b.id = v.business_id;
  insert into public.notifications (user_id, type, title, payload)
  values (v_owner, 'invoice_overdue', 'Your Promly invoice is overdue — campaigns are paused until it''s paid.',
          jsonb_build_object('invoice_id', v.id));
  return v;
end $$;

-- Webhook invoice.voided: lines become invoiceable again. Idempotent.
create function public.mark_invoice_voided(p_stripe_invoice_id text)
returns void language plpgsql set search_path = '' as $$
declare
  v public.business_invoices;
begin
  select * into v from public.business_invoices where stripe_invoice_id = p_stripe_invoice_id for update;
  if not found or v.status = 'void' then
    return;
  end if;
  if v.status = 'paid' then
    raise exception 'invoice_already_paid';
  end if;
  update public.business_invoices set status = 'void', voided_at = now() where id = v.id;
  update public.invoice_lines set active = false where invoice_id = v.id;
  perform public._release_billing_hold(v.business_id);
end $$;

-- Webhook dedupe: true if this event still needs handling.
create function public.begin_stripe_event(p_event_id text, p_type text)
returns boolean language plpgsql set search_path = '' as $$
declare
  v public.stripe_events;
begin
  insert into public.stripe_events (id, type) values (p_event_id, p_type)
  on conflict (id) do nothing;
  select * into v from public.stripe_events where id = p_event_id;
  return v.processed_at is null;
end $$;

create function public.finish_stripe_event(p_event_id text)
returns void language sql set search_path = '' as $$
  update public.stripe_events set processed_at = now() where id = p_event_id and processed_at is null;
$$;

-- Admin-only fraud clawback (rule 2). Reverses the promoter's commission with
-- new ledger rows (the business gets the credit); the reason is required.
-- If the commission was already paid out, the next payout run nets it off.
create function public.fraud_clawback(p_booking_id uuid, p_admin_id uuid, p_reason text)
returns public.clawbacks language plpgsql set search_path = '' as $$
declare
  v  public.bookings;
  c  public.clawbacks;
  r  record;
begin
  if not exists (select 1 from public.profiles p where p.id = p_admin_id and p.role = 'admin') then
    raise exception 'admin_only';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) < 10 then
    raise exception 'reason_required';
  end if;
  select * into v from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;
  select * into c from public.clawbacks where booking_id = v.id;
  if found then
    return c;
  end if;
  if v.status <> 'verified' then
    raise exception 'booking_not_verified';
  end if;

  for r in
    select bucket, sum(amount_minor) as balance
    from public.ledger_entries
    where booking_id = v.id and account = 'promoter'
    group by bucket
    having sum(amount_minor) <> 0
  loop
    insert into public.ledger_entries (booking_id, account, party_id, bucket, entry_type, amount_minor, currency)
    values (v.id, 'promoter', v.promoter_id, r.bucket, 'clawback', -r.balance, v.currency),
           (v.id, 'business', v.business_id, r.bucket, 'clawback',  r.balance, v.currency);
  end loop;

  -- If the booking was already invoiced, its 2.75% fee is credited on the business's next invoice.
  insert into public.clawbacks (booking_id, admin_id, reason, amount_minor, fee_credit_minor, currency)
  values (v.id, p_admin_id, btrim(p_reason), v.commission_minor,
          case when exists (select 1 from public.invoice_lines l
                            join public.business_invoices i on i.id = l.invoice_id
                            where l.booking_id = v.id and l.kind = 'booking' and l.active
                              and i.status in ('open', 'paid', 'uncollectible'))
               then v.fee_minor else 0 end,
          v.currency)
  returning * into c;

  insert into public.notifications (user_id, type, title, payload)
  values (v.promoter_id, 'clawback', 'A commission was reversed after a fraud review.',
          jsonb_build_object('booking_id', v.id));
  return c;
end $$;

-- Everything payable to one promoter in one currency right now:
-- commission on lines of PAID invoices not yet paid out (and not clawed back),
-- minus clawbacks of commission that was already paid out.
create function public._payable_items(p_promoter_id uuid, p_currency text)
returns table (booking_id uuid, invoice_line_id bigint, kind text, amount_minor bigint)
language sql stable set search_path = '' as $$
  select l.booking_id, l.id, 'commission'::text, l.commission_minor
  from public.invoice_lines l
  join public.business_invoices i on i.id = l.invoice_id
  where l.promoter_id = p_promoter_id and l.currency = p_currency and l.active and l.kind = 'booking'
    and i.status = 'paid' and l.commission_minor > 0
    and not exists (select 1 from public.payout_items pi
                    where pi.booking_id = l.booking_id and pi.kind = 'commission' and pi.active)
    and not exists (select 1 from public.clawbacks c where c.booking_id = l.booking_id)
  union all
  select c.booking_id, null::bigint, 'clawback'::text, -c.amount_minor
  from public.clawbacks c
  join public.bookings b on b.id = c.booking_id
  where b.promoter_id = p_promoter_id and c.currency = p_currency
    and exists (select 1 from public.payout_items pi
                where pi.booking_id = c.booking_id and pi.kind = 'commission' and pi.active)
    and not exists (select 1 from public.payout_items pi
                    where pi.booking_id = c.booking_id and pi.kind = 'clawback' and pi.active);
$$;

-- Payout run, step 1: reserve everything payable to one promoter in one currency.
-- Only commission from PAID invoices (rule 1 + 5), never twice, minus clawbacks of
-- commission already paid out. Returns the payout id (an existing pending one is
-- returned for a retry with the same idempotency key), or null if nothing is due.
create function public.prepare_payout(p_promoter_id uuid, p_currency text, p_run_key text)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_account public.stripe_accounts;
  v_pending uuid;
  v_total   bigint;
  v_key     text;
  v_id      uuid;
begin
  if p_run_key is null or char_length(p_run_key) not between 3 and 64 then
    raise exception 'invalid_run_key';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('promly-payout:' || p_promoter_id::text, 0));

  select * into v_account from public.stripe_accounts where profile_id = p_promoter_id;
  if not found or not v_account.payouts_enabled then
    return null;
  end if;

  select id into v_pending from public.payouts
  where promoter_id = p_promoter_id and currency = p_currency and status = 'pending';
  if found then
    return v_pending;
  end if;

  select coalesce(sum(d.amount_minor), 0) into v_total
  from public._payable_items(p_promoter_id, p_currency) d;
  if v_total <= 0 then
    return null; -- nothing due (or clawbacks still exceed new commission): carry over
  end if;

  v_key := 'promly-payout-' || p_run_key || '-' || p_promoter_id::text || '-' || lower(p_currency);
  insert into public.payouts (promoter_id, stripe_account_id, currency, amount_minor, idempotency_key)
  values (p_promoter_id, v_account.stripe_account_id, p_currency, v_total, v_key)
  on conflict (idempotency_key) do nothing
  returning id into v_id;
  if v_id is null then
    return null; -- this run already handled this promoter
  end if;

  -- Same transaction and advisory lock as the total above, so the items match it.
  insert into public.payout_items (payout_id, booking_id, invoice_line_id, kind, amount_minor)
  select v_id, d.booking_id, d.invoice_line_id, d.kind, d.amount_minor
  from public._payable_items(p_promoter_id, p_currency) d;
  return v_id;
end $$;

-- Payout run, step 2: Stripe accepted the transfer.
create function public.mark_payout_transferred(p_payout_id uuid, p_stripe_transfer_id text)
returns public.payouts language plpgsql set search_path = '' as $$
declare
  v public.payouts;
begin
  select * into v from public.payouts where id = p_payout_id for update;
  if not found then
    raise exception 'payout_not_found';
  end if;
  if v.status = 'transferred' then
    return v;
  end if;
  if v.status <> 'pending' then
    raise exception 'payout_not_pending';
  end if;
  update public.payouts set status = 'transferred', stripe_transfer_id = p_stripe_transfer_id, transferred_at = now()
  where id = v.id returning * into v;

  insert into public.notifications (user_id, type, title, payload)
  values (v.promoter_id, 'payout_sent', 'Paid out to your Stripe account.',
          jsonb_build_object('payout_id', v.id, 'amount_minor', v.amount_minor, 'currency', v.currency));
  return v;
end $$;

-- Payout run, step 2 (failure): free the items so a later run can pay them.
create function public.mark_payout_failed(p_payout_id uuid, p_reason text)
returns void language plpgsql set search_path = '' as $$
begin
  update public.payouts set status = 'failed', failed_at = now(), failure_reason = left(p_reason, 500)
  where id = p_payout_id and status = 'pending';
  if found then
    update public.payout_items set active = false where payout_id = p_payout_id;
  end if;
end $$;

-- Webhook transfer.reversed: record it. Items stay active (never re-paid automatically).
create function public.mark_payout_reversed(p_stripe_transfer_id text)
returns void language sql set search_path = '' as $$
  update public.payouts set status = 'reversed', reversed_at = now()
  where stripe_transfer_id = p_stripe_transfer_id and status = 'transferred';
$$;

-- ===========================================================================
-- 7. Settlement status per booking (server-only view; rule 3)
-- ===========================================================================
create view public.booking_settlement as
select
  b.id as booking_id, b.business_id, b.promoter_id, b.currency,
  b.commission_minor, b.fee_minor, b.business_total_minor,
  b.status as booking_status, b.verified_at,
  b.verified_at + make_interval(days => public.final_after_days()) as final_due_at,
  b.final_at,
  l.invoice_id, i.finalized_at as invoiced_at, i.due_at, i.paid_at, i.overdue_at,
  po.id as payout_id, po.transferred_at as paid_out_at,
  (cb.booking_id is not null) as clawed_back,
  case
    when b.status = 'refunded' then 'refunded'
    when b.status = 'cancelled' then 'cancelled'
    when cb.booking_id is not null then 'clawed_back'
    when po.transferred_at is not null then 'paid_out'
    when i.status = 'paid' then 'paid_by_business'
    when i.status = 'open' and i.overdue_at is not null then 'awaiting_business_payment'
    when i.status = 'open' then 'invoiced'
    when b.final_at is not null then 'final'
    when b.status = 'verified' then 'pending'
    else 'not_verified'
  end as settlement_status
from public.bookings b
left join public.invoice_lines l on l.booking_id = b.id and l.kind = 'booking' and l.active
left join public.business_invoices i on i.id = l.invoice_id
left join lateral (
  select p.id, p.transferred_at
  from public.payout_items pi join public.payouts p on p.id = pi.payout_id
  where pi.booking_id = b.id and pi.kind = 'commission' and pi.active and p.status in ('transferred', 'reversed')
  order by p.transferred_at desc nulls last
  limit 1
) po on true
left join public.clawbacks cb on cb.booking_id = b.id;

revoke all on public.booking_settlement from anon, authenticated;
grant select on public.booking_settlement to service_role;

-- ===========================================================================
-- 8. Demo purge: clear demo invoices and payouts first, then the old body unchanged.
-- ===========================================================================
create or replace function public.purge_demo_data()
returns void language plpgsql set search_path = '' as $$
begin
  -- Payments data that belongs to demo bookings / demo promoters (none exists before payments).
  delete from public.payouts p
  where p.promoter_id in (select pr.id from public.profiles pr where pr.is_demo)
     or exists (select 1 from public.payout_items pi
                join public.bookings bk on bk.id = pi.booking_id
                join public.businesses b on b.id = bk.business_id
                where pi.payout_id = p.id and b.is_demo);
  delete from public.clawbacks c
  using public.bookings bk, public.businesses b
  where bk.id = c.booking_id and b.id = bk.business_id and b.is_demo;
  delete from public.business_invoices i
  using public.businesses b
  where b.id = i.business_id and b.is_demo; -- cascades to invoice_lines and billing pauses

  -- Unchanged from before:
  perform set_config('promly.allow_ledger_purge', 'on', true);
  delete from public.ledger_entries
  where booking_id in (select bk.id from public.bookings bk
                       join public.businesses b on b.id = bk.business_id
                       where b.is_demo);
  perform set_config('promly.allow_ledger_purge', 'off', true);
  delete from public.notifications
  where user_id in (select p.id from public.profiles p where p.is_demo);
  delete from public.businesses where is_demo; -- cascades to campaigns, bookings, links, ...
end $$;

-- ===========================================================================
-- 9. Lock the new functions down: server (service role) only.
-- ===========================================================================
revoke execute on function
  public.final_after_days(),
  public.set_age_band(uuid, text),
  public.promoter_is_minor(uuid),
  public.is_age_restricted_category(text),
  public.save_stripe_account(uuid, text, boolean, text, timestamptz),
  public.update_stripe_account_status(text, boolean),
  public.save_stripe_customer(uuid, text),
  public._finalize_booking(public.bookings),
  public.finalize_due_bookings(),
  public.simulate_end_of_holding_period(uuid, uuid),
  public.refund_booking_before_final(uuid, uuid),
  public.cancel_unverified_bookings(),
  public.create_invoice_draft(uuid, date),
  public.attach_stripe_invoice(uuid, text, text, timestamptz),
  public._release_billing_hold(uuid),
  public.mark_invoice_paid(text, timestamptz),
  public.mark_invoice_payment_failed(text),
  public.mark_invoice_overdue(text),
  public.mark_invoice_voided(text),
  public.begin_stripe_event(text, text),
  public.finish_stripe_event(text),
  public.fraud_clawback(uuid, uuid, text),
  public._payable_items(uuid, text),
  public.prepare_payout(uuid, text, text),
  public.mark_payout_transferred(uuid, text),
  public.mark_payout_failed(uuid, text),
  public.mark_payout_reversed(text),
  public.campaigns_billing_hold(),
  public.campaigns_age_rating(),
  public.businesses_age_category()
from public, anon, authenticated;

grant execute on function
  public.final_after_days(),
  public.set_age_band(uuid, text),
  public.promoter_is_minor(uuid),
  public.is_age_restricted_category(text),
  public.save_stripe_account(uuid, text, boolean, text, timestamptz),
  public.update_stripe_account_status(text, boolean),
  public.save_stripe_customer(uuid, text),
  public._finalize_booking(public.bookings),
  public.finalize_due_bookings(),
  public.simulate_end_of_holding_period(uuid, uuid),
  public.refund_booking_before_final(uuid, uuid),
  public.cancel_unverified_bookings(),
  public.create_invoice_draft(uuid, date),
  public.attach_stripe_invoice(uuid, text, text, timestamptz),
  public._release_billing_hold(uuid),
  public.mark_invoice_paid(text, timestamptz),
  public.mark_invoice_payment_failed(text),
  public.mark_invoice_overdue(text),
  public.mark_invoice_voided(text),
  public.begin_stripe_event(text, text),
  public.finish_stripe_event(text),
  public.fraud_clawback(uuid, uuid, text),
  public._payable_items(uuid, text),
  public.prepare_payout(uuid, text, text),
  public.mark_payout_transferred(uuid, text),
  public.mark_payout_failed(uuid, text),
  public.mark_payout_reversed(text)
to service_role;

-- ===========================================================================
-- 10. Realtime: invoice and payout changes reach the right user through RLS.
-- ===========================================================================
alter publication supabase_realtime add table public.business_invoices, public.payouts;

-- The campaign visibility policy calls this as the logged-in user.
revoke execute on function public.can_see_age_rating(text) from public;
grant execute on function public.can_see_age_rating(text) to anon, authenticated, service_role;
