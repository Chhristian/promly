-- Bookable time slots per business (the isolated demo booking calendar).
-- create_booking now only accepts a slot the business has offered.

create table public.time_slots (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses (id) on delete cascade,
  starts_at        timestamptz not null,
  duration_minutes int not null default 60 check (duration_minutes between 15 and 480),
  created_at       timestamptz not null default now(),
  unique (business_id, starts_at)
);

revoke all on public.time_slots from anon, authenticated;
grant select on public.time_slots to authenticated;
grant insert (business_id, starts_at, duration_minutes) on public.time_slots to authenticated;
grant delete on public.time_slots to authenticated;

alter table public.time_slots enable row level security;

create policy "time_slots: owner, or business with a visible campaign"
  on public.time_slots for select to authenticated
  using (public.is_business_owner(business_id)
         or exists (select 1 from public.campaigns c where c.business_id = time_slots.business_id));
create policy "time_slots: owner adds"
  on public.time_slots for insert to authenticated
  with check (public.is_business_owner(business_id));
create policy "time_slots: owner removes"
  on public.time_slots for delete to authenticated
  using (public.is_business_owner(business_id));

-- Same as before, plus: the slot must be one the business offers.
create or replace function public.create_booking(
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

  if not exists (select 1 from public.time_slots s
                 where s.business_id = v_campaign.business_id and s.starts_at = p_slot_start) then
    raise exception 'slot_not_offered';
  end if;

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

-- create or replace keeps grants, but restate them to be safe.
revoke execute on function public.create_booking(text, timestamptz, text, text, int) from public, anon, authenticated;
grant execute on function public.create_booking(text, timestamptz, text, text, int) to service_role;
