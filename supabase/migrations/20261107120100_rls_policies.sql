-- Row Level Security (docs/PLAN.md section 4, "Security").
-- Rule of thumb: logged-in users READ through policies and WRITE only the
-- columns granted below. Bookings and money are written only by the
-- server-only functions in the next migration (service role).

-- ---------------------------------------------------------------------------
-- Helper functions (security definer, so policies don't recurse into RLS)
-- ---------------------------------------------------------------------------
create function public.is_business_owner(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses b
                 where b.id = p_business_id and b.owner_id = (select auth.uid()));
$$;

create function public.owns_campaign(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaigns c
                 join public.businesses b on b.id = c.business_id
                 where c.id = p_campaign_id and b.owner_id = (select auth.uid()));
$$;

create function public.is_campaign_member(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaign_memberships m
                 where m.campaign_id = p_campaign_id and m.promoter_id = (select auth.uid()));
$$;

create function public.current_user_role()
returns text language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create function public.can_join_campaign(p_campaign_id uuid, p_agreement_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaigns c
                 where c.id = p_campaign_id and c.status = 'published'
                   and c.current_agreement_id = p_agreement_id);
$$;

revoke execute on function public.is_business_owner(uuid), public.owns_campaign(uuid),
  public.is_campaign_member(uuid), public.current_user_role(),
  public.can_join_campaign(uuid, uuid) from public, anon;
grant execute on function public.is_business_owner(uuid), public.owns_campaign(uuid),
  public.is_campaign_member(uuid), public.current_user_role(),
  public.can_join_campaign(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Table privileges: start from nothing, then grant exactly what is needed.
-- (service_role keeps full access; it bypasses RLS and is server-only.)
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.businesses, public.campaigns, public.agreements,
  public.campaign_memberships, public.referral_links, public.referral_events,
  public.bookings, public.booking_contacts, public.ledger_entries, public.notifications
  from anon, authenticated;

grant select on public.profiles, public.businesses, public.campaigns, public.agreements,
  public.campaign_memberships, public.referral_links, public.referral_events,
  public.bookings, public.booking_contacts, public.ledger_entries, public.notifications
  to authenticated;

grant update (display_name) on public.profiles to authenticated;

grant insert (owner_id, name, description, city, country, currency, category, logo_url)
  on public.businesses to authenticated;
grant update (name, description, city, category, logo_url) on public.businesses to authenticated;
grant delete on public.businesses to authenticated;

grant insert (business_id, service_name, description, image_url, price_minor)
  on public.campaigns to authenticated;
grant update (service_name, description, image_url, price_minor, status, current_agreement_id)
  on public.campaigns to authenticated;
grant delete on public.campaigns to authenticated;

grant insert (campaign_id, commission_minor, payout_days, refund_window_days,
              allowed_channels, brand_rules, business_accepted_at)
  on public.agreements to authenticated;
grant update (commission_minor, payout_days, refund_window_days,
              allowed_channels, brand_rules, business_accepted_at)
  on public.agreements to authenticated;

grant insert (campaign_id, promoter_id, agreement_id) on public.campaign_memberships to authenticated;

grant update (read_at) on public.notifications to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table
-- ---------------------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.businesses           enable row level security;
alter table public.campaigns            enable row level security;
alter table public.agreements           enable row level security;
alter table public.campaign_memberships enable row level security;
alter table public.referral_links       enable row level security;
alter table public.referral_events      enable row level security;
alter table public.bookings             enable row level security;
alter table public.booking_contacts     enable row level security;
alter table public.ledger_entries       enable row level security;
alter table public.notifications        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: everyone logged in can see display names and roles; you edit your own name
-- ---------------------------------------------------------------------------
create policy "profiles: logged-in users can read"
  on public.profiles for select to authenticated using (true);
create policy "profiles: users update their own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- businesses: owners manage their own; others see businesses whose campaigns they can see
-- ---------------------------------------------------------------------------
create policy "businesses: owner or visible campaign"
  on public.businesses for select to authenticated
  using (owner_id = (select auth.uid())
         or exists (select 1 from public.campaigns c where c.business_id = businesses.id));
create policy "businesses: business users create their own"
  on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()) and public.current_user_role() = 'business');
create policy "businesses: owner updates"
  on public.businesses for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "businesses: owner deletes"
  on public.businesses for delete to authenticated
  using (owner_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- campaigns: published ones are readable by every logged-in user
-- ---------------------------------------------------------------------------
create policy "campaigns: published, own, or joined"
  on public.campaigns for select to authenticated
  using (status = 'published'
         or public.is_business_owner(business_id)
         or public.is_campaign_member(id));
create policy "campaigns: owner creates"
  on public.campaigns for insert to authenticated
  with check (public.is_business_owner(business_id));
create policy "campaigns: owner updates"
  on public.campaigns for update to authenticated
  using (public.is_business_owner(business_id)) with check (public.is_business_owner(business_id));
create policy "campaigns: owner deletes drafts"
  on public.campaigns for delete to authenticated
  using (public.is_business_owner(business_id) and status = 'draft');

-- ---------------------------------------------------------------------------
-- agreements: owner sees all versions; others see accepted versions of campaigns they can see
-- ---------------------------------------------------------------------------
create policy "agreements: owner, or accepted and visible"
  on public.agreements for select to authenticated
  using (public.owns_campaign(campaign_id)
         or (business_accepted_at is not null
             and exists (select 1 from public.campaigns c where c.id = agreements.campaign_id)));
create policy "agreements: owner creates"
  on public.agreements for insert to authenticated
  with check (public.owns_campaign(campaign_id));
create policy "agreements: owner edits until accepted"
  on public.agreements for update to authenticated
  using (public.owns_campaign(campaign_id) and business_accepted_at is null)
  with check (public.owns_campaign(campaign_id));

-- ---------------------------------------------------------------------------
-- campaign_memberships: promoters join published campaigns, accepting the current agreement
-- ---------------------------------------------------------------------------
create policy "memberships: own or on my campaign"
  on public.campaign_memberships for select to authenticated
  using (promoter_id = (select auth.uid()) or public.owns_campaign(campaign_id));
create policy "memberships: promoters join with the current agreement"
  on public.campaign_memberships for insert to authenticated
  with check (promoter_id = (select auth.uid())
              and public.current_user_role() = 'promoter'
              and public.can_join_campaign(campaign_id, agreement_id));

-- ---------------------------------------------------------------------------
-- referral_links / referral_events: the promoter and the business can read; no client writes
-- ---------------------------------------------------------------------------
create policy "referral_links: own or on my campaign"
  on public.referral_links for select to authenticated
  using (promoter_id = (select auth.uid()) or public.owns_campaign(campaign_id));
create policy "referral_events: for links I can see"
  on public.referral_events for select to authenticated
  using (exists (select 1 from public.referral_links l where l.id = referral_events.referral_link_id));

-- ---------------------------------------------------------------------------
-- bookings: the business and the attributed promoter can read; no client writes
-- ---------------------------------------------------------------------------
create policy "bookings: my business or my referral"
  on public.bookings for select to authenticated
  using (public.is_business_owner(business_id) or promoter_id = (select auth.uid()));

-- booking_contacts: the business only (promoters never see customer details)
create policy "booking_contacts: business only"
  on public.booking_contacts for select to authenticated
  using (exists (select 1 from public.bookings b
                 where b.id = booking_contacts.booking_id
                   and public.is_business_owner(b.business_id)));

-- ---------------------------------------------------------------------------
-- ledger_entries: you read your own account's rows; nobody writes from the client
-- ---------------------------------------------------------------------------
create policy "ledger: my promoter or business rows"
  on public.ledger_entries for select to authenticated
  using ((account = 'promoter' and party_id = (select auth.uid()))
         or (account = 'business' and public.is_business_owner(party_id)));

-- ---------------------------------------------------------------------------
-- notifications: your own; you can only mark them read
-- ---------------------------------------------------------------------------
create policy "notifications: own"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
create policy "notifications: mark own as read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
