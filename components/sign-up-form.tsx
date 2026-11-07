"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AUTH_TIMEOUT_MS, TOO_SLOW, friendlyAuthError, goToDashboard, withTimeout } from "@/lib/auth-client";

type Role = "business" | "promoter";

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [role, setRole] = useState<Role>("promoter");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const watchdog = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (watchdog.current) clearTimeout(watchdog.current);
  }, []);

  const handleSignUp = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);
    if (watchdog.current) clearTimeout(watchdog.current);
    watchdog.current = setTimeout(() => {
      setIsLoading(false);
      setError(TOO_SLOW);
    }, AUTH_TIMEOUT_MS + 500);

    if (password !== repeatPassword) {
      if (watchdog.current) clearTimeout(watchdog.current);
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email,
        password,
        options: {
          // Read by the database's sign-up trigger to create the profile.
          data: { role, display_name: displayName.trim() },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      }));
      if (error) throw error;
      // Supabase hides "email already registered" by returning a user with no identities.
      if (data.user && data.user.identities?.length === 0) throw new Error("already registered");
      if (data.session) {
        goToDashboard();
      } else {
        if (watchdog.current) clearTimeout(watchdog.current);
        router.push("/auth/sign-up-success");
      }
    } catch (error: unknown) {
      if (watchdog.current) clearTimeout(watchdog.current);
      setError(friendlyAuthError(error instanceof Error ? error.message : "Something went wrong."));
      setIsLoading(false);
    }
  };

  const roleButton = (value: Role, title: string, hint: string) => (
    <button
      type="button"
      onClick={() => setRole(value)}
      className={cn(
        "rounded-lg border p-3 text-left transition",
        role === value ? "border-primary bg-primary/15" : "border-border hover:bg-secondary",
      )}
      aria-pressed={role === value}
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </button>
  );

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create your account</CardTitle>
          <CardDescription>Are you a business or a promoter?</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-2">
                {roleButton("business", "Business", "I want customers")}
                {roleButton("promoter", "Promoter", "I want to earn")}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="display-name">{role === "business" ? "Your name" : "Name shown to businesses"}</Label>
                <Input
                  id="display-name"
                  required
                  maxLength={80}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="repeat-password">Repeat password</Label>
                <Input id="repeat-password" type="password" required value={repeatPassword} onChange={(e) => setRepeatPassword(e.target.value)} />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button type="submit" className="bg-brand h-11 w-full text-white" disabled={isLoading}>
                {isLoading ? "Creating account..." : "Sign up"}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="underline underline-offset-4">
                Log in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
