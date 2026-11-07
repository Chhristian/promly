-- campaigns.currency and agreements.version are always set by triggers
-- (from the business, and as max+1). Placeholder defaults make them optional
-- on insert, which matches the column grants (clients can't send them).
alter table public.campaigns  alter column currency set default 'NOK';
alter table public.agreements alter column version  set default 1;
