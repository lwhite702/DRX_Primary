# Deelrx CRM

**Privacy-first POS, CRM, inventory, and credit management system for small businesses**

A modern, full-stack CRM and point-of-sale system built with Next.js 16, Supabase, and TypeScript. Designed specifically for retail dispensaries and small businesses requiring robust inventory tracking, customer credit management, and AI-powered business intelligence.

---

## 🚀 Features

### Core Functionality

- **Point of Sale (POS)** - Fast, intuitive transaction processing with offline support
- **Customer Management** - Comprehensive CRM with credit limit tracking and payment history
- **Inventory Management** - Real-time inventory tracking with unit-based measurements (grams/ounces)
- **Credit Management** - AI-powered credit limit recommendations and risk scoring
- **Sales Analytics** - Real-time dashboards and business insights
- **Multi-Business Support** - Manage multiple business locations from one platform

### Advanced Features

- **Role-Based Access Control (RBAC)** - Granular permissions (Super Admin, Manager, Supervisor, Cashier)
- **AI Intelligence** - Product pricing recommendations and inventory forecasting
- **Inventory Intake** - Sophisticated intake workflow with approval system
- **Offline Mode** - Continue working even without internet connectivity
- **Progressive Web App (PWA)** - Install on any device for native-like experience
- **Audit Logging** - Complete system audit trail for compliance

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

- Node.js 20+
- pnpm 8+
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

6. **Run the development server**

   ```bash
   pnpm dev
   ```

7. **Open the app**
   Navigate to [http://localhost:3000](http://localhost:3000)

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

---

## 🏗 Project Structure

```
drx-v2/
├── app/                    # Next.js app directory
│   ├── (app)/             # Authenticated app routes
│   ├── actions/           # Server actions
│   ├── api/               # API routes
│   └── inventory/         # Inventory management
├── components/            # React components
│   ├── ui/               # Shadcn UI components
│   ├── layout/           # Layout components
│   └── providers/        # Context providers
├── lib/                  # Shared utilities
│   ├── auth/            # Authentication & permissions
│   ├── credit/          # Credit decision engine
│   ├── hooks/           # Custom React hooks
│   ├── supabase/        # Supabase client
│   ├── utils/           # Utility functions
│   └── validations/     # Zod schemas
├── supabase/            # Supabase configuration
│   ├── migrations/      # Database migrations
│   └── functions/       # Edge functions
└── tests/               # Test files
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
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm test         # Run tests
pnpm test:e2e     # Run E2E tests
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
