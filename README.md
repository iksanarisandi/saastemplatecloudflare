# Cloudflare SaaS Boilerplate

A production-ready SaaS starter template built with **SvelteKit**, **Hono.js**, and **Cloudflare** infrastructure. Features multi-tenancy, authentication, subscription management, and file storage.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![pnpm](https://img.shields.io/badge/pnpm-%3E%3D9.0.0-orange.svg)

## ✨ Features

- 🔐 **Authentication** - Lucia Auth with email/password, session management
- 🏢 **Multi-tenancy** - Isolated data per organization
- 💳 **Subscriptions** - Plan management with manual payment confirmation
- 📁 **File Storage** - R2-based file uploads with metadata
- 🔔 **Notifications** - Email and Telegram notification support
- 🛡️ **Security** - CORS, rate limiting, secure headers
- 📊 **Admin Dashboard** - User and payment management

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | SvelteKit + Tailwind CSS + shadcn/svelte |
| **Backend** | Hono.js on Cloudflare Workers |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 |
| **Cache** | Cloudflare KV |
| **Auth** | Lucia Auth v3 |
| **Build** | pnpm + Turborepo |

## 📁 Project Structure

```
├── apps/
│   ├── api/              # Hono.js API (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── routes/   # API endpoints
│   │   │   ├── services/ # Business logic
│   │   │   ├── middleware/
│   │   │   └── lib/      # Utilities
│   │   ├── wrangler.toml      # Development config
│   │   └── wrangler.prod.toml # Production config
│   │
│   └── web/              # SvelteKit Frontend (Cloudflare Pages)
│       ├── src/
│       │   ├── routes/   # Pages and layouts
│       │   └── lib/      # Components, stores, API client
│       └── wrangler.toml
│
├── packages/
│   ├── db/               # Database schema & repositories
│   │   └── src/
│   │       ├── migrations/
│   │       └── repositories/
│   │
│   └── shared/           # Shared types & validators
│       └── src/
│           ├── types/
│           └── validators/
│
└── scripts/              # Setup and deployment scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- [Cloudflare account](https://dash.cloudflare.com/sign-up)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd cloudflare-saas-boilerplate
pnpm install
```

### 2. Create Cloudflare Resources

```bash
# Login to Cloudflare
wrangler login

# Create D1 Database
wrangler d1 create saas-db

# Create R2 Bucket
wrangler r2 bucket create saas-storage

# Create KV Namespace
wrangler kv:namespace create KV
```

### 3. Configure Wrangler

Update `apps/api/wrangler.toml` with your resource IDs:

```toml
[[d1_databases]]
binding = "DB"
database_name = "saas-db"
database_id = "YOUR_D1_DATABASE_ID"  # From step 2

[[r2_buckets]]
binding = "STORAGE"
bucket_name = "saas-storage"

[[kv_namespaces]]
binding = "KV"
id = "YOUR_KV_NAMESPACE_ID"  # From step 2
```

### 4. Run Migrations

```bash
# Navigate to API folder
cd apps/api

# Run migration on local D1
wrangler d1 execute saas-db --local --file=../../packages/db/src/migrations/001_initial_schema.sql
```

### 5. Start Development

```bash
# From project root
pnpm dev
```

- **Frontend**: http://localhost:5173
- **API**: http://localhost:8787

## 📋 Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in development mode |
| `pnpm build` | Build all apps for production |
| `pnpm typecheck` | Run TypeScript type checking |
| `pnpm test` | Run tests |
| `pnpm lint` | Run linting |
| `pnpm db:migrate:local` | Run migrations on local D1 |
| `pnpm db:migrate:prod` | Run migrations on production D1 |
| `pnpm deploy:api` | Deploy API to Workers (dev) |
| `pnpm deploy:api:prod` | Deploy API to Workers (prod) |
| `pnpm deploy:web` | Deploy Web to Pages |

## 🔧 Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Key variables:

| Variable | Description |
|----------|-------------|
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `D1_DATABASE_ID` | D1 database ID |
| `KV_NAMESPACE_ID` | KV namespace ID |
| `PUBLIC_API_URL` | API base URL |
| `PUBLIC_APP_URL` | Frontend base URL |

### Secrets (Production)

Set secrets using Wrangler (never commit these):

```bash
# Auth secret (generate with: openssl rand -hex 32)
wrangler secret put AUTH_SECRET --config apps/api/wrangler.prod.toml

# Optional: Telegram notifications
wrangler secret put TELEGRAM_BOT_TOKEN --config apps/api/wrangler.prod.toml
wrangler secret put TELEGRAM_CHAT_ID --config apps/api/wrangler.prod.toml

# Optional: Email notifications
wrangler secret put EMAIL_API_KEY --config apps/api/wrangler.prod.toml
```

## 🚢 Deployment

### Deploy to Cloudflare

#### 1. Prepare Production Resources

```bash
# Create production D1
wrangler d1 create saas-db-prod

# Create production R2
wrangler r2 bucket create saas-storage-prod

# Create production KV
wrangler kv:namespace create KV
```

#### 2. Update Production Config

Edit `apps/api/wrangler.prod.toml` with production resource IDs.

#### 3. Run Production Migrations

```bash
cd apps/api
wrangler d1 execute saas-db-prod --remote --file=../../packages/db/src/migrations/001_initial_schema.sql
```

#### 4. Set Secrets

```bash
wrangler secret put AUTH_SECRET --config apps/api/wrangler.prod.toml
```

#### 5. Deploy

```bash
# Deploy API
pnpm deploy:api:prod

# Deploy Web
pnpm deploy:web
```

### Deploy via GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm build
      
      - name: Deploy API
        run: pnpm deploy:api:prod
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
      
      - name: Deploy Web
        run: pnpm deploy:web
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
```

## 🔒 Security

### Best Practices Implemented

- ✅ Password hashing with secure algorithms
- ✅ HTTP-only session cookies
- ✅ CORS configuration
- ✅ Secure headers (CSP, X-Frame-Options, etc.)
- ✅ Rate limiting on auth endpoints
- ✅ Input validation with Zod
- ✅ SQL injection prevention via D1 prepared statements

### Important Security Notes

> ⚠️ **Never commit credentials to version control!**

- All `.env*` files are gitignored
- Use `wrangler secret put` for production secrets
- Keep `wrangler.toml` resource IDs as placeholders in version control

## 📚 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user |
| POST | `/auth/password-reset` | Request password reset |
| POST | `/auth/password-reset/confirm` | Confirm password reset |

### Users (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/:id` | Get user |
| POST | `/users` | Create user |
| PATCH | `/users/:id` | Update user |
| DELETE | `/users/:id` | Delete user |

### Subscriptions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/plans` | List subscription plans |
| GET | `/subscriptions/current` | Get current subscription |
| POST | `/subscriptions` | Create subscription |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments` | List payments |
| POST | `/payments` | Create payment |
| POST | `/payments/:id/proof` | Upload payment proof |
| POST | `/payments/:id/confirm` | Confirm payment (admin) |
| POST | `/payments/:id/reject` | Reject payment (admin) |

### Files

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/files` | List files |
| POST | `/files` | Upload file |
| GET | `/files/:id/url` | Get signed download URL |
| DELETE | `/files/:id` | Delete file |

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [SvelteKit](https://kit.svelte.dev/)
- [Hono](https://hono.dev/)
- [Cloudflare Workers](https://workers.cloudflare.com/)
- [Lucia Auth](https://lucia-auth.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/svelte](https://www.shadcn-svelte.com/)
