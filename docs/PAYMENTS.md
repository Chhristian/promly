# Payments and settlement

Stripe **test mode only** until a lawyer and an accountant have reviewed this. Everything here sits behind the
feature flag `PAYMENTS_ENABLED`. With the flag off, the app behaves exactly as before (the stage demo is unchanged).

## The rules

1. **Promly never takes the customer's payment.** The customer pays the business directly at the appointment.
   Promly never pays a promoter money the business hasn't paid in, and never fronts commission.
2. **Commission becomes final 14 days after the business verifies the service.** This replaces the per-campaign
   refund window for new agreements; old bookings keep their stored terms and keep working.
   - A refund **within** the 14 days reverses the commission and the fee with new ledger rows. Old rows are never edited.
   - **After** 14 days the promoter keeps the commission and Promly keeps the fee. Later refunds or claims are between
     the business and its customer.
   - Only exception: an **admin-only fraud clawback** with a required written reason, recorded in the ledger.
     The promoter's commission is reversed (netted against later payouts if already paid out), and the 2.75% fee is
     credited back to the business on its next invoice.
3. **Statuses, each with a date:** Pending (inside the 14 days) → Final → Invoiced → Paid by business → Paid out.
4. **One Stripe invoice per business per month.** A line per booking: the commission that became final, plus Promly's
   2.75% fee on the booking price. Stripe-hosted invoice page, due in 14 days, **bank transfer first, card as a
   fallback**. No per-booking card charges.
   - A service must be verified within **7 days** of the appointment, or the booking counts as cancelled.
   - Unpaid after the due date → the business's published campaigns pause, and promoters see
     "Awaiting business payment". Paying the invoice un-pauses them.
   - The business is liable for its own payment disputes (chargebacks on a card payment of a Promly invoice).
5. **Promoters are paid through Stripe Connect** (Express Dashboard, Stripe-hosted onboarding). Promly stores
   **only** the Stripe account id and whether payouts are enabled, never bank details or ID documents.
   - Monthly payout run: only commission from invoices the business has **paid**.
   - Every Stripe call carries an idempotency key.
   - Minimum payout 300 NOK / 30 EUR: Promly transfers every month (so it never holds promoter money past the
     run), and the minimum applies only to the payout from the promoter's Stripe balance to their bank.
6. **Age.** Promoters confirm an age band at sign-up: **16-17** or **18+** (under 16 can't use Promly). No birth dates
   are stored; Stripe verifies age during onboarding.
   - 18+ promoters are paid to **their own** Stripe account.
   - 16-17 promoters can join only **16+ campaigns**, and only after a **parent or guardian** has completed Stripe
     onboarding as the payout account holder and confirmed consent (timestamp stored). Promly never holds money for
     someone it can't pay.
   - Enforced in the database (visibility rules + the join trigger), not just in the UI.
7. **Agreement template:** these terms are added as template version `promly-standard-v2`. The label
   "Agreement template, to be reviewed by a lawyer before real use" stays.

## Campaign age ratings

- Each campaign is **16+** or **18+**, chosen by the business. Default **18+**; every campaign created before this
  change is 18+.
- Age-restricted campaigns are **always 18+** and can't be lowered: businesses in the nightlife, club or alcohol
  categories, and any campaign the business marks as age-restricted (that mark can't be removed).
- A campaign can't be raised from 16+ to 18+ while 16-17 promoters have joined it, and a business with 16+ campaigns
  can't switch to an age-restricted category.
- 16-17 promoters don't see 18+ campaigns (or their photos) and can't join them.
- Existing promoter accounts have no age band yet; they keep seeing and joining what they did before. Payout setup
  asks for the age band first.

## How the money moves

```
Customer ──pays at appointment──▶ Business            (outside Promly and Stripe)

Business ──monthly Stripe invoice──▶ Promly's Stripe balance
          (commission + 2.75% fee)

Promly  ──transfer (only after invoice.paid, from available funds)──▶ Promoter's Stripe account ──▶ bank
          keeps the fee
```

Stripe calls this a marketplace with **separate charges and transfers**:

- Businesses are normal Stripe **Customers** of Promly (not connected accounts).
- Promoters are **connected accounts** set up to receive transfers, with the Express Dashboard.
  Promly owns pricing and loss liability (required for this model).
- Transfers are made **only after `invoice.paid`** and only from funds already available in Promly's balance.
  We **never** use `source_transaction` for bank-transfer payments: if such a payment later failed, Stripe would pay
  the promoter from Promly's own balance, which would be fronting commission (rule 1).
- Only the verified Stripe webhook marks an invoice paid.

## Statuses and dates

| Status | Meaning | Date shown |
|---|---|---|
| Pending | Verified, inside the 14 days; can still be refunded | `verified_at` (+ final on `verified_at + 14 days`) |
| Final | 14 days passed; commission can't be reversed except by fraud clawback | `final_at` |
| Invoiced | On the business's monthly invoice | invoice `finalized_at` |
| Paid by business | Stripe confirmed the invoice payment (webhook) | invoice `paid_at` |
| Paid out | Transferred to the promoter's Stripe account | payout `transferred_at` |
| Awaiting business payment | The invoice is past its due date | invoice `due_at` |

## Decisions (8 Nov 2026)

1. **Norway only for now.** Spanish promoters can't receive cross-border transfers on the transfers-only account
   agreement. **TODO before the Mallorca pilot:** onboard Spanish promoters on Stripe's full account agreement.
2. **Monthly transfers, minimum on the bank payout** (see rule 5). Stripe allows holding funds for at most 90 days
   outside the US; this design never gets close.
3. **Bank transfer first, card as a fallback** for invoices. The business agreement makes the business liable for its
   own payment disputes.

## Secrets

- `STRIPE_SECRET_KEY` in `.env.local` and on Vercel (preview + production). Test key only.
  TODO: replace the full `sk_test_` key with a restricted `rk_test_` key (permissions in the morning report).
- `STRIPE_WEBHOOK_SECRET` (`whsec_…`) for verifying webhook signatures.
- Never printed, never committed.

## Open questions for the lawyer and accountant

- VAT (MVA) on Promly's 2.75% fee.
- Is the commission line Promly's own revenue, or money collected on the promoter's behalf?
- Reporting payments to individual promoters to Skatteetaten.
- Can a parent or guardian receive payouts for a minor (16-17)? Who is taxed on that income, and what consent wording
  is needed?
- Fraud clawback: the commission the business paid for a fraudulent booking is reversed from the promoter but not yet
  returned to the business (only the fee is credited). Should it be?

## Phase 2 (app code, after the migration)

- Business campaign editor: 16+ / 18+ choice and an "age-restricted" tick (locked to 18+ where required).
- Promoter sign-up: age band (16-17 / 18+). Payout setup: own account (18+) or guardian onboarding + consent (16-17).
- Fraud clawback admin action; the fee credit appears on the business's next invoice automatically.
- Billing tab, Earnings statuses, webhook, Demo Control Center test-mode buttons, tests (see the morning report).
