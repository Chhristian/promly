-- External booking: businesses with their own booking system.
--
-- * campaigns.external_booking_url: optional. When set, /book/<code> collects
--   name + phone (with consent), stores a PENDING booking attributed to the
--   promoter, and sends the customer on to the business URL with ?ref=<code>.
-- * referral_links.discount_code: a readable backup code per promoter per
--   campaign (e.g. ALEX-7K3Q) the business can register by hand.
-- * bookings.source: 'promly' (time slot), 'external' or 'discount_code'.
--   External and discount-code bookings have no time slot.
-- * Terms are frozen exactly like create_booking; verify / release / refund
--   and the ledger are unchanged.
-- * Duplicate guard (external + discount code only): one active booking per
--   phone number per campaign. The time-slot flow is unchanged.
-- * Self-referral: a business owner can't join their own campaign. (The
--   logged-in-promoter check lives in the server actions.)

-- ---------------------------------------------------------------------------
-- campaigns.external_booking_url
-- ---------------------------------------------------------------------------
alter table public.campaigns
  add column external_booking_url text
  constraint campaigns_external_booking_url_https
    check (external_booking_url ~ '^https://[^[:space:]]+$' and char_length(external_booking_url) <= 500);

grant insert (external_booking_url), update (external_booking_url) on public.campaigns to authenticated;

-- ---------------------------------------------------------------------------
-- bookings: source, and no time slot for external / discount-code bookings
-- ---------------------------------------------------------------------------
alter table public.bookings
  alter column slot_start drop not null,
  add column source text not null default 'promly'
    constraint bookings_source_valid check (source in ('promly', 'external', 'discount_code')),
  add constraint bookings_slot_required_for_promly check (source <> 'promly' or slot_start is not null);
-- bookings_no_double_booking (business_id, slot_start) still works: NULL slots never collide.

-- ---------------------------------------------------------------------------
-- booking_contacts: consent time and a digits-only phone for duplicate checks
-- ---------------------------------------------------------------------------
alter table public.booking_contacts
  add column consent_at timestamptz,
  add column customer_phone_norm text
    generated always as (regexp_replace(customer_phone, '[^0-9]', '', 'g')) stored;
create index booking_contacts_phone_norm_idx on public.booking_contacts (customer_phone_norm);

-- ---------------------------------------------------------------------------
-- referral_links.discount_code
-- ---------------------------------------------------------------------------
-- Prefix from the promoter's name (A-Z/0-9, 3-8 chars, else PROMO), then a
-- 4-char suffix without look-alike characters (no 0/O, 1/I).
create function public._new_discount_code(p_display_name text)
returns text language plpgsql volatile set search_path = '' as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_prefix text;
  v_code   text;
  i        int;
begin
  v_prefix := upper(coalesce(p_display_name, ''));
  v_prefix := replace(replace(replace(v_prefix, 'Æ', 'AE'), 'Ø', 'O'), 'Å', 'A');
  v_prefix := translate(v_prefix, 'ÄÖÜÉÈÁÀÑÇ', 'AOUEEAANC');
  v_prefix := left(regexp_replace(v_prefix, '[^A-Z0-9]', '', 'g'), 8);
  if char_length(v_prefix) < 3 then
    v_prefix := 'PROMO';
  end if;

  for attempt in 1..20 loop
    v_code := v_prefix || '-';
    for i in 1..4 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    if not exists (select 1 from public.referral_links l where l.discount_code = v_code) then
      return v_code;
    end if;
  end loop;
  raise exception 'discount_code_generation_failed';
end $$;

alter table public.referral_links add column discount_code text;

-- Backfill existing links one row at a time (each new code must see the previous ones).
do $$
declare
  r record;
begin
  for r in
    select l.id, p.display_name
    from public.referral_links l join public.profiles p on p.id = l.promoter_id
    where l.discount_code is null
  loop
    update public.referral_links set discount_code = public._new_discount_code(r.display_name) where id = r.id;
  end loop;
end $$;

alter table public.referral_links
  alter column discount_code set not null,
  add constraint referral_links_discount_code_key unique (discount_code),
  add constraint referral_links_discount_code_format
    check (discount_code ~ '^[A-Z0-9]{3,8}-[A-HJ-NP-Z2-9]{4}$');

-- Same as before, plus the discount code on the new referral link.
create or replace function public.memberships_after_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_name  text;
begin
  select p.display_name into v_name from public.profiles p where p.id = new.promoter_id;

  insert into public.referral_links (membership_id, campaign_id, promoter_id, code, discount_code)
  values (new.id, new.campaign_id, new.promoter_id,
          substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
          public._new_discount_code(v_name));

  select b.owner_id into v_owner
  from public.campaigns c join public.businesses b on b.id = c.business_id
  where c.id = new.campaign_id;

  insert into public.notifications (user_id, type, title, payload)
  values (v_owner, 'promoter_joined', coalesce(nullif(v_name, ''), 'A promoter') || ' joined your campaign.',
          jsonb_build_object('campaign_id', new.campaign_id, 'membership_id', new.id));
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Self-referral: a business owner can't promote their own campaign.
-- Same as before, plus the owner check.
-- ---------------------------------------------------------------------------
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
  new.promoter_accepted_at := now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Duplicate guard: for external and discount-code bookings, one active
-- (pending or verified) booking per phone number per campaign. Raising here
-- rolls back the booking inserted earlier in the same transaction.
-- ---------------------------------------------------------------------------
create function public.booking_contacts_no_duplicate()
returns trigger language plpgsql set search_path = '' as $$
declare
  v_booking public.bookings;
  v_phone   text := regexp_replace(new.customer_phone, '[^0-9]', '', 'g');
begin
  select * into v_booking from public.bookings where id = new.booking_id;
  if v_booking.source = 'promly' then
    return new; -- time-slot flow unchanged
  end if;

  -- Serialise concurrent referrals for the same campaign + phone.
  perform pg_advisory_xact_lock(hashtextextended(v_booking.campaign_id::text || ':' || v_phone, 0));

  if exists (
    select 1
    from public.booking_contacts c
    join public.bookings b on b.id = c.booking_id
    where b.campaign_id = v_booking.campaign_id
      and b.id <> v_booking.id
      and b.status in ('pending', 'verified')
      and c.customer_phone_norm = v_phone
  ) then
    raise exception 'duplicate_referral';
  end if;
  return new;
end $$;

create trigger booking_contacts_no_duplicate
  before insert on public.booking_contacts
  for each row execute function public.booking_contacts_no_duplicate();

-- ---------------------------------------------------------------------------
-- Internal: insert a referred booking without a time slot, terms frozen from
-- the agreement the promoter accepted (same rules as create_booking).
-- ---------------------------------------------------------------------------
create function public._create_unslotted_booking(
  p_link           public.referral_links,
  p_source         text,
  p_customer_name  text,
  p_customer_phone text,
  p_consent_at     timestamptz,
  p_fee_bps        int
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_campaign  public.campaigns;
  v_agreement public.agreements;
  v_fee       bigint;
  v_id        uuid;
begin
  if p_fee_bps is null or p_fee_bps < 0 or p_fee_bps > 10000 then
    raise exception 'invalid_fee_bps';
  end if;

  select * into v_campaign from public.campaigns where id = p_link.campaign_id;

  select a.* into v_agreement
  from public.agreements a
  join public.campaign_memberships m on m.agreement_id = a.id
  where m.id = p_link.membership_id;

  if v_agreement.commission_minor > v_campaign.price_minor then
    raise exception 'commission_exceeds_price';
  end if;

  v_fee := public.platform_fee_minor(v_campaign.price_minor, p_fee_bps);

  insert into public.bookings (
    campaign_id, business_id, referral_link_id, promoter_id, agreement_id, slot_start, source,
    price_minor, commission_minor, fee_bps, fee_minor, business_total_minor, currency,
    payout_days, refund_window_days)
  values (
    v_campaign.id, v_campaign.business_id, p_link.id, p_link.promoter_id, v_agreement.id, null, p_source,
    v_campaign.price_minor, v_agreement.commission_minor, p_fee_bps, v_fee,
    v_agreement.commission_minor + v_fee, v_campaign.currency,
    v_agreement.payout_days, v_agreement.refund_window_days)
  returning id into v_id;

  insert into public.booking_contacts (booking_id, customer_name, customer_phone, consent_at)
  values (v_id, trim(p_customer_name), trim(p_customer_phone), p_consent_at);

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- 5. EXTERNAL REFERRAL (customer, no login): store a pending booking, then the
--    server sends the customer to campaigns.external_booking_url?ref=<code>.
-- ---------------------------------------------------------------------------
create function public.create_external_referral(
  p_referral_code  text,
  p_customer_name  text,
  p_customer_phone text,
  p_consent        boolean,
  p_fee_bps        int
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_link     public.referral_links;
  v_campaign public.campaigns;
  v_owner    uuid;
  v_id       uuid;
begin
  if p_consent is not true then
    raise exception 'consent_required';
  end if;

  select * into v_link from public.referral_links where code = p_referral_code;
  if not found then
    raise exception 'referral_link_not_found';
  end if;

  select * into v_campaign from public.campaigns where id = v_link.campaign_id;
  if v_campaign.status <> 'published' then
    raise exception 'campaign_not_published';
  end if;
  if v_campaign.external_booking_url is null then
    raise exception 'no_external_url';
  end if;

  v_id := public._create_unslotted_booking(v_link, 'external', p_customer_name, p_customer_phone, now(), p_fee_bps);

  select b.owner_id into v_owner from public.businesses b where b.id = v_campaign.business_id;
  insert into public.notifications (user_id, type, title, payload)
  values (v_owner, 'booking_created', 'New referral — ' || v_campaign.service_name,
          jsonb_build_object('booking_id', v_id, 'campaign_id', v_campaign.id, 'source', 'external'));

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- 6. REGISTER DISCOUNT CODE (business): a customer used a promoter's code
--    instead of the link. Creates a pending booking the business then verifies.
-- ---------------------------------------------------------------------------
create function public.register_discount_code(
  p_actor_id       uuid,
  p_discount_code  text,
  p_customer_name  text,
  p_customer_phone text,
  p_fee_bps        int
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_link     public.referral_links;
  v_campaign public.campaigns;
  v_id       uuid;
begin
  select * into v_link from public.referral_links
  where discount_code = upper(trim(p_discount_code));
  if not found then
    raise exception 'discount_code_not_found';
  end if;

  select * into v_campaign from public.campaigns where id = v_link.campaign_id;
  if not exists (select 1 from public.businesses b
                 where b.id = v_campaign.business_id and b.owner_id = p_actor_id) then
    raise exception 'not_booking_owner';
  end if;

  v_id := public._create_unslotted_booking(v_link, 'discount_code', p_customer_name, p_customer_phone, null, p_fee_bps);

  insert into public.notifications (user_id, type, title, payload)
  values (v_link.promoter_id, 'booking_created', 'Your code was used — ' || v_campaign.service_name,
          jsonb_build_object('booking_id', v_id, 'campaign_id', v_campaign.id, 'source', 'discount_code'));

  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Lock the new functions down: server (service role) only.
-- ---------------------------------------------------------------------------
revoke execute on function
  public._new_discount_code(text),
  public._create_unslotted_booking(public.referral_links, text, text, text, timestamptz, int),
  public.create_external_referral(text, text, text, boolean, int),
  public.register_discount_code(uuid, text, text, text, int),
  public.booking_contacts_no_duplicate()
from public, anon, authenticated;

grant execute on function
  public._new_discount_code(text),
  public._create_unslotted_booking(public.referral_links, text, text, text, timestamptz, int),
  public.create_external_referral(text, text, text, boolean, int),
  public.register_discount_code(uuid, text, text, text, int)
to service_role;
