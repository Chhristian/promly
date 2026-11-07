import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export const PHOTO_BUCKET = "campaign-photos";
const TTL_S = 3600;
const REUSE_MS = 50 * 60 * 1000;

// Reuse signed URLs across renders so real-time refreshes don't re-download images.
const cache = new Map<string, { url: string; until: number }>();

/**
 * Signed, temporary URLs for campaign photos (the bucket is private).
 * Callers must only pass photos the viewer may see: their own campaign's,
 * or a published campaign's.
 */
export async function signedPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now();
  const out: Record<string, string> = {};
  const missing: string[] = [];
  for (const p of new Set(paths)) {
    const hit = cache.get(p);
    if (hit && hit.until > now) out[p] = hit.url;
    else missing.push(p);
  }
  if (missing.length) {
    const { data } = await createAdminClient().storage.from(PHOTO_BUCKET).createSignedUrls(missing, TTL_S);
    for (const d of data ?? []) {
      if (d.path && d.signedUrl) {
        out[d.path] = d.signedUrl;
        cache.set(d.path, { url: d.signedUrl, until: now + REUSE_MS });
      }
    }
  }
  return out;
}

/** Cover URL (first photo) per campaign. */
export async function coverUrls<T extends { id: string; photo_paths?: string[] | null }>(campaigns: T[]): Promise<Record<string, string>> {
  const firsts = campaigns.flatMap((c) => (c.photo_paths?.[0] ? [c.photo_paths[0]] : []));
  const signed = firsts.length ? await signedPhotoUrls(firsts) : {};
  const out: Record<string, string> = {};
  for (const c of campaigns) if (c.photo_paths?.[0] && signed[c.photo_paths[0]]) out[c.id] = signed[c.photo_paths[0]];
  return out;
}
