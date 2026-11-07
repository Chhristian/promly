import Link from "next/link";
import { PromlyLogo } from "@/components/promly-logo";
import { LogoutButton } from "@/components/logout-button";
import { LiveProvider, LiveStatus } from "@/components/live";

type NavItem = { href: string; label: string };

export function AppShell({
  nav,
  userName,
  roleLabel,
  home,
  children,
}: {
  nav: NavItem[];
  userName: string;
  roleLabel: string;
  home: string;
  children: React.ReactNode;
}) {
  return (
    <LiveProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <PromlyLogo href={home} />
            <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
              {nav.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="whitespace-nowrap rounded-md px-3 py-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <LiveStatus />
            <div className="hidden text-right text-xs md:block">
              <div className="font-medium">{userName}</div>
              <div className="text-muted-foreground">{roleLabel}</div>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </div>
    </LiveProvider>
  );
}
