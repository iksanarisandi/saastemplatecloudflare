# Cloudflare SaaS Boilerplate

A modern SaaS starter template built with SvelteKit, Hono.js, and Cloudflare.

## Tech Stack

- **Frontend**: SvelteKit + Tailwind CSS + shadcn/svelte
- **Backend**: Hono.js on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Auth**: Lucia
- **Build**: pnpm + Turborepo

## Prerequisites

- Node.js 18+
- pnpm 9+
- Cloudflare account
- Wrangler CLI (`npm install -g wrangler`)

## Quick Start

1. **Clone and install dependencies**
   ```bash
   pnpm install
   ```

2. **Set up Cloudflare resources**
   ```bash
   # Create D1 database
   wrangler d1 create saas-db
   
   # Create R2 bucket
   wrangler r2 bucket create saas-storage
   
   # Create KV namespace
   wrangler kv:namespace create KV
   ```

3. **Update configuration**
   - Copy `.env.example` to `.env`
   - Update `apps/api/wrangler.toml` with your resource IDs

4. **Run migrations**
   ```bash
   wrangler d1 execute saas-db --local --file=packages/db/src/migrations/001_initial_schema.sql
   ```

5. **Start development**
   ```bash
   pnpm dev
   ```

## Project Structure

```
├── apps/
│   ├── api/          # Hono.js API (Workers)
│   └── web/          # SvelteKit frontend (Pages)
├── packages/
│   ├── shared/       # Shared types & validators
│   └── db/           # Database schema & repositories
└── scripts/          # CLI utilities
```

## Development

```bash
# Start all apps
pnpm dev

# Start specific app
pnpm --filter @saas/api dev
pnpm --filter @saas/web dev

# Build all
pnpm build

# Type check
pnpm typecheck
```

## Deployment

```bash
# Deploy API to Workers
pnpm deploy:api

# Deploy Web to Pages
pnpm deploy:web

# Deploy all
pnpm deploy
```

## License

MIT
