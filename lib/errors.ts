/** Turn database error codes (raised by our triggers and functions) into plain English. */
const MESSAGES: Record<string, string> = {
  agreement_required_to_publish: "Accept the agreement before publishing.",
  agreement_not_accepted_for_this_campaign: "That agreement isn't accepted for this campaign.",
  agreement_is_accepted_and_cannot_change: "An accepted agreement can't be changed. Accept a new version instead.",
  commission_exceeds_price: "The commission can't be higher than the price.",
  invalid_agreement_for_campaign: "This campaign's agreement has changed. Reload and try again.",
  referral_link_not_found: "This referral link doesn't exist.",
  campaign_not_published: "This campaign isn't accepting bookings right now.",
  slot_in_past: "That time has already passed. Pick another time.",
  slot_not_offered: "That time isn't available. Pick another time.",
  slot_taken: "Someone just booked that time. Pick another time.",
  booking_not_found: "Booking not found.",
  not_booking_owner: "You can only manage bookings for your own business.",
  booking_not_pending: "This booking can't be verified in its current state.",
  booking_not_verified: "Verify the service first.",
  refund_window_not_over: "The refund window hasn't ended yet.",
  already_paid_out: "This commission has already been paid out and can't be refunded here.",
  booking_cancelled: "This booking was cancelled.",
  invalid_photo_path: "That photo doesn't belong to this campaign.",
  campaigns_max_3_photos: "Up to 3 photos per campaign.",
  duplicate_referral: "This phone number already has an active booking for this offer.",
  self_referral: "You can't use your own referral link.",
  cannot_promote_own_business: "You can't promote your own business.",
  consent_required: "Tick the box to share your details with the business.",
  no_external_url: "This offer isn't set up for outside booking.",
  discount_code_not_found: "No promoter has that code.",
  campaigns_external_booking_url_https: "The booking link must start with https://",
  // Payments and age ratings
  billing_overdue: "An invoice is overdue, so campaigns can't go live until it's paid. See Billing.",
  age_restricted_campaign_is_18_plus: "Age-restricted campaigns (nightlife, clubs, alcohol) are always 18+.",
  age_restriction_cannot_be_removed: "An age-restricted campaign stays 18+.",
  minor_promoters_joined: "Promoters aged 16-17 have joined this campaign, so it can't change to 18+.",
  campaigns_rated_16_plus: "Change your 16+ campaigns to 18+ before switching to this category.",
  campaign_is_18_plus: "This campaign is 18+ only.",
  guardian_payout_account_required: "A parent or guardian needs to set up your payout account first (see Earnings).",
  commission_is_final: "This commission is final (14 days after verification), so it can't be refunded here.",
  already_invoiced: "This booking is already on an invoice.",
  under_18: "Payouts to your own account are for 18+. A parent or guardian can hold the account.",
  age_band_required: "Confirm your age first.",
};

export function friendlyError(error: { message?: string; code?: string } | null | undefined): string {
  if (!error) return "Something went wrong.";
  const msg = error.message ?? "";
  for (const [code, text] of Object.entries(MESSAGES)) if (msg.includes(code)) return text;
  if (error.code === "23505") return "That already exists.";
  if (error.code === "42501" || /row-level security|permission denied/i.test(msg)) return "You don't have permission to do that.";
  return "Something went wrong. Please try again.";
}
