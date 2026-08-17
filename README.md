# Deelrx CRM

**Privacy-first POS, CRM, inventory, and credit management system for small businesses**

A modern, full-stack CRM and point-of-sale system built with Next.js 16, Supabase, and TypeScript. Designed specifically for retail dispensaries and small businesses requiring robust inventory tracking, customer credit management, and AI-powered business intelligence.

---

## Monorepo Reality (Beta Launch Baseline)

This repository is a **pnpm monorepo**. Product ownership is explicit:

- `apps/app` = the `.app` product (authenticated operator experience)
- `apps/marketing` = marketing site only (`.com`)

### Node Version Policy

- **Required Node.js:** `20.19.0` (exact)
- **Package manager:** `pnpm@9.15.9`
- CI and local policy are aligned (`.nvmrc`, `.node-version`, package `engines`)

If you are using `nvm`:

```bash
nvm use
```

### Domain Routing (.com -> .app)

- Marketing CTAs on `apps/marketing` should send users to the `.app` domain routes (for example `/login`, `/register`)
- Middleware in `apps/app/middleware.ts` owns the redirect rules that prevent loops between `/`, `/login`, `/onboarding`, and `/dashboard`
- `NEXT_PUBLIC_APP_URL` should point to the `.app` origin (for example `https://deelrxcrm.app`)

#### Clerk Redirect / Origin Checklist

Configure these in Clerk for both local and production environments:

- Allowed origins: marketing `.com` origin(s) and app `.app` origin(s)
- Sign-in URL: `.app/login`
- Sign-up URL: `.app/register`
- After sign-in URL: `.app/dashboard` (or `.app/onboarding` if your flow requires setup first)
- After sign-up URL: `.app/onboarding` (or `.app/dashboard` if onboarding is complete)
- Local dev origins and redirects: `http://localhost:3000` / `http://localhost:3001` (match your active ports)

Do not point marketing CTAs to in-domain auth pages on `.com`; they should always link to `.app`.

### Quick POS (Operator Fast Path)

Quick POS lives in `apps/app` and is designed as a minimal ring-up flow:

- `/pos/sale` → search/scan/add items
- `/pos/payment` → server-verified price, loyalty, tax, tender, and receipt selection
- `/pos/complete` → receipt/confirmation state and quick reset for next sale

The POS checkout contract is centralized in `/Users/lee/Projects/DRX_Primary/apps/app/lib/pos/contract.ts`.

### wrelik-kit Consumption

- DRX consumes `@wrelik/*` from published packages (registry-pinned versions)
- Vendored `packages/wrelik-*` are **not** source-of-truth and are excluded from workspace resolution
- Direct vendor SDK imports are restricted by ESLint; use app/mobile adapters and `@wrelik/*` boundaries instead

See `/Users/lee/Projects/DRX_Primary/docs/WRELIK_KIT_INTEGRATION.md` for details.

### Policies

Policy source of truth is root canonical files:

- `./WRELIK_AGENTS.md`
- `./AGENTS.md`
- `./DEVELOPMENT_PROCESS.md`
- `./RELEASE_POLICY.md`
- `./VERSIONING_POLICY.md`
- `./VERSION_MANAGEMENT_POLICY.md`
- `./STACK_POLICY.md`
- `./CHECKLIST_PRECOMMIT.md`
- `./CHECKLIST_PRERELEASE.md`

Upstream template provenance and import procedure:

- `./POLICY_UPSTREAM.md`
- `docs/POLICY_IMPORT_WORKFLOW.md`

### Staging / Preview Testing

For preview deploy + demo data seeding (including the current shared-DB warning), see:

- `/Users/lee/Projects/DRX_Primary/docs/STAGING_PREVIEW_WORKFLOW.md`

---

## 🚀 Features

Canonical source:

- `docs/MARKETING_TRUE_FEATURE_LIST.md`
- `docs/MARKETING_FEATURE_CLAIM_MATRIX.md`

### DRX Marketing Canon (Status-Aware)

- **Fast Point of Sale** (`Live`, refund tracking claim `Beta`) - clean checkout, scan/search, discounts, multiple payments, customer lookup, transaction history
- **Quick POS Mode** (`Live`) - scan product, adjust quantity, apply discount, take payment, done
- **Inventory That Actually Makes Sense** (`Live`, purchase-order tracking claim `Beta`) - stock visibility, low-stock alerts, SKU/barcode, batch/vendor tracking, adjustment logs
- **Customer Tracking That Works** (`Live`, notes/tags + loyalty claim `Beta`) - profiles, purchase history, customer insights
- **Real Business Reports** (`Live`, downloadable/deep slices claim `Beta`) - sales windows, category and best-seller visibility, revenue context, dashboard overview
- **Team Control & Accountability** (`Live`) - role-based control, secure login, and user activity visibility
- **Multi-Location Ready** (`Beta`) - separate store views and central multi-business administration
- **Works on Desktop and Mobile** (`Live`) - desktop dashboards with mobile-friendly checkout and cloud access
- **DRX Privacy ProteXion™** (`Live`) - alias-first tracking, encrypted sensitive fields, screen masking, and operator-controlled retention with minimal data footprint

---

## 🛠 Tech Stack

### Frontend

- **Next.js 16** (App Router, React 19)
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - High-quality component library
- **Sonner** - Toast notifications
- **Lucide Icons** - Modern icon set

### Backend

- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Row Level Security (RLS)
  - Real-time subscriptions
  - Authentication
- **Server Actions** - Type-safe server-side mutations

### Development & Testing

- **Vitest** - Unit and integration testing
- **Playwright** - E2E testing
- **ESLint** - Code linting
- **pnpm** - Fast, disk-efficient package manager

### Infrastructure

- **Vercel** - Deployment and hosting
- **Sentry** - Error tracking and performance monitoring
- **PostHog** - Product analytics

---

## 📦 Getting Started

### Prerequisites

- Node.js 20.19.0
- pnpm 9.15.9
- Supabase CLI

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd drx-v2
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Required environment variables:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Start Supabase locally**

   ```bash
   npx supabase start
   ```

5. **Apply database migrations**

   ```bash
   npx supabase db reset
   ```

6. **Run the app product**

   ```bash
   pnpm dev
   ```

7. **Open the app**
   Navigate to the `apps/app` local URL (typically [http://localhost:3000](http://localhost:3000))

---

## 🗄 Database

### Migrations

Create a new migration:

```bash
npx supabase migration new migration_name
```

Apply migrations:

```bash
npx supabase db reset
```

Generate migration from schema changes:

```bash
npx supabase db diff --use-migra -f migration_name
```

### Key Tables

- `business_profile` - Business information
- `customers` - Customer records with credit limits
- `inventory` - Product catalog with unit measurements
- `sales` - Transaction records
- `inventory_intake` - Intake workflow with approval
- `user_roles` - RBAC with granular permissions
- `credit_limits` - Customer credit tracking
- `ai_credit_decisions` - AI recommendation audit trail

---

## 🧪 Testing

```bash
# Run unit tests
pnpm test

# Run tests with UI
pnpm test:ui

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Mintlify Docs Audit

Run the Mintlify documentation quality gate:

```bash
pnpm test:docs:mintlify
```

This check enforces:

- Forbidden brand words
- Broken internal Mintlify links
- Missing beta labels for non-live claims in parity matrix
- Missing required operator sections on operational docs pages

---

## 🏗 Project Structure

```
DRX_Primary/
├── apps/
│   ├── app/               # .app product (operator/authenticated experience)
│   ├── marketing/         # .com marketing site
│   └── mobile/            # Expo mobile client
├── packages/
│   ├── ui/                # Shared UI package
│   ├── brand/             # Shared brand assets/tokens
│   └── wrelik-*           # Vendored reference copies (not workspace source-of-truth)
├── tooling/               # Shared lint/tooling config
├── docs/                  # Project and launch docs
└── scripts/               # Root automation/testing scripts
```

---

## 🎨 Key Concepts

### Unit of Measure

Products are categorized by measurement type:

- **Liquids**: Measured in ounces (oz) - beverages, syrups, oils
- **Solids**: Measured in grams (g) - cannabis, edibles, etc.

Category determines the unit automatically when creating products.

### Inventory Intake Workflow

1. Create intake entry with product, quantity, and cost
2. Manager approval (if required by business settings)
3. Auto-calculation of cost per unit (gram/ounce)
4. Inventory updated upon approval

### Credit Decision Engine

AI-powered credit limit recommendations based on:

- Purchase history (30d, 90d, all-time)
- Payment behavior and on-time ratio
- Current credit utilization
- Inventory coverage ratio

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect repository to Vercel**
2. **Configure environment variables** in Vercel dashboard
3. **Deploy**
   ```bash
   git push origin main
   ```

### Database Migrations

Migrations are automatically applied in CI/CD. For production:

```bash
npx supabase db push
```

---

## 📝 Scripts

```bash
pnpm dev          # Run apps/app locally (root proxy)
pnpm build        # Build apps/app + apps/marketing
pnpm start        # Start apps/app (root proxy)
pnpm lint         # Launch readiness lint (app + marketing)
pnpm typecheck    # Launch readiness typecheck (app + marketing)
pnpm compliance:imports  # Enforce vendor import boundaries
pnpm test:e2e:web # Run apps/app Playwright suite
```

---

## 🔒 Security

- **Row Level Security (RLS)** enabled on all tables
- **Role-based permissions** with granular access control
- **Audit logging** for compliance and accountability
- **Environment variables** for sensitive data
- **HTTPS only** in production

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `pnpm test`
4. Run linter: `pnpm lint`
5. Commit with semantic commit messages
6. Push and create a pull request

---

## 📄 License

Proprietary - All rights reserved

---

## 🆘 Support

For issues, questions, or feature requests, please contact the development team.

---

**Built with ❤️ for modern retail businesses**
