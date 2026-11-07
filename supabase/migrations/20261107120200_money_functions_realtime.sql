-- Money-changing functions (docs/PLAN.md section 2) and realtime.
-- Each function is one transaction. Only the service role (server) may call
-- them; the server passes the acting user's id, and the function checks it.
--
-- Ledger per verified booking (sums to zero):
--   promoter  +commission       (pending)
--   platform  +fee              (pending)
--   business  -(commission+fee) (pending)
-- Release moves each account's pending balance to available.
-- Refund appends reversal rows that cancel whatever balance remains.

-- Platform fee: price x bps / 10000, rounded half-up to a whole minor unit.
-- Must match lib/money.ts.
create function public.platform_fee_minor(p_price_minor bigint, p_fee_bps int)
returns bigint language sql immutable set search_path = '' as $$
  select (p_price_minor * p_fee_bps + 5000) / 10000;
$$;

-- Internal: assert the actor owns the booking's business. Returns the locked booking.
create function public._lock_booking_for_owner(p_booking_id uuid, p_actor_id uuid)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
begin
  select * into v from public.bookings where id = p_booking_id for update;
  if not found then
    raise exception 'booking_not_found';
  end if;
  if not exists (select 1 from public.businesses b
                 where b.id = v.business_id and b.owner_id = p_actor_id) then
    raise exception 'not_booking_owner';
  end if;
  return v;
end $$;

-- Internal: move every pending balance of a booking to available.
create function public._release_booking(p_booking public.bookings)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
  r record;
begin
  for r in
    select account, party_id, sum(amount_minor) as balance
    from public.ledger_entries
    where booking_id = p_booking.id and bucket = 'pending'
    group by account, party_id
    having sum(amount_minor) <> 0
  loop
    insert into public.ledger_entries (booking_id, account, party_id, bucket, entry_type, amount_minor, currency)
    values (p_booking.id, r.account, r.party_id, 'pending',   'release', -r.balance, p_booking.currency),
           (p_booking.id, r.account, r.party_id, 'available', 'release',  r.balance, p_booking.currency);
  end loop;

  update public.bookings set released_at = now() where id = p_booking.id returning * into v;

  insert into public.notifications (user_id, type, title, payload)
  values (v.promoter_id, 'commission_available', 'Commission is now available.',
          jsonb_build_object('booking_id', v.id, 'amount_minor', v.commission_minor, 'currency', v.currency));
  return v;
end $$;

-- 1. CREATE BOOKING (customer, no login). Freezes the terms on the booking.
create function public.create_booking(
  p_referral_code  text,
  p_slot_start     timestamptz,
  p_customer_name  text,
  p_customer_phone text,
  p_fee_bps        int
) returns uuid language plpgsql set search_path = '' as $$
declare
  v_link      public.referral_links;
  v_campaign  public.campaigns;
  v_agreement public.agreements;
  v_fee       bigint;
  v_owner     uuid;
  v_id        uuid;
begin
  if p_fee_bps is null or p_fee_bps < 0 or p_fee_bps > 10000 then
    raise exception 'invalid_fee_bps';
  end if;
  if p_slot_start is null or p_slot_start <= now() then
    raise exception 'slot_in_past';
  end if;

  select * into v_link from public.referral_links where code = p_referral_code;
  if not found then
    raise exception 'referral_link_not_found';
  end if;

  select * into v_campaign from public.campaigns where id = v_link.campaign_id;
  if v_campaign.status <> 'published' then
    raise exception 'campaign_not_published';
  end if;

  -- The terms the promoter accepted when joining.
  select a.* into v_agreement
  from public.agreements a
  join public.campaign_memberships m on m.agreement_id = a.id
  where m.id = v_link.membership_id;

  if v_agreement.commission_minor > v_campaign.price_minor then
    raise exception 'commission_exceeds_price';
  end if;

  v_fee := public.platform_fee_minor(v_campaign.price_minor, p_fee_bps);

  begin
    insert into public.bookings (
      campaign_id, business_id, referral_link_id, promoter_id, agreement_id, slot_start,
      price_minor, commission_minor, fee_bps, fee_minor, business_total_minor, currency,
      payout_days, refund_window_days)
    values (
      v_campaign.id, v_campaign.business_id, v_link.id, v_link.promoter_id, v_agreement.id, p_slot_start,
      v_campaign.price_minor, v_agreement.commission_minor, p_fee_bps, v_fee,
      v_agreement.commission_minor + v_fee, v_campaign.currency,
      v_agreement.payout_days, v_agreement.refund_window_days)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'slot_taken';
  end;

  insert into public.booking_contacts (booking_id, customer_name, customer_phone)
  values (v_id, trim(p_customer_name), trim(p_customer_phone));

  select b.owner_id into v_owner from public.businesses b where b.id = v_campaign.business_id;
  insert into public.notifications (user_id, type, title, payload)
  values (v_owner, 'booking_created', 'New booking received — ' || v_campaign.service_name,
          jsonb_build_object('booking_id', v_id, 'campaign_id', v_campaign.id));

  return v_id;
end $$;

-- 2. VERIFY (business confirms the service happened). Idempotent.
create function public.verify_booking(p_booking_id uuid, p_actor_id uuid)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
begin
  v := public._lock_booking_for_owner(p_booking_id, p_actor_id);
  if v.status = 'verified' then
    return v; -- already done; no second commission
  end if;
  if v.status <> 'pending' then
    raise exception 'booking_not_pending';
  end if;

  update public.bookings
  set status = 'verified',
      verified_at = now(),
      refund_window_ends_at = now() + make_interval(days => v.refund_window_days),
      payout_at = now() + make_interval(days => v.payout_days)
  where id = v.id
  returning * into v;

  insert into public.ledger_entries (booking_id, account, party_id, bucket, entry_type, amount_minor, currency)
  values (v.id, 'promoter', v.promoter_id, 'pending', 'commission',       v.commission_minor,      v.currency),
         (v.id, 'business', v.business_id, 'pending', 'business_charge', -v.business_total_minor, v.currency);
  if v.fee_minor > 0 then -- a fee that rounds to 0 gets no row (ledger rows are never 0)
    insert into public.ledger_entries (booking_id, account, party_id, bucket, entry_type, amount_minor, currency)
    values (v.id, 'platform', null, 'pending', 'platform_fee', v.fee_minor, v.currency);
  end if;

  insert into public.notifications (user_id, type, title, payload)
  values (v.promoter_id, 'booking_verified', 'Conversion verified — commission pending.',
          jsonb_build_object('booking_id', v.id, 'amount_minor', v.commission_minor, 'currency', v.currency));
  return v;
end $$;

-- 3a. RELEASE (normal path): after the refund window has really passed. Idempotent.
create function public.release_commission(p_booking_id uuid, p_actor_id uuid)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
begin
  v := public._lock_booking_for_owner(p_booking_id, p_actor_id);
  if v.released_at is not null then
    return v;
  end if;
  if v.status <> 'verified' then
    raise exception 'booking_not_verified';
  end if;
  if v.refund_window_ends_at > now() then
    raise exception 'refund_window_not_over';
  end if;
  return public._release_booking(v);
end $$;

-- 3b. SIMULATE END OF REFUND WINDOW (Demo Mode only; the server checks DEMO_MODE).
create function public.simulate_end_of_refund_window(p_booking_id uuid, p_actor_id uuid)
returns public.bookings language plpgsql set search_path = '' as $$
declare
  v public.bookings;
begin
  v := public._lock_booking_for_owner(p_booking_id, p_actor_id);
  if v.released_at is not null then
    return v;
  end if;
  if v.status <> 'verified' then
    raise exception 'booking_not_verified';
  end if;
  update public.bookings set refund_window_ends_at = least(refund_window_ends_at, now())
  where id = v.id returning * into v;
  return public._release_booking(v);
end $$;

-- 4. REFUND: allowed until the payout date. Appends reversal rows. Idempotent.
create function public.refund_booking(p_booking_id uuid, p_actor_id uuid)
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
  if v.status = 'verified' and v.payout_at <= now() then
    raise exception 'already_paid_out';
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

-- DEMO PURGE: deletes only data of businesses flagged is_demo (used by
-- "Prepare Stage Demo" and by test clean-up). The only place ledger rows
-- may be deleted.
create function public.purge_demo_data()
returns void language plpgsql set search_path = '' as $$
begin
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

-- ---------------------------------------------------------------------------
-- Lock the functions down: server (service role) only.
-- ---------------------------------------------------------------------------
revoke execute on function
  public._lock_booking_for_owner(uuid, uuid),
  public._release_booking(public.bookings),
  public.create_booking(text, timestamptz, text, text, int),
  public.verify_booking(uuid, uuid),
  public.release_commission(uuid, uuid),
  public.simulate_end_of_refund_window(uuid, uuid),
  public.refund_booking(uuid, uuid),
  public.purge_demo_data()
from public, anon, authenticated;

grant execute on function
  public._lock_booking_for_owner(uuid, uuid),
  public._release_booking(public.bookings),
  public.create_booking(text, timestamptz, text, text, int),
  public.verify_booking(uuid, uuid),
  public.release_commission(uuid, uuid),
  public.simulate_end_of_refund_window(uuid, uuid),
  public.refund_booking(uuid, uuid),
  public.purge_demo_data()
to service_role;

-- Trigger functions are never called directly.
revoke execute on function
  public.handle_new_user(), public.campaigns_before_write(), public.agreements_before_write(),
  public.memberships_before_insert(), public.memberships_after_insert(), public.ledger_append_only()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: changes are delivered through RLS, so users only get their own rows.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table
  public.campaigns, public.campaign_memberships, public.bookings,
  public.ledger_entries, public.notifications;
