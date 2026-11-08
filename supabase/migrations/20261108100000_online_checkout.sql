-- Promly works with businesses that have an ONLINE CHECKOUT (online booking or ticketing).
-- ADDITIVE: new categories (old values stay valid so existing rows don't break; the app
-- no longer offers the offline ones), and the business's own checkout URL.

alter table public.businesses
  drop constraint businesses_category_check,
  add constraint businesses_category_check check (category in (
    -- offered by the app
    'tour', 'boat_tour', 'jet_ski', 'water_sports', 'experience', 'activity', 'event',
    'nightlife', 'club', 'fitness', 'restaurant', 'other',
    -- kept only so older rows stay valid (no longer offered)
    'barbershop', 'beauty', 'alcohol'));

-- The business's own online checkout / booking page (https only). Required by the app for
-- new businesses; existing rows may be empty.
alter table public.businesses
  add column checkout_url text
  constraint businesses_checkout_url_https
    check (checkout_url ~ '^https://[^[:space:]]+$' and char_length(checkout_url) <= 500);

grant insert (checkout_url), update (checkout_url) on public.businesses to authenticated;
