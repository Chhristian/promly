import Link from "next/link";
import { PromlyLogo } from "@/components/promly-logo";
import { LogoutButton } from "@/components/logout-button";
import { LiveProvider, LiveStatus } from "@/components/live";
import { NavLinks, type NavItem } from "@/components/nav-links";

export function AppShell({
  nav,
  userName,
  roleLabel,
  role,
  home,
  children,
}: {
  nav: NavItem[];
  userName: string;
  roleLabel: string;
  role: "business" | "promoter" | "admin";
  home: string;
  children: React.ReactNode;
}) {
  return (
    <LiveProvider role={role}>
      <div className="min-h-screen overflow-x-clip">
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
            <PromlyLogo href={home} />
            <nav className="hidden flex-1 md:flex">
              <NavLinks items={nav} />
            </nav>
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              <LiveStatus />
              <Link href={home} className="hidden items-center gap-2 rounded-full border border-border py-1 pl-1 pr-3 lg:flex">
                <span className="bg-brand grid h-7 w-7 place-items-center rounded-full text-xs font-bold text-white">
                  {(userName[0] ?? "?").toUpperCase()}
                </span>
                <span className="text-left text-xs leading-tight">
                  <span className="block font-semibold">{userName}</span>
                  <span className="block text-muted-foreground">{roleLabel}</span>
                </span>
              </Link>
              <LogoutButton />
            </div>
          </div>
          <nav className="border-t border-border/40 px-2 py-1.5 md:hidden">
            <NavLinks items={nav} />
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
      </div>
    </LiveProvider>
  );
}
