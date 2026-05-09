# Chiplist

Poker session tracker for you and your friends. Built with SvelteKit + Cloudflare D1, hosted free on Cloudflare Pages.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Create the D1 database
```bash
npx wrangler d1 create chiplist-db
```
Copy the `database_id` from the output into `wrangler.toml`.

### 3. Initialize the schema
```bash
npm run db:init          # local dev database
npm run db:init:remote   # production database (after deploying)
```

### 4. Run locally
```bash
npm run dev
```

For local dev with D1 (wrangler dev mode):
```bash
npx wrangler pages dev --d1 DB=<your-database-id> -- npm run dev
```

## Deploy to Cloudflare Pages

1. Push this repo to GitHub
2. In Cloudflare Pages dashboard: Connect to git → select repo → set build command `npm run build`, output dir `.svelte-kit/cloudflare`
3. Add D1 binding: Settings → Functions → D1 bindings → variable name `DB` → select your database
4. Deploy

## Features

- **Sessions**: Create sessions with date, location, notes
- **Entries**: Track each player's buy-in and cash-out per session
- **Settlement**: Automatically calculates who owes who (minimizes transactions)
- **Player stats**: Net profit, win rate, avg profit/session, biggest win/loss
- **Profit chart**: Cumulative winnings over time per player
- **Leaderboard**: Dashboard shows all-time rankings
