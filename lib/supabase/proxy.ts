import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import { GLANS_DEMO_PATH, GLANS_REF_COOKIE, GLANS_REF_COOKIE_MAX_AGE, demoModeOn, isReferralCode } from "../conversions";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If the env vars are not set, skip proxy check. You can remove this
  // once you setup the project.
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Public pages: landing, auth, and the customer referral + booking pages.
  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/" ||
    path.startsWith("/auth") ||
    path.startsWith("/r/") ||
    path.startsWith("/book/") ||
    path === "/api/stripe/webhook" || // Stripe calls it; every request must carry a valid Stripe signature
    path === "/api/conversions" || // businesses' own systems call it; every request must carry a valid HMAC signature
    path === GLANS_DEMO_PATH; // fictional demo business checkout (Demo Mode only, 404 otherwise)

  if (!user && !isPublic) {
    // no user, potentially respond by redirecting the user to the login page
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Glans demo: keep the ?ref= from Promly in a cookie for 30 days (an extra
  // cookie on the same response; the Supabase cookies are left as they are).
  const ref = request.nextUrl.searchParams.get("ref");
  if (path === GLANS_DEMO_PATH && demoModeOn() && isReferralCode(ref)) {
    supabaseResponse.cookies.set(GLANS_REF_COOKIE, ref, {
      maxAge: GLANS_REF_COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: GLANS_DEMO_PATH,
    });
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // If you're creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
