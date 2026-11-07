"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { BadgeCheck, CalendarCheck, RefreshCw, Undo2, UserPlus, Wallet, X, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatMinor, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";

type Status = "connecting" | "live" | "offline";
type Role = "business" | "promoter" | "admin";
type Toast = { id: string; title: string; body?: string; icon: LucideIcon; tone: "default" | "money" | "warn"; leaving?: boolean };
const TOAST_EXIT_MS = 160;

type LiveState = {
  status: Status;
  recent: Set<string>;
  refresh: () => void;
  moneyPulse: number; // changes each time a commission really becomes available
};

const LiveContext = createContext<LiveState>({ status: "connecting", recent: new Set(), refresh: () => {}, moneyPulse: 0 });

const TABLES = ["campaigns", "campaign_memberships", "bookings", "ledger_entries", "notifications"] as const;
const HIGHLIGHT_MS = 8000;

/**
 * Subscribes to database changes (RLS-filtered on the server, so users only
 * get their own rows), re-renders the page with fresh server data, and shows
 * toasts. Every toast and highlight comes from a real database event.
 */
export function LiveProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const [recent, setRecent] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [moneyPulse, setMoneyPulse] = useState(0);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOffline = useRef(false);
  const toasted = useRef(new Set<string>());

  const refresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 300);
  }, [router]);

  const pushToast = useCallback((t: Toast, ms: number) => {
    if (toasted.current.has(t.id)) return;
    toasted.current.add(t.id);
    setToasts((prev) => [...prev.slice(-3), t]);
    // Fade out just before removal, so toasts leave instead of vanishing.
    setTimeout(() => setToasts((prev) => prev.map((x) => (x.id === t.id ? { ...x, leaving: true } : x))), ms - TOAST_EXIT_MS);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), ms);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), TOAST_EXIT_MS);
  }, []);

  const handleToast = useCallback(
    (table: string, event: string, row: Record<string, unknown>) => {
      if (table === "notifications" && event === "INSERT") {
        const type = String(row.type);
        const title = String(row.title ?? "");
        const payload = (row.payload ?? {}) as Record<string, unknown>;
        const id = `n-${row.id}`;
        if (type === "commission_available") {
          const amount = Number(payload.amount_minor);
          const cur = (payload.currency as Currency) ?? "NOK";
          setMoneyPulse(Date.now());
          pushToast({ id, icon: Wallet, tone: "money", title: `+${formatMinor(amount, cur)} available`, body: "Commission ready for payout" }, 9000);
        } else if (type === "promoter_joined") {
          pushToast({ id, icon: UserPlus, tone: "default", title, body: "A new promoter is sharing your campaign" }, 6000);
        } else if (type === "booking_created") {
          pushToast({ id, icon: CalendarCheck, tone: "default", title, body: "Open Bookings to see the details" }, 6000);
        } else if (type === "booking_verified") {
          const amount = Number(payload.amount_minor);
          const cur = (payload.currency as Currency) ?? "NOK";
          pushToast({ id, icon: BadgeCheck, tone: "default", title: "Conversion verified", body: `${formatMinor(amount, cur)} commission pending` }, 6000);
        } else if (type === "booking_refunded") {
          pushToast({ id, icon: Undo2, tone: "warn", title: "Booking refunded", body: "The commission was reversed" }, 6000);
        }
      }
      // Business: confirm "Verified" when the booking row really changes to verified.
      if (role === "business" && table === "bookings" && event === "UPDATE" && row.status === "verified" && !row.released_at && row.verified_at) {
        const fresh = Date.now() - new Date(String(row.verified_at)).getTime() < 60_000;
        if (fresh) {
          pushToast(
            {
              id: `v-${row.id}`,
              icon: BadgeCheck,
              tone: "default",
              title: "Service verified",
              body: `${formatMinor(Number(row.commission_minor), row.currency as Currency)} commission pending until the refund window ends`,
            },
            6000,
          );
        }
      }
    },
    [pushToast, role],
  );

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel | null = null;
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);

      channel = supabase.channel(`promly-live-${Math.random().toString(36).slice(2)}`);
      for (const table of TABLES) {
        channel.on("postgres_changes", { event: "*", schema: "public", table }, (payload) => {
          const row = (payload.new && Object.keys(payload.new).length ? payload.new : payload.old) as Record<string, unknown>;
          const nested = (row?.payload ?? {}) as Record<string, unknown>;
          const ids = [row?.id, row?.booking_id, row?.campaign_id, nested.booking_id, nested.campaign_id]
            .filter((v) => v !== undefined && v !== null)
            .map(String);
          if (ids.length) {
            setRecent((prev) => new Set([...prev, ...ids]));
            setTimeout(() => {
              setRecent((prev) => {
                const next = new Set(prev);
                ids.forEach((i) => next.delete(i));
                return next;
              });
            }, HIGHLIGHT_MS);
          }
          handleToast(table, payload.eventType, row ?? {});
          refresh();
        });
      }
      channel.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setStatus("live");
          if (wasOffline.current) refresh();
          wasOffline.current = false;
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
          wasOffline.current = true;
        }
      });
    })();

    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh, handleToast]);

  return (
    <LiveContext.Provider value={{ status, recent, refresh, moneyPulse }}>
      {children}
      <Toasts toasts={toasts} onClose={dismissToast} />
    </LiveContext.Provider>
  );
}

function Toasts({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[24rem]" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.icon;
        return (
          <div
            key={t.id}
            role="status"
            data-testid={t.tone === "money" ? "money-toast" : "toast"}
            className={cn(
              t.leaving ? "toast-out" : "toast-in",
              "pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-2xl backdrop-blur",
              t.tone === "money"
                ? "border-emerald-400/60 bg-gradient-to-br from-emerald-500/30 via-[#0f1430]/95 to-violet-600/30 shadow-emerald-500/20"
                : t.tone === "warn"
                  ? "border-red-400/40 bg-[#1a1020]/95"
                  : "border-violet-400/40 bg-[#121733]/95 shadow-violet-900/40",
            )}
          >
            <span
              className={cn(
                "grid shrink-0 place-items-center rounded-xl",
                t.tone === "money" ? "h-12 w-12 bg-emerald-400 text-[#05210f]" : "h-10 w-10 bg-white/10 text-white",
              )}
            >
              <Icon className={t.tone === "money" ? "h-6 w-6" : "h-5 w-5"} />
            </span>
            <div className="min-w-0 flex-1">
              <div className={cn("font-bold leading-tight", t.tone === "money" ? "text-2xl tabular-nums text-emerald-200" : "text-base")}>{t.title}</div>
              {t.body && <div className="mt-0.5 text-sm text-muted-foreground">{t.body}</div>}
            </div>
            <button type="button" onClick={() => onClose(t.id)} className="text-muted-foreground hover:text-foreground" aria-label="Dismiss">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Connection dot + manual refresh button. */
export function LiveStatus() {
  const { status, refresh } = useContext(LiveContext);
  const router = useRouter();
  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Offline";
  return (
    <div className="flex items-center gap-1.5 text-xs">
      <span className="flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-muted-foreground" title={`Real-time updates: ${label}`}>
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            status === "live" && "bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400",
            status === "connecting" && "animate-pulse bg-amber-400",
            status === "offline" && "bg-red-500",
          )}
        />
        <span className="hidden sm:inline">{label}</span>
      </span>
      <button
        type="button"
        onClick={() => {
          refresh();
          router.refresh();
        }}
        className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Refresh"
        title="Refresh"
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/** Briefly highlights its child when any of the ids just changed in real time. */
export function Highlight({ ids, children, className }: { ids: (string | number | null | undefined)[]; children: React.ReactNode; className?: string }) {
  const { recent } = useContext(LiveContext);
  const isNew = ids.some((i) => i !== null && i !== undefined && recent.has(String(i)));
  return (
    <div className={cn("relative rounded-2xl", isNew && "live-new", className)}>
      {isNew && (
        <span className="bg-brand absolute -right-1 -top-2 z-10 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow">
          New
        </span>
      )}
      {children}
    </div>
  );
}

/** Wraps the promoter's Available card: glows when a commission really becomes available. */
export function MoneyPulse({ children }: { children: React.ReactNode }) {
  const { moneyPulse } = useContext(LiveContext);
  return (
    <div key={moneyPulse} className={cn("h-full rounded-2xl", moneyPulse > 0 && "money-pop")} data-money-pulse={moneyPulse > 0 ? "on" : "off"}>
      {children}
    </div>
  );
}
