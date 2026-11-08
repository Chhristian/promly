import Link from "next/link";
import { PromlyLogo } from "@/components/promly-logo";
import { LogoutButton } from "@/components/logout-button";
import { LiveProvider, LiveStatus } from "@/components/live";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { MarketPicker } from "@/components/market-picker";
import type { MarketKey } from "@/lib/market";

export function AppShell({
  nav,
  userName,
  roleLabel,
  role,
  home,
  market,
  avatarUrl,
  children,
}: {
  nav: NavItem[];
  userName: string;
  roleLabel: string;
  role: "business" | "promoter" | "admin";
  home: string;
  /** Show the market picker (Oslo/NOK, Mallorca/EUR) with this choice selected. */
  market?: MarketKey;
  /** Generated avatar for illustrative demo profiles; others show their initial. */
  avatarUrl?: string | null;
  children: React.ReactNode;
}) {
  return (
    <LiveProvider role={role}>
      <div className="min-h-screen overflow-x-clip">
        <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
            <PromlyLogo href={home} />
            <nav className="hidden flex-1 justify-center md:flex">
              <NavLinks items={nav} />
            </nav>
            <div className="ml-auto flex items-center gap-2 md:ml-0">
              {market && <MarketPicker current={market} className="hidden sm:inline-flex" />}
              <LiveStatus />
              <Link href={home} className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-secondary lg:flex">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" width={32} height={32} className="h-8 w-8 rounded-full" data-testid="header-avatar" />
                ) : (
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-ink text-xs font-bold text-white">
                    {(userName[0] ?? "?").toUpperCase()}
                  </span>
                )}
                <span className="max-w-[11rem] text-left text-xs leading-tight">
                  <span className="block truncate font-semibold">{userName}</span>
                  <span className="block text-muted-foreground">{roleLabel}</span>
                </span>
              </Link>
              <LogoutButton />
            </div>
          </div>
          <nav className="border-t border-border px-3 py-2 md:hidden">
            <NavLinks items={nav} />
            {market && <MarketPicker current={market} className="mt-2 sm:hidden" />}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
        <footer className="mx-auto max-w-6xl px-4 pb-8 text-xs text-muted-foreground" data-testid="demo-data-note">
          Illustrative demo data: the businesses, campaigns and promoters shown are fictional.
        </footer>
      </div>
    </LiveProvider>
  );
}
