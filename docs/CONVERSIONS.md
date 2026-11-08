# Conversions API: `POST /api/conversions`

A business with its own booking or checkout system (a campaign with an **external booking link**) tells Promly that a customer who came through a promoter's link has **paid**. Promly then records the booking and verifies it, the same as clicking **Verify service completed**, so the promoter's commission becomes **pending** with the agreement's normal refund window.

## Turning it on

Set `CONVERSIONS_SECRET` (a long random string) on the server and in the business's system. Without it, the endpoint answers `503 conversions_disabled`.

## Request

```
POST /api/conversions
Content-Type: application/json
X-Promly-Timestamp: 1762590000
X-Promly-Signature: sha256=<hex>
```

```json
{
  "ref": "abc123def4",
  "external_id": "order-1001",
  "amount_minor": 50000,
  "customer_name": "Kari Nordmann",
  "customer_phone": "+47 400 00 000",
  "status": "paid"
}
```

- `ref`: the promoter's referral code, the `?ref=` value Promly adds to the business's booking link.
- `external_id`: the order or booking id in the business's system. It is used for idempotency: sending the same id again does nothing new.
- `amount_minor`: the paid amount in øre/cents. It must equal the campaign price, because the commission and fee are frozen from that price.
- `status`: only `"paid"` is supported.

**Signature:** `hex(HMAC-SHA256(CONVERSIONS_SECRET, "<timestamp>.<raw body>"))`, where `timestamp` is unix seconds. Requests more than 5 minutes off are rejected, so old requests can't be replayed.

```js
const crypto = require("crypto");
const body = JSON.stringify(payload);
const ts = Math.floor(Date.now() / 1000);
const sig = "sha256=" + crypto.createHmac("sha256", process.env.CONVERSIONS_SECRET).update(`${ts}.${body}`).digest("hex");
await fetch("https://promly-eight.vercel.app/api/conversions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Promly-Timestamp": String(ts), "X-Promly-Signature": sig },
  body,
});
```

## What happens

1. The `ref` is looked up: referral link → campaign → business. The campaign must be **published** and have an **external booking link**.
2. If this `external_id` was seen before, the endpoint returns that booking (`duplicate: true`).
3. If the customer (same phone number) already has a pending booking from this promoter's link, for example from the referral page, that booking is used. Otherwise `create_external_referral` creates one, with terms frozen exactly as on the booking page.
4. `verify_booking` runs as the business owner. The commission is pending until the refund window ends, and then released as usual. All money maths are the existing database functions.

The `external_id` is stored in the business's "New referral" notification payload, so no database migration was needed.

## Responses

| Status | Body | Meaning |
|---|---|---|
| 200 | `{ booking_id, status: "verified", refund_window_ends_at, payout_at, duplicate }` | Done (or already done) |
| 400 | `invalid_json`, `invalid_body` (+ `field`, `message`) | Malformed request |
| 401 | `signature_missing`, `signature_invalid`, `signature_stale` | Rejected, nothing was read |
| 404 | `referral_link_not_found` | Unknown `ref` |
| 409 | `attributed_to_other_promoter` | This customer was already referred by another promoter for this campaign |
| 409 | `customer_already_converted` | This customer already converted under another `external_id` (one active booking per customer per campaign) |
| 409 | `booking_not_pending` | The booking was refunded or cancelled |
| 413 | `body_too_large` | Over 16 KB |
| 422 | `campaign_not_published`, `no_external_url`, `amount_mismatch` (+ `expected_amount_minor`), invalid `status` | Not accepted |
| 503 | `conversions_disabled` | `CONVERSIONS_SECRET` is not set |
| 500 | `internal_error` | Safe to retry with the same `external_id` |
