-- Campaign photos: up to 3 per campaign in a private Storage bucket.
-- Path format: <campaign_id>/<file>. The first path is the cover.

alter table public.campaigns
  add column photo_paths text[] not null default '{}'
  constraint campaigns_max_3_photos check (cardinality(photo_paths) <= 3);

grant update (photo_paths) on public.campaigns to authenticated;

-- Every path must be inside this campaign's own folder.
create function public.campaign_photos_check()
returns trigger language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from unnest(new.photo_paths) p
    where p !~ ('^' || new.id::text || '/[a-z0-9-]+\.(webp|jpg|jpeg|png)$')
  ) then
    raise exception 'invalid_photo_path';
  end if;
  return new;
end $$;

create trigger campaigns_photos_check
  before insert or update of photo_paths on public.campaigns
  for each row execute function public.campaign_photos_check();

revoke execute on function public.campaign_photos_check() from public, anon, authenticated;

-- Bucket: private, 5 MB per file, images only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('campaign-photos', 'campaign-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Helpers used by the storage policies.
create function public.campaign_id_from_path(p_name text)
returns uuid language plpgsql immutable set search_path = '' as $$
begin
  return split_part(p_name, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create function public.is_published_campaign(p_campaign_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.campaigns c where c.id = p_campaign_id and c.status = 'published');
$$;

grant execute on function public.campaign_id_from_path(text), public.is_published_campaign(uuid) to anon, authenticated;
-- owns_campaign returns false for logged-out visitors; it must be callable inside the read policy.
grant execute on function public.owns_campaign(uuid) to anon;

-- Storage RLS
create policy "campaign photos: read if published or own"
  on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'campaign-photos'
    and (public.is_published_campaign(public.campaign_id_from_path(name))
         or public.owns_campaign(public.campaign_id_from_path(name)))
  );

create policy "campaign photos: business uploads to own campaign"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'campaign-photos' and public.owns_campaign(public.campaign_id_from_path(name)));

create policy "campaign photos: business updates own"
  on storage.objects for update to authenticated
  using (bucket_id = 'campaign-photos' and public.owns_campaign(public.campaign_id_from_path(name)))
  with check (bucket_id = 'campaign-photos' and public.owns_campaign(public.campaign_id_from_path(name)));

create policy "campaign photos: business deletes own"
  on storage.objects for delete to authenticated
  using (bucket_id = 'campaign-photos' and public.owns_campaign(public.campaign_id_from_path(name)));
