/**
 * npm run seed-demo
 *
 * Creates (or updates) the 4 demo accounts, then the demo businesses, draft
 * campaigns with accepted agreements, and time slots (lib/demo-seed.ts).
 * Safe to run repeatedly. Passwords are generated once and stored ONLY in
 * .env.local; they are never printed.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/database.types";
import { DEMO_ACCOUNTS, findUserIdByEmail, seedDemoData } from "../lib/demo-seed";

const root = path.resolve(__dirname, "..");
loadEnvConfig(root);
const envPath = path.join(root, ".env.local");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("Missing Supabase URL or service role key in .env.local");
const db = createClient<Database>(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

function envFileValue(name: string): string | undefined {
  const line = readFileSync(envPath, "utf8").split(/\r?\n/).find((l) => l.startsWith(name + "="));
  return line ? line.slice(name.length + 1) : undefined;
}

function ensureEnv(name: string, make: () => string): string {
  const existing = envFileValue(name);
  if (existing) return existing;
  const value = make();
  const text = readFileSync(envPath, "utf8");
  const header = text.includes("# Demo accounts") ? "" : "\n# Demo accounts (created by npm run seed-demo). Never commit.\n";
  appendFileSync(envPath, `${text.endsWith("\n") ? "" : "\n"}${header}${name}=${value}\n`);
  return value;
}

const newPassword = () => "Pm-" + randomBytes(15).toString("base64url");

async function main() {
  for (const a of Object.values(DEMO_ACCOUNTS)) {
    ensureEnv(`${a.envPrefix}_EMAIL`, () => a.email);
    const password = ensureEnv(`${a.envPrefix}_PASSWORD`, newPassword);
    const metadata = { role: a.role === "admin" ? "promoter" : a.role, display_name: a.displayName };
    const id = await findUserIdByEmail(db, a.email);
    if (id) {
      const { error } = await db.auth.admin.updateUserById(id, { password, user_metadata: metadata, email_confirm: true });
      if (error) throw error;
    } else {
      const { error } = await db.auth.admin.createUser({ email: a.email, password, email_confirm: true, user_metadata: metadata });
      if (error) throw error;
    }
    console.log(`account  ${id ? "updated" : "created"}  ${a.role.padEnd(8)} ${a.displayName} <${a.email}>  (password: ${a.envPrefix}_PASSWORD in .env.local)`);
  }
  const { lines } = await seedDemoData(db);
  lines.forEach((l) => console.log(l));
  console.log("done");
}

main().catch((e) => {
  console.error("seed-demo failed:", e instanceof Error ? e.message : e);
  process.exit(1);
});
