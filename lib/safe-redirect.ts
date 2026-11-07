/**
 * Only allow redirects to a path on this site. Anything else (full URLs,
 * protocol-relative "//evil.com", backslash tricks, control characters) falls back.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\\]/.test(next)) return fallback;
  // Resolve against a dummy origin: if it leaves that origin, it isn't a local path.
  try {
    const url = new URL(next, "https://promly.invalid");
    if (url.origin !== "https://promly.invalid") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
