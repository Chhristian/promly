import "server-only";

import { signedPhotoUrls } from "@/lib/photos";
import { demoAssetPath } from "@/lib/demo-illustrative";

/**
 * Generated images for ILLUSTRATIVE demo profiles and businesses (scripts/demo-assets.mjs).
 * Real accounts never get one; anything missing simply falls back to initials.
 */
export async function demoAvatarUrls(profiles: { display_name: string; is_demo?: boolean | null }[]): Promise<Record<string, string>> {
  const demo = profiles.filter((p) => p.is_demo && p.display_name);
  if (!demo.length) return {};
  const signed = await signedPhotoUrls(demo.map((p) => demoAssetPath.avatar(p.display_name)));
  const out: Record<string, string> = {};
  for (const p of demo) {
    const url = signed[demoAssetPath.avatar(p.display_name)];
    if (url) out[p.display_name] = url;
  }
  return out;
}

/** The generated tile of a demo business (stored in businesses.logo_url as a library path). */
export async function demoBusinessImage(b: { logo_url: string | null; is_demo: boolean }): Promise<string | null> {
  if (!b.is_demo || !b.logo_url?.startsWith("demo-assets/")) return null;
  return (await signedPhotoUrls([b.logo_url]))[b.logo_url] ?? null;
}
