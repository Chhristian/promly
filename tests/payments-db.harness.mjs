// Replays every Supabase migration on PGlite (real Postgres in WASM) and checks the payments,
// age and access rules in the database itself. Used by tests/payments-db.test.ts.
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

/** @returns {Promise<{ section: string, name: string, pass: boolean, detail: string }[]>} */
export async function runDbChecks(dir) {
const results = [];
const db = new PGlite();
let section = "";
const ok = (cond, name, extra = "") => { results.push({ section, name, pass: !!cond, detail: cond ? "" : String(extra) }); };
const q = async (sql, params) => (await db.query(sql, params)).rows;
const one = async (sql, params) => (await q(sql, params))[0];
const err = async (sql, params) => { try { await db.query(sql, params); return null; } catch (e) { return e.message; } };

// --- Supabase stand-ins -----------------------------------------------------
await db.exec(`
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  grant usage on schema public to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
  alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  create publication supabase_realtime;
`);

section = "Migrations";
for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
  try { await db.exec(readFileSync(path.join(dir, f), "utf8")); ok(true, f); }
  catch (e) { ok(false, f, e.message); return results; }
}

// --- Fixtures ---------------------------------------------------------------
const user = async (email, role) => (await one(`insert into auth.users (email, raw_user_meta_data) values ($1, $2) returning id`, [email, { role, display_name: email.split("@")[0] }])).id;
const owner = await user("biz@x.no", "business");
const alex = await user("alex@x.no", "promoter");
const kid = await user("kid@x.no", "promoter");
const admin = await user("admin@x.no", "promoter");
await q(`update public.profiles set role = 'admin' where id = $1`, [admin]);
await q(`update public.profiles set is_demo = true where id in ($1, $2)`, [owner, alex]);

const biz = (await one(`insert into public.businesses (owner_id, name, country, currency, category, is_demo)
  values ($1, 'Demo Barber', 'NO', 'NOK', 'barbershop', true) returning id`, [owner])).id;
const camp = (await one(`insert into public.campaigns (business_id, service_name, price_minor) values ($1, 'Premium Haircut', 50000) returning id`, [biz])).id;
const agr = await one(`insert into public.agreements (campaign_id, commission_minor, payout_days, refund_window_days, business_accepted_at)
  values ($1, 10000, 14, 7, now()) returning id, template_version`, [camp]);
await q(`update public.campaigns set current_agreement_id = $1, status = 'published' where id = $2`, [agr.id, camp]);
await q(`insert into public.campaign_memberships (campaign_id, promoter_id, agreement_id) values ($1, $2, $3)`, [camp, alex, agr.id]);
const code = (await one(`select code from public.referral_links where promoter_id = $1`, [alex])).code;
for (let h = 1; h <= 23; h++) await q(`insert into public.time_slots (business_id, starts_at) values ($1, date_trunc('hour', now()) + make_interval(days => 1, hours => $2))`, [biz, h]);
const slot = async (h) => (await one(`select starts_at from public.time_slots where business_id = $1 order by starts_at offset $2 limit 1`, [biz, h])).starts_at;
const book = async (h) => (await one(`select public.create_booking($1, $2, 'Kunde', '+47 400 00 000', 275) as id`, [code, await slot(h)])).id;
const verify = async (id) => q(`select public.verify_booking($1, $2)`, [id, owner]);
const status = async (id) => (await one(`select settlement_status from public.booking_settlement where booking_id = $1`, [id])).settlement_status;

section = "Backward compatibility (behaviour of existing functions)";
ok(agr.template_version === "promly-standard-v1", "new agreement still defaults to template v1");
const v2 = await one(`insert into public.agreements (campaign_id, commission_minor, payout_days, refund_window_days, template_version) values ($1, 10000, 14, 7, 'promly-standard-v2') returning template_version`, [camp]);
ok(v2.template_version === "promly-standard-v2", "server can ask for template v2");
const bogus = await one(`insert into public.agreements (campaign_id, commission_minor, payout_days, refund_window_days, template_version) values ($1, 10000, 14, 7, 'hacked') returning template_version`, [camp]);
ok(bogus.template_version === "promly-standard-v1", "unknown template version falls back to v1");
const legacy = await book(0); await verify(legacy);
await q(`select public.simulate_end_of_refund_window($1, $2)`, [legacy, owner]);
const legacyRow = await one(`select status, released_at, final_at from public.bookings where id = $1`, [legacy]);
ok(legacyRow.status === "verified" && legacyRow.released_at && legacyRow.final_at === null, "stage-demo 'Simulate end of refund window' unchanged (released, final_at untouched)");
const legacy2 = await book(1); await verify(legacy2);
await q(`select public.refund_booking($1, $2)`, [legacy2, owner]);
ok((await one(`select status from public.bookings where id = $1`, [legacy2])).status === "refunded", "existing refund_booking still works");
ok((await one(`select coalesce(sum(amount_minor),0)::int s from public.ledger_entries where booking_id = $1`, [legacy2])).s === 0, "refund ledger still sums to zero");

section = "Money maths and the 14-day rule";
const b1 = await book(2); await verify(b1);
const b1row = await one(`select fee_minor, business_total_minor from public.bookings where id = $1`, [b1]);
ok(Number(b1row.fee_minor) === 1375 && Number(b1row.business_total_minor) === 11375, "500 kr booking, 100 kr commission -> fee 13.75, total 113.75");
ok(await status(b1) === "pending", "verified booking is Pending");
await q(`update public.bookings set verified_at = now() - interval '14 days' + interval '1 minute' where id = $1`, [b1]);
await q(`select public.finalize_due_bookings()`);
ok((await one(`select final_at from public.bookings where id = $1`, [b1])).final_at === null, "13 days 23:59 after verify: not final yet");
const refundCheck = await book(3); await verify(refundCheck);
await q(`update public.bookings set verified_at = now() - interval '13 days' where id = $1`, [refundCheck]);
await q(`select public.refund_booking_before_final($1, $2)`, [refundCheck, owner]);
ok((await one(`select status from public.bookings where id = $1`, [refundCheck])).status === "refunded", "refund inside 14 days works");
ok((await q(`select account, sum(amount_minor)::int s from public.ledger_entries where booking_id = $1 group by account`, [refundCheck])).every((r) => r.s === 0), "refund reverses commission AND fee (all accounts back to 0) with new rows");
await q(`update public.bookings set verified_at = now() - interval '14 days' - interval '1 second' where id = $1`, [b1]);
ok((await one(`select public.finalize_due_bookings() n`)).n === 1, "exactly 14 days after verify: becomes final");
ok(await status(b1) === "final", "status is Final");
ok((await err(`select public.refund_booking_before_final($1, $2)`, [b1, owner]))?.includes("commission_is_final"), "refund after 14 days is refused");
ok((await one(`select public.finalize_due_bookings() n`)).n === 0, "finalize is idempotent");

section = "Invoice, payment and payout";
const month = (await one(`select date_trunc('month', now())::date m`)).m;
ok((await err(`select public.save_stripe_account($1, 'acct_alex1', true, 'self', null)`, [alex]))?.includes("age_band_required"), "payout account refused before the age band is confirmed");
ok((await err(`select public.set_age_band($1, '15')`, [kid]))?.includes("invalid_age_band"), "under 16 / unknown band refused");
await q(`select public.set_age_band($1, '18+')`, [alex]);
ok((await err(`select public.set_age_band($1, '16-17')`, [alex]))?.includes("age_band_cannot_go_down"), "age band can't go down");
ok((await err(`select public.save_stripe_account($1, 'acct_alex1', true, 'guardian', now())`, [alex]))?.includes("adult_uses_own_account"), "18+ promoter must use their own Stripe account");
await q(`select public.save_stripe_account($1, 'acct_alex1', true, 'self', null)`, [alex]);
ok((await one(`select holder, payouts_enabled from public.stripe_accounts where profile_id = $1`, [alex])).holder === "self", "18+ promoter's own payout account saved");
ok((await err(`select public.save_stripe_account($1, 'acct_alex2', true, 'self', null)`, [alex]))?.includes("stripe_account_mismatch"), "a different Stripe account can't silently replace the linked one");
ok((await one(`select public.prepare_payout($1, 'NOK', 'run-0') id`, [alex])).id === null, "nothing invoiced+paid yet -> no payout");
const inv = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, month])).id;
const invRow = await one(`select total_minor, commission_minor, fee_minor, (select count(*)::int from public.invoice_lines where invoice_id = $1) lines from public.business_invoices where id = $1`, [inv]);
ok(Number(invRow.total_minor) === 11375 && invRow.lines === 1, "invoice: one line, total 113.75 kr (100 commission + 13.75 fee)");
ok((await one(`select public.create_invoice_draft($1, $2) id`, [biz, month])).id === inv, "re-running the draft step returns the same draft");
await q(`select public.attach_stripe_invoice($1, 'in_test1', 'https://invoice.stripe.com/i/test', now() + interval '14 days')`, [inv]);
ok(await status(b1) === "invoiced", "status is Invoiced");
ok((await one(`select public.create_invoice_draft($1, $2) id`, [biz, month])).id === null, "one invoice per business per month");
ok((await one(`select public.prepare_payout($1, 'NOK', 'run-1') id`, [alex])).id === null, "invoice open (unpaid) -> no payout");
await q(`select public.mark_invoice_paid('in_test1', now())`);
await q(`select public.mark_invoice_paid('in_test1', now())`);
ok(await status(b1) === "paid_by_business", "webhook marks it Paid by business (idempotent)");
const pay = (await one(`select public.prepare_payout($1, 'NOK', 'run-2') id`, [alex])).id;
const payRow = await one(`select amount_minor, status, idempotency_key from public.payouts where id = $1`, [pay]);
ok(Number(payRow.amount_minor) === 10000 && payRow.status === "pending", "payout = the 100 kr commission only (Promly keeps the fee)");
ok(/^promly-payout-run-2-/.test(payRow.idempotency_key), "payout carries an idempotency key");
ok((await one(`select public.prepare_payout($1, 'NOK', 'run-2b') id`, [alex])).id === pay, "pending payout is returned for retry, not duplicated");
await q(`select public.mark_payout_transferred($1, 'tr_test1')`, [pay]);
ok(await status(b1) === "paid_out", "status is Paid out");
ok((await one(`select public.prepare_payout($1, 'NOK', 'run-3') id`, [alex])).id === null, "no double payout");
ok((await err(`insert into public.payout_items (payout_id, booking_id, invoice_line_id, kind, amount_minor) select $1, $2, id, 'commission', 10000 from public.invoice_lines where booking_id = $2`, [pay, b1]))?.includes("duplicate"), "database itself refuses a second payout item for the same booking");

section = "Failed transfer is retried by a later run";
const b2 = await book(4); await verify(b2); await q(`select public.simulate_end_of_holding_period($1, $2)`, [b2, owner]);
const nextMonth = (await one(`select (date_trunc('month', now()) + interval '1 month')::date m`)).m;
const inv2 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, nextMonth])).id;
await q(`select public.attach_stripe_invoice($1, 'in_test2', 'https://invoice.stripe.com/i/test2', now() - interval '1 day')`, [inv2]);
await q(`select public.mark_invoice_paid('in_test2', now())`);
const p2 = (await one(`select public.prepare_payout($1, 'NOK', 'run-4') id`, [alex])).id;
await q(`select public.mark_payout_failed($1, 'test failure')`, [p2]);
const p3 = (await one(`select public.prepare_payout($1, 'NOK', 'run-5') id`, [alex])).id;
ok(p3 && p3 !== p2 && Number((await one(`select amount_minor from public.payouts where id = $1`, [p3])).amount_minor) === 10000, "after a failed transfer the next run pays it (once)");
await q(`select public.mark_payout_transferred($1, 'tr_test3')`, [p3]);

section = "Overdue invoice pauses campaigns";
const b3 = await book(5); await verify(b3); await q(`select public.simulate_end_of_holding_period($1, $2)`, [b3, owner]);
const m3 = (await one(`select (date_trunc('month', now()) + interval '2 month')::date m`)).m;
const inv3 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, m3])).id;
await q(`select public.attach_stripe_invoice($1, 'in_test3', 'https://invoice.stripe.com/i/test3', now() - interval '1 day')`, [inv3]);
await q(`select public.mark_invoice_overdue('in_test3')`);
ok((await one(`select status from public.campaigns where id = $1`, [camp])).status === "paused", "overdue -> campaigns paused");
ok(await status(b3) === "awaiting_business_payment", "promoter status: Awaiting business payment");
ok((await err(`update public.campaigns set status = 'published' where id = $1`, [camp]))?.includes("billing_overdue"), "business can't re-publish while overdue");
ok((await one(`select public.prepare_payout($1, 'NOK', 'run-6') id`, [alex])).id === null, "overdue (unpaid) -> no payout");
await q(`select public.mark_invoice_paid('in_test3', now())`);
ok((await one(`select status from public.campaigns where id = $1`, [camp])).status === "published", "paying un-pauses the campaigns");

section = "Fraud clawback (admin only, reason required)";
ok((await err(`select public.fraud_clawback($1, $2, 'fake booking pattern')`, [b1, owner]))?.includes("admin_only"), "non-admin refused");
ok((await err(`select public.fraud_clawback($1, $2, 'short')`, [b1, admin]))?.includes("reason_required"), "short reason refused");
await q(`select public.fraud_clawback($1, $2, 'Same phone booked 9 times, confirmed fake')`, [b1, admin]);
ok((await one(`select coalesce(sum(amount_minor),0)::int s from public.ledger_entries where booking_id = $1 and account = 'promoter'`, [b1])).s === 0, "clawback zeroes the promoter's commission with new ledger rows");
ok((await one(`select coalesce(sum(amount_minor),0)::int s from public.ledger_entries where booking_id = $1`, [b1])).s === 0, "ledger still sums to zero");
// b1 was already paid out; b3 (100 kr) is paid by the business but not yet paid out.
ok((await one(`select public.prepare_payout($1, 'NOK', 'run-7') id`, [alex])).id === null, "clawback (-100) cancels the new commission (+100): nothing paid, carried over");
const b4 = await book(8); await verify(b4); await q(`select public.simulate_end_of_holding_period($1, $2)`, [b4, owner]);
const m4 = (await one(`select (date_trunc('month', now()) + interval '3 month')::date m`)).m;
const inv4 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, m4])).id;
await q(`select public.attach_stripe_invoice($1, 'in_test4', 'https://invoice.stripe.com/i/test4', now() + interval '14 days')`, [inv4]);
await q(`select public.mark_invoice_paid('in_test4', now())`);
const p4 = (await one(`select public.prepare_payout($1, 'NOK', 'run-8') id`, [alex])).id;
ok(Number((await one(`select amount_minor from public.payouts where id = $1`, [p4])).amount_minor) === 10000, "next run pays 100 + 100 - 100 = 100 kr");
const items = await q(`select kind, amount_minor::int a from public.payout_items where payout_id = $1 order by kind`, [p4]);
ok(items.filter((i) => i.kind === "commission").length === 2 && items.some((i) => i.kind === "clawback" && i.a === -10000), "payout items: two commissions + one negative clawback", JSON.stringify(items));
const inv4row = await one(`select commission_minor::int c, fee_minor::int f, total_minor::int t from public.business_invoices where id = $1`, [inv4]);
const lines4 = await q(`select kind, commission_minor::int c, fee_minor::int f from public.invoice_lines where invoice_id = $1 and booking_id = $2`, [inv4, b1]);
ok(lines4.length === 1 && lines4[0].kind === "fee_credit" && lines4[0].f === -1375, "paid-out booking clawed back: fee (-13.75) credited at once", JSON.stringify(lines4));
ok(!lines4.some((l) => l.kind === "commission_credit"), "...but no commission credit yet (paid out, not recovered)");
ok(inv4row.c === 10000 && inv4row.f === 0 && inv4row.t === 10000, "next invoice: 100 commission + 13.75 fee - 13.75 fee credit = 100 kr", JSON.stringify(inv4row));
await q(`select public.mark_payout_transferred($1, 'tr_test4')`, [p4]);
const finalBooking = async (h) => { const id = await book(h); await verify(id); await q(`select public.simulate_end_of_holding_period($1, $2)`, [id, owner]); return id; };
const monthPlus = async (n) => (await one(`select (date_trunc('month', now()) + make_interval(months => $1))::date m`, [n])).m;
const b5 = await finalBooking(9);
const inv5 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, await monthPlus(4)])).id;
const c5 = await one(`select commission_minor::int c from public.invoice_lines where invoice_id = $1 and booking_id = $2 and kind = 'commission_credit'`, [inv5, b1]);
ok(c5?.c === -10000, "after the payout that recovered it: commission (-100) credited");
ok(Number((await one(`select total_minor from public.business_invoices where id = $1`, [inv5])).total_minor) === 1375, "that invoice: 113.75 new booking - 100 commission credit = 13.75 kr");
ok((await one(`select count(*)::int n from public.invoice_lines where booking_id = $1 and kind <> 'booking' and active`, [b1])).n === 2, "each credit is given exactly once");
await q(`select public.attach_stripe_invoice($1, 'in_test5', 'https://invoice.stripe.com/i/test5', now() + interval '14 days')`, [inv5]);

section = "Clawback before payout: both credited at once, never paid to the promoter";
const b6 = await finalBooking(10);
const inv6 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, await monthPlus(5)])).id;
await q(`select public.attach_stripe_invoice($1, 'in_test6', 'https://invoice.stripe.com/i/test6', now() + interval '14 days')`, [inv6]);
await q(`select public.mark_invoice_paid('in_test6', now())`);
await q(`select public.fraud_clawback($1, $2, 'Booking made with a stolen identity')`, [b6, admin]);
const b7 = await finalBooking(11); const b8 = await finalBooking(12);
const inv7 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, await monthPlus(6)])).id;
const cr7 = await q(`select kind, commission_minor::int c, fee_minor::int f from public.invoice_lines where invoice_id = $1 and booking_id = $2 order by kind`, [inv7, b6]);
ok(cr7.length === 2 && cr7.some((l) => l.kind === "commission_credit" && l.c === -10000) && cr7.some((l) => l.kind === "fee_credit" && l.f === -1375), "never paid out: commission and fee credited on the next invoice", JSON.stringify(cr7));
ok(Number((await one(`select total_minor from public.business_invoices where id = $1`, [inv7])).total_minor) === 11375, "that invoice: 2 x 113.75 - 113.75 credits = 113.75 kr");
await q(`select public.prepare_payout($1, 'NOK', 'run-9')`, [alex]);
ok((await one(`select count(*)::int n from public.payout_items where booking_id = $1`, [b6])).n === 0, "clawed-back commission is never paid to the promoter");

section = "Original invoice still unpaid: no credit until Promly receives it";
const b9 = await finalBooking(13);
const inv8 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, await monthPlus(7)])).id;
await q(`select public.attach_stripe_invoice($1, 'in_test8', 'https://invoice.stripe.com/i/test8', now() + interval '14 days')`, [inv8]);
await q(`select public.fraud_clawback($1, $2, 'Duplicate fake booking found')`, [b9, admin]);
const b10 = await finalBooking(14);
const inv9 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, await monthPlus(8)])).id;
ok((await one(`select count(*)::int n from public.invoice_lines where invoice_id = $1 and booking_id = $2`, [inv9, b9])).n === 0, "invoice that charged it is unpaid: no credit yet");
await q(`select public.mark_invoice_paid('in_test8', now())`);
const b11 = await finalBooking(15); const b12 = await finalBooking(16); // two new charges, so the total stays above the credits
const inv10 = (await one(`select public.create_invoice_draft($1, $2) id`, [biz, await monthPlus(9)])).id;
ok((await one(`select count(*)::int n from public.invoice_lines where invoice_id = $1 and booking_id = $2 and kind in ('fee_credit', 'commission_credit')`, [inv10, b9])).n === 2, "once paid: fee and commission credited on the next invoice");
ok((await one(`select count(*)::int n from public.payout_items pi join public.invoice_lines l on l.id = pi.invoice_line_id where l.kind <> 'booking'`)).n === 0, "credit lines never reach payouts");
ok((await one(`select count(*)::int n from public.booking_settlement where booking_id = $1 and settlement_status = 'clawed_back'`, [b1])).n === 1, "status shows Clawed back");

section = "7-day verification rule";
const stale = await book(6);
await q(`update public.bookings set slot_start = now() - interval '8 days' where id = $1`, [stale]);
const fresh = await book(7);
ok((await one(`select public.cancel_unverified_bookings() n`)).n === 1, "only the booking >7 days past its time is cancelled");
ok((await one(`select status from public.bookings where id = $1`, [stale])).status === "cancelled" && (await one(`select status from public.bookings where id = $1`, [fresh])).status === "pending", "fresh booking untouched");

const as = async (uid, sql, params) => { await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`); try { return await q(sql, params); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); } };
const asErr = async (uid, sql, params) => { try { await as(uid, sql, params); return null; } catch (e) { await db.exec(`reset role`); return e.message; } };

section = "Age ratings (16+ / 18+)";
const legacyPromoter = await user("legacy@x.no", "promoter"); // existing account: no age band
ok((await one(`select age_rating from public.campaigns where id = $1`, [camp])).age_rating === "18+", "existing campaigns are 18+");
ok((await as(legacyPromoter, `select id from public.campaigns where id = $1`, [camp])).length === 1, "existing promoters (no age band) still see 18+ campaigns, as before");
const publishCamp = async (businessId, name, rating) => {
  const c = (await one(`insert into public.campaigns (business_id, service_name, price_minor, age_rating) values ($1, $2, 30000, $3) returning id`, [businessId, name, rating])).id;
  const a = (await one(`insert into public.agreements (campaign_id, commission_minor, payout_days, refund_window_days, business_accepted_at) values ($1, 5000, 14, 7, now()) returning id`, [c])).id;
  await q(`update public.campaigns set current_agreement_id = $1, status = 'published' where id = $2`, [a, c]);
  return { c, a };
};
const teen = await publishCamp(biz, "Teen Haircut", "16+");
await q(`select public.set_age_band($1, '16-17')`, [kid]);
ok((await as(kid, `select id from public.campaigns where id = $1`, [camp])).length === 0, "16-17 promoter can't see an 18+ campaign (RLS)");
ok((await as(kid, `select id from public.campaigns where id = $1`, [teen.c])).length === 1, "16-17 promoter sees a 16+ campaign");
ok((await as(kid, `select public.is_published_campaign($1) v`, [camp]))[0].v === false && (await as(alex, `select public.is_published_campaign($1) v`, [camp]))[0].v === true, "campaign photos follow the same age rule");
ok((await as(kid, `select id from public.businesses where id = $1`, [biz])).length === 1, "business row visible through the 16+ campaign");
ok((await asErr(kid, `insert into public.campaign_memberships (campaign_id, promoter_id, agreement_id) values ($1, $2, $3)`, [teen.c, kid, teen.a]))?.includes("guardian_payout_account_required"), "16-17 can't join before a guardian payout account exists");
ok((await err(`select public.save_stripe_account($1, 'acct_kid1', true, 'self', null)`, [kid]))?.includes("guardian_consent_required"), "16-17 promoter can't use their own account");
ok((await err(`select public.save_stripe_account($1, 'acct_kid1', true, 'guardian', null)`, [kid]))?.includes("guardian_consent_required"), "guardian account needs the consent timestamp");
await q(`select public.save_stripe_account($1, 'acct_kid1', false, 'guardian', now())`, [kid]);
ok((await asErr(kid, `insert into public.campaign_memberships (campaign_id, promoter_id, agreement_id) values ($1, $2, $3)`, [teen.c, kid, teen.a]))?.includes("guardian_payout_account_required"), "guardian onboarding not finished (payouts not enabled) -> still can't join");
await q(`select public.update_stripe_account_status('acct_kid1', true)`);
ok((await err(`insert into public.campaign_memberships (campaign_id, promoter_id, agreement_id) values ($1, $2, $3)`, [camp, kid, agr.id]))?.includes("campaign_is_18_plus"), "16-17 can't join an 18+ campaign, even with a guardian (join trigger)");
ok((await asErr(kid, `insert into public.campaign_memberships (campaign_id, promoter_id, agreement_id) values ($1, $2, $3)`, [teen.c, kid, teen.a])) === null, "16-17 with guardian consent + payouts enabled joins a 16+ campaign");
ok((await err(`update public.campaigns set age_rating = '18+' where id = $1`, [teen.c]))?.includes("minor_promoters_joined"), "can't raise to 18+ while 16-17 promoters have joined");
ok((await err(`update public.campaigns set age_restricted = true where id = $1`, [teen.c]))?.includes("age_restricted_campaign_is_18_plus"), "marking a campaign age-restricted forces 18+ (can't stay 16+)");
const other = (await one(`insert into public.campaigns (business_id, service_name, price_minor, age_restricted) values ($1, 'Wine tasting', 40000, true) returning id`, [biz])).id;
ok((await one(`select age_rating from public.campaigns where id = $1`, [other])).age_rating === "18+", "age-restricted campaign defaults to 18+");
ok((await err(`update public.campaigns set age_rating = '16+' where id = $1`, [other]))?.includes("age_restricted_campaign_is_18_plus"), "age-restricted campaign can't be lowered to 16+");
ok((await err(`update public.campaigns set age_restricted = false where id = $1`, [other]))?.includes("age_restriction_cannot_be_removed"), "age restriction can't be removed");
const club = (await one(`insert into public.businesses (owner_id, name, country, currency, category) values ($1, 'Club Oslo', 'NO', 'NOK', 'nightlife') returning id`, [owner])).id;
ok((await err(`insert into public.campaigns (business_id, service_name, price_minor, age_rating) values ($1, 'Entry', 20000, '16+')`, [club]))?.includes("age_restricted_campaign_is_18_plus"), "nightlife business: campaigns are always 18+");
ok((await err(`update public.businesses set category = 'club' where id = $1`, [biz]))?.includes("campaigns_rated_16_plus"), "a business with 16+ campaigns can't switch to an age-restricted category");
ok((await as(owner, `select id from public.campaigns where id = $1`, [teen.c])).length === 1, "business still sees its own campaigns");

section = "Access rules (RLS) as logged-in users";
ok((await as(alex, `select * from public.business_invoices`)).length === 0, "promoter can't see business invoices");
{ const n = (await as(owner, `select * from public.business_invoices`)).length; const all = (await one(`select count(*)::int n from public.business_invoices`)).n; ok(n === all && all >= 4, "business sees all of its own invoices", `sees ${n} of ${all}`); }
ok((await as(alex, `select * from public.invoice_lines`)).length >= 1 && (await as(kid, `select * from public.invoice_lines`)).length === 0, "invoice lines: own promoter only");
ok((await as(alex, `select * from public.payouts`)).length >= 1 && (await as(owner, `select * from public.payouts`)).length === 0, "payouts: own promoter only");
ok((await as(owner, `select * from public.promoter_age`)).length === 0 && (await as(kid, `select * from public.promoter_age`)).length === 1, "age band: owner only");
ok((await asErr(alex, `select * from public.stripe_events`))?.includes("permission denied"), "stripe_events: no client access");
ok((await asErr(alex, `select * from public.booking_settlement`))?.includes("permission denied"), "settlement view: server only");
ok((await asErr(alex, `select public.prepare_payout('${alex}', 'NOK', 'hack-1')`))?.includes("permission denied"), "clients can't run payout functions");
ok((await asErr(owner, `select public.mark_invoice_paid('in_test1', now())`))?.includes("permission denied"), "clients can't mark invoices paid");
ok((await asErr(alex, `insert into public.payouts (promoter_id, stripe_account_id, currency, amount_minor, idempotency_key) values ('${alex}', 'acct_x', 'NOK', 1, 'hack-key-123')`))?.includes("permission denied"), "clients can't write payouts");
ok((await asErr(owner, `update public.business_invoices set status = 'paid'`))?.includes("permission denied"), "clients can't edit invoices");
const svc = async (sql) => { await db.exec(`set role service_role`); try { return await q(sql); } finally { await db.exec(`reset role`); } };
ok((await svc(`select public.finalize_due_bookings() n`))[0].n === 0, "server role can run the functions");

section = "Agreement PDFs";
{
  const owner2 = await user("biz2@x.no", "business");
  const biz2 = (await one(`insert into public.businesses (owner_id, name, country, currency, category) values ($1, 'Other Barber', 'NO', 'NOK', 'barbershop') returning id`, [owner2])).id;
  const camp2 = (await one(`insert into public.campaigns (business_id, service_name, price_minor) values ($1, 'Other Cut', 40000) returning id`, [biz2])).id;
  // The server registers versions (clients have no insert grant on agreement_documents).
  const doc = async (campaignId) => (await one(`insert into public.agreement_documents (campaign_id, storage_path, sha256, size_bytes, file_name)
    values ('${campaignId}', '${campaignId}/' || gen_random_uuid()::text || '.pdf', repeat('a', 64), 1000, 'terms.pdf') returning id`)).id;
  const docMine = await doc(camp);
  const docMine2 = await doc(camp);
  const docOther = await doc(camp2);
  const draft = (await one(`insert into public.agreements (campaign_id, commission_minor, payout_days, refund_window_days) values ($1, 10000, 14, 7) returning id`, [camp])).id;

  // a) a PDF must belong to the same campaign as the agreement
  ok((await asErr(owner, `update public.agreements set document_id = '${docOther}' where id = '${draft}'`))?.includes("agreement_document_not_in_campaign"), "can't attach another business's PDF (update, as the business owner)");
  ok((await asErr(owner, `insert into public.agreements (campaign_id, commission_minor, payout_days, refund_window_days, document_id) values ('${camp}', 10000, 14, 7, '${docOther}')`))?.includes("agreement_document_not_in_campaign"), "can't attach another business's PDF (insert, as the business owner)");
  ok((await err(`update public.agreements set document_id = '${docOther}' where id = '${draft}'`))?.includes("agreement_document_not_in_campaign"), "same rule even for a superuser (it is a trigger, not just a policy)");
  ok((await asErr(owner, `update public.agreements set document_id = '${docMine}' where id = '${draft}'`)) === null, "the campaign's own PDF can be attached to a draft");
  ok((await asErr(owner, `update public.agreements set document_id = '${docMine2}' where id = '${draft}'`)) === null, "a draft can switch to a newer PDF version");
  ok((await asErr(owner2, `update public.agreements set document_id = '${docOther}' where id = '${draft}'`)) === null && (await one(`select document_id from public.agreements where id = $1`, [draft])).document_id === docMine2, "another business can't change my draft (RLS, no row updated)");

  // b) frozen once accepted
  await q(`update public.agreements set business_accepted_at = now() where id = $1`, [draft]);
  // As the owner, RLS ("owner edits until accepted") hides the accepted row from UPDATE: 0 rows change, no error.
  const frozenDoc = async () => (await one(`select document_id from public.agreements where id = $1`, [draft])).document_id;
  await asErr(owner, `update public.agreements set document_id = '${docMine}' where id = '${draft}'`);
  ok((await frozenDoc()) === docMine2, "accepted agreement: the business can't swap the PDF (RLS)");
  await asErr(owner, `update public.agreements set document_id = null where id = '${draft}'`);
  ok((await frozenDoc()) === docMine2, "accepted agreement: the business can't remove the PDF (RLS)");
  ok((await err(`update public.agreements set document_id = '${docMine}' where id = '${draft}'`))?.includes("agreement_is_accepted_and_cannot_change") && (await frozenDoc()) === docMine2, "accepted agreement: frozen even without RLS (trigger)");
  ok((await err(`update public.agreement_documents set sha256 = repeat('b', 64) where id = '${docMine2}'`))?.includes("agreement_document_is_immutable"), "a registered PDF version can never be edited");

  // The accepted PDF + hash is copied onto the membership when a promoter joins
  await q(`update public.campaigns set current_agreement_id = $1 where id = $2`, [draft, camp]);
  const joiner = await user("joiner@x.no", "promoter");
  await q(`update public.profiles set is_demo = true where id = $1`, [joiner]);
  await q(`insert into public.campaign_memberships (campaign_id, promoter_id, agreement_id) values ($1, $2, $3)`, [camp, joiner, draft]);
  const mem = await one(`select agreement_document_id, agreement_document_sha256 from public.campaign_memberships where promoter_id = $1 and campaign_id = $2`, [joiner, camp]);
  ok(mem.agreement_document_id === docMine2 && mem.agreement_document_sha256 === "a".repeat(64), "joining records the accepted PDF version and its hash");

  // Who can read the registered versions
  const seen = async (uid, id) => (await as(uid, `select id from public.agreement_documents where id = '${id}'`)).length;
  ok((await seen(owner, docMine)) === 1 && (await seen(owner2, docMine)) === 0, "PDF rows: owner sees them, another business doesn't");
  ok((await seen(owner2, docOther)) === 1 && (await seen(owner, docOther)) === 0, "PDF rows: the other business sees only its own");
  ok((await seen(joiner, docMine2)) === 1 && (await seen(joiner, docMine)) === 0, "PDF rows: promoter sees only the version in the accepted agreement");
  ok((await asErr(owner, `insert into public.agreement_documents (campaign_id, storage_path, sha256, size_bytes) values ('${camp}', '${camp}/${camp}.pdf', repeat('a', 64), 100)`))?.includes("permission denied"), "clients can't register PDF versions");
}

section = "Demo purge with payments data present";
const purgeErr = await err(`select public.purge_demo_data()`);
ok(purgeErr === null, "purge_demo_data succeeds", purgeErr ?? "");
const left = await one(`select (select count(*)::int from public.business_invoices) i, (select count(*)::int from public.payouts) p, (select count(*)::int from public.bookings) b, (select count(*)::int from public.stripe_accounts) a`);
ok(left.i === 0 && left.p === 0 && left.b === 0, "demo invoices, payouts and bookings gone");
ok(left.a === 2 && (await one(`select count(*)::int n from public.stripe_accounts where stripe_account_id in ('acct_alex1', 'acct_kid1')`)).n === 2, "both promoters' Stripe account links are kept (onboarding not repeated)", JSON.stringify(left));
return results;
}
