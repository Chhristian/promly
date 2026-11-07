"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <Button variant="secondary" size="sm" onClick={logout} aria-label="Log out" className="rounded-full">
      <LogOut className="h-4 w-4" />
      <span className="hidden sm:inline">Log out</span>
    </Button>
  );
}
