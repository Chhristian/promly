/** Shared helpers for the login / sign-up forms (browser side). */

export const AUTH_TIMEOUT_MS = 10_000;

export const TOO_SLOW =
  "This is taking longer than it should. Check your internet connection and try again. If it keeps happening, reload the page.";

/** Reject if the promise takes longer than ms. */
export function withTimeout<T>(promise: Promise<T>, ms = AUTH_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(TOO_SLOW)), ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Plain-English versions of Supabase auth errors. */
export function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match.";
  if (/already registered|already exists/i.test(message)) return "An account with this email already exists. Log in instead.";
  if (/password should be|weak password/i.test(message)) return "Choose a stronger password (at least 8 characters).";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  if (/failed to fetch|network/i.test(message)) return "Can't reach the server. Check your internet connection.";
  return message;
}

/**
 * After a successful login/sign-up: do a full page load to /dashboard so the
 * new session cookie is always sent, and the server decides where to go.
 */
export function goToDashboard() {
  window.location.assign("/dashboard");
}
