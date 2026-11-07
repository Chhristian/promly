# Promly

Promly is a performance-based marketing marketplace:

- **Businesses** publish campaigns with a commission.
- **Promoters** share referral links for those campaigns.
- **Verified bookings** made through a referral link earn the promoter the commission.

Built for the **Oslo Sprint hackathon**. Deadline: **Sunday 8 Nov 2026, 14:00**.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (`components/ui`, config in `components.json`)
- Zod for validating input
- Supabase, **hosted project only**
- Vercel for hosting and deploys
- GitHub for the code: https://github.com/Chhristian/promly

## Rules

1. **Explain each command first.** Before running any command, say in one plain sentence what it does and why.
2. **Hosted Supabase only, no Docker.** Never run `supabase start` or anything with `--local`.
3. **Never print secrets.** Don't show keys, tokens or passwords in chat or logs.
4. **`.env.local` is never committed.** `.gitignore` covers `.env*.local`; keep it that way.
5. **Commit and push after every working step.**
6. Do only the step asked for, then stop and wait.
