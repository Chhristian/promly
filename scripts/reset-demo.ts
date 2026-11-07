/**
 * npm run reset-demo
 *
 * Same as "Prepare Stage Demo" on /admin/demo: deletes ALL demo-flagged data
 * (bookings, ledger rows, joins, notifications, campaigns) and seeds it fresh:
 * draft campaigns with accepted agreements, no bookings, new time slots.
 * Demo accounts and their passwords are kept. Never touches non-demo data.
 */
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { resetDemo } from "../lib/demo-seed";

loadEnvConfig(path.resolve(__dirname, ".."));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing Supabase URL or service role key in .env.local");
const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

resetDemo(db)
  .then(({ lines }) => {
    lines.forEach((l) => console.log(l));
    console.log("Stage demo is ready.");
  })
  .catch((e) => {
    console.error("reset-demo failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
