-- Agreement PDFs: a business can attach its own promoter agreement as a PDF,
-- instead of or as well as the brand-rules text. Additive only.
--
-- * Files live in the private "agreements" bucket at <campaign_id>/<uuid>.pdf.
-- * The business uploads the file itself (Storage RLS). The server then checks
--   the bytes really are a PDF, hashes them (SHA-256) and registers the version
--   in agreement_documents with the service role. Clients can't write that table.
-- * Every upload is a new version. Clients can't update or delete files, so
--   nothing is ever overwritten.
-- * An agreement version can include one PDF version (agreements.document_id).
--   Accepted agreements are already immutable, so the PDF is frozen with them.
-- * When a promoter joins, the PDF version and its hash are copied onto the
--   membership, next to promoter_accepted_at.

-- ---------------------------------------------------------------------------
-- agreement_documents: one row per uploaded PDF version
-- ---------------------------------------------------------------------------
create table public.agreement_documents (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.campaigns (id) on delete cascade,
  version      int not null default 1, -- set by the trigger (max + 1)
  storage_path text not null unique,
  sha256       text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes   int not null check (size_bytes between 5 and 5242880),
  file_name    text not null default '' check (char_length(file_name) <= 200),
  -- No "on delete" action: deleting the owner cascades through businesses and
  -- campaigns to these rows in the same statement (a "set null" would be an
  -- UPDATE, which the immutability trigger blocks).
  uploaded_by  uuid references public.profiles (id),
  uploaded_at  timestamptz not null default now(),
  unique (campaign_id, version),
  constraint agreement_documents_path_in_campaign_folder
    check (storage_path ~ ('^' || campaign_id::text || '/[0-9a-f-]{36}\.pdf$'))
);

-- Versions are numbered per campaign; the upload time comes from the server clock.
create function public.agreement_documents_before_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('agreement_documents:' || new.campaign_id::text));
  new.version := (select coalesce(max(d.version), 0) + 1
                  from public.agreement_documents d where d.campaign_id = new.campaign_id);
  new.uploaded_at := now();
  return new;
end $$;

create trigger agreement_documents_before_insert
  before insert on public.agreement_documents
  for each row execute function public.agreement_documents_before_insert();

-- Registered versions never change. (Deletes only happen by cascade when a
-- campaign or business is deleted; clients have no delete grant.)
create function public.agreement_documents_no_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'agreement_document_is_immutable';
end $$;

create trigger agreement_documents_no_update
  before update on public.agreement_documents
  for each row execute function public.agreement_documents_no_update();

-- ---------------------------------------------------------------------------
-- Agreements can include one PDF version; memberships record what was accepted
-- ---------------------------------------------------------------------------
alter table public.agreements
  add column document_id uuid references public.agreement_documents (id);

alter table public.campaign_memberships
  add column agreement_document_id     uuid references public.agreement_documents (id),
  add column agreement_document_sha256 text;

-- The PDF must belong to the same campaign as the agreement.
create function public.agreements_document_check()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.document_id is not null and not exists (
    select 1 from public.agreement_documents d
    where d.id = new.document_id and d.campaign_id = new.campaign_id
  ) then
    raise exception 'agreement_document_not_in_campaign';
  end if;
  return new;
end $$;

-- Runs after agreements_before_write (triggers fire in name order), so
-- campaign_id is already the trusted value.
create trigger agreements_document_check
  before insert or update on public.agreements
  for each row execute function public.agreements_document_check();

-- Copy the accepted PDF version and hash from the agreement (never from the client).
create function public.memberships_record_document()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select d.id, d.sha256
    into new.agreement_document_id, new.agreement_document_sha256
  from public.agreements a
  join public.agreement_documents d on d.id = a.document_id
  where a.id = new.agreement_id; -- no PDF: both stay null
  return new;
end $$;

create trigger memberships_record_document
  before insert on public.campaign_memberships
  for each row execute function public.memberships_record_document();

revoke execute on function
  public.agreement_documents_before_insert(), public.agreement_documents_no_update(),
  public.agreements_document_check(), public.memberships_record_document()
from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Who may read a PDF:
-- * the business that owns the campaign (every version),
-- * admins (everything),
-- * promoters, for versions included in an ACCEPTED agreement of a campaign
--   they can see (published) or have joined. Same rule as agreements.
-- ---------------------------------------------------------------------------
create function public.can_read_agreement_pdf(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.agreement_documents d
    join public.campaigns c on c.id = d.campaign_id
    join public.businesses b on b.id = c.business_id
    where d.storage_path = p_path
      and (
        b.owner_id = (select auth.uid())
        or public.current_user_role() = 'admin'
        or (
          public.current_user_role() = 'promoter'
          and exists (select 1 from public.agreements a
                      where a.document_id = d.id and a.business_accepted_at is not null)
          and (c.status = 'published'
               or exists (select 1 from public.campaign_memberships m
                          where m.campaign_id = c.id and m.promoter_id = (select auth.uid())))
        )
      )
  );
$$;

revoke execute on function public.can_read_agreement_pdf(text) from public, anon;
grant execute on function public.can_read_agreement_pdf(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Privileges and RLS
-- ---------------------------------------------------------------------------
revoke all on public.agreement_documents from anon, authenticated;
grant select on public.agreement_documents to authenticated;
-- No insert/update/delete for clients: the server registers versions after checking the bytes.

grant insert (document_id) on public.agreements to authenticated;
grant update (document_id) on public.agreements to authenticated;
-- campaign_memberships: the new columns are filled by the trigger only (no grant).

alter table public.agreement_documents enable row level security;

create policy "agreement_documents: owner, admin, or promoter who can see it"
  on public.agreement_documents for select to authenticated
  using (public.can_read_agreement_pdf(storage_path));

-- ---------------------------------------------------------------------------
-- Storage: private bucket, PDF only, 5 MB per file
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('agreements', 'agreements', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Read: the business reads its own campaign folder; everyone else only
-- registered versions, under the rule above. Logged-out visitors get nothing.
create policy "agreement pdfs: read if allowed"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'agreements'
    and (public.owns_campaign(public.campaign_id_from_path(name))
         or public.can_read_agreement_pdf(name))
  );

-- Upload: the business, into its own campaign's folder, as a new file.
-- There are no update or delete policies, so an upload can never overwrite
-- or remove an earlier version.
create policy "agreement pdfs: business uploads to own campaign"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'agreements'
    and name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.pdf$'
    and public.owns_campaign(public.campaign_id_from_path(name))
  );
