"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AUTH_TIMEOUT_MS, TOO_SLOW, friendlyAuthError, goToDashboard, withTimeout } from "@/lib/auth-client";
import { PasswordInput } from "@/components/password-input";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (watchdog.current) clearTimeout(watchdog.current);
  }, []);

  const handleLogin = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    // Never spin forever: if we're still on this page after ~15 s, say so.
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = setTimeout(() => {
      setIsLoading(false);
      setError(TOO_SLOW);
    }, AUTH_TIMEOUT_MS + 500);

    try {
      const { error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }));
      if (error) throw error;
      // Full page load: /dashboard sends business users to /business, promoters to /promoter,
      // and accounts without a profile to /onboarding.
      goToDashboard();
    } catch (error: unknown) {
      if (watchdog.current) clearTimeout(watchdog.current);
      setError(friendlyAuthError(error instanceof Error ? error.message : "Something went wrong."));
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Log in to your Promly account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? "Logging in…" : error === TOO_SLOW ? "Try again" : "Log in"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/auth/sign-up"
                className="underline underline-offset-4"
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
