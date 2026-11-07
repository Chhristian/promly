"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Status = "connecting" | "live" | "offline";
type LiveState = { status: Status; recent: Set<string>; refresh: () => void; lastEventAt: number | null };

const LiveContext = createContext<LiveState>({ status: "connecting", recent: new Set(), refresh: () => {}, lastEventAt: null });

const TABLES = ["campaigns", "campaign_memberships", "bookings", "ledger_entries", "notifications"] as const;
const HIGHLIGHT_MS = 8000;

/**
 * Subscribes to database changes (filtered by RLS on the server, so users only
 * get their own rows) and re-renders the page with fresh server data.
 */
export function LiveProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const [recent, setRecent] = useState<Set<string>>(new Set());
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasOffline = useRef(false);

  const refresh = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => router.refresh(), 300);
  }, [router]);

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
          setLastEventAt(Date.now());
          refresh();
        });
      }
      channel.subscribe((s) => {
        if (s === "SUBSCRIBED") {
          setStatus("live");
          if (wasOffline.current) refresh(); // catch up on anything missed
          wasOffline.current = false;
        } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT" || s === "CLOSED") {
          setStatus("offline");
          wasOffline.current = true;
        }
      });
    })();

    // Fallback: refresh when the tab becomes visible again.
    const onVisible = () => document.visibilityState === "visible" && refresh();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) supabase.removeChannel(channel);
    };
  }, [refresh]);

  return <LiveContext.Provider value={{ status, recent, refresh, lastEventAt }}>{children}</LiveContext.Provider>;
}

/** Connection dot + manual refresh button. */
export function LiveStatus() {
  const { status, refresh } = useContext(LiveContext);
  const router = useRouter();
  const label = status === "live" ? "Live" : status === "connecting" ? "Connecting" : "Offline";
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground" title={`Real-time updates: ${label}`}>
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
        className="rounded-md border border-border px-2 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        aria-label="Refresh"
        title="Refresh"
      >
        ↻
      </button>
    </div>
  );
}

/** Briefly highlights its child when any of the ids just changed in real time. */
export function Highlight({ ids, children, className }: { ids: (string | number | null | undefined)[]; children: React.ReactNode; className?: string }) {
  const { recent } = useContext(LiveContext);
  const isNew = ids.some((i) => i !== null && i !== undefined && recent.has(String(i)));
  return (
    <div className={cn("relative rounded-xl", isNew && "live-new", className)}>
      {isNew && (
        <span className="bg-brand absolute -right-1 -top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white">
          new
        </span>
      )}
      {children}
    </div>
  );
}
