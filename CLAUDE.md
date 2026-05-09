# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # start local dev server (Vite only — no D1)
npm run build        # build for Cloudflare Pages
npm run check        # svelte-kit sync + TypeScript/Svelte type check
npm run preview      # preview production build locally

# D1 database
npm run db:init           # apply schema.sql to local wrangler D1
npm run db:init:remote    # apply schema.sql to production D1
npm run db:migrate        # run migrate.sql against local D1 (existing DBs)
npm run db:migrate:remote # run migrate.sql against production D1 (existing DBs)

# Local dev with D1 (full wrangler mode)
npx wrangler pages dev --d1 DB=<database-id> -- npm run dev
```

There are no tests.

## Architecture

**Stack**: SvelteKit + Cloudflare Pages + Cloudflare D1 (SQLite). Uses `@sveltejs/adapter-cloudflare`. The D1 database is accessed only in server-side code via `platform.env.DB` (a `D1Database` binding injected by Cloudflare/wrangler).

**Data layer** (`src/lib/db.ts`): All SQL lives here as plain parameterized D1 queries. No ORM. Every function takes `db: D1Database` as its first argument, obtained from `platform!.env.DB` in `+page.server.ts` files.

**Money**: All monetary amounts are stored and computed in **integer cents** to avoid float precision bugs. `src/lib/utils.ts` has `parseMoney` (string → cents), `formatMoney`/`formatProfit` (cents → display string), and `calculateSettlements` (greedy min-transaction debt settlement algorithm).

**Auth** (`src/lib/auth.ts`, `src/hooks.server.ts`):
- Passwords hashed with PBKDF2 via Web Crypto API (works in Cloudflare Workers).
- Sessions use a random 64-hex token stored in a `chiplist_session` cookie and the `auth_sessions` DB table.
- `hooks.server.ts` populates `event.locals.user` on every request; `+layout.server.ts` forwards it to all pages.

**Route structure**: Standard SvelteKit file-based routing. Each route pair (`+page.server.ts` / `+page.svelte`) handles its own data loading and form actions. Key routes:
- `/sessions/[id]` — session detail with entry upsert/delete actions
- `/players/[id]` — player stats, history, profit chart
- `/groups/[id]` — group leaderboard scoped to group sessions
- `/login`, `/signup`, `/logout` — auth flows
- `/profile` — link user account to a player profile

**Types** (`src/lib/types.ts`): Shared interfaces (`Player`, `Session`, `SessionEntry`, `Group`, `User`, `Settlement`, `PlayerStats`). `SessionEntry.buy_in` and `cash_out` are always cents.

**Styling**: Tailwind CSS v3 with PostCSS. Global styles in `src/app.css`.

## Key constraints

- `platform?.env?.DB` is only available at runtime in Cloudflare/wrangler — it's `undefined` during plain `npm run dev` (Vite only). Use wrangler pages dev mode to test DB interactions locally.
- No migrations system — schema changes require manually editing `schema.sql` and re-running `db:init`. One-off migrations live in `migrate.sql` and run via `db:migrate`.
- **Group leader**: `groups.owner_id` is the leader. Sessions submitted to a group by a non-leader get `status = 'pending'` and are excluded from all stats until the leader approves them. Leaders see a pending queue on the group page. `migrate.sql` also assigns "strawby" as leader of "SoCal Hanime" for existing DBs.
