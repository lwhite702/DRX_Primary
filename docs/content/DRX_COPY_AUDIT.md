# DRX copy audit and content system

Status: implementation draft for WRE-107. Public publishing, store submission,
and provider updates remain approval-gated.

## 1. Brand voice findings

The strongest existing line is the core promise: “Know what you have, what you
sold, what you made, and who still owes you.” The weakest areas were the names
wrapped around it. The same action appeared as POS, Quick POS, Point of Sale,
checkout, and Sales. The main screen appeared as Dashboard and Home. Privacy
features used several coined names that made a simple benefit hard to find.

Other recurring problems:

- Marketing sometimes led with system language instead of the daily problem.
- Web, Expo, and iOS used different navigation labels for the same destination.
- Success messages often said “successfully” after the result was already clear.
- Errors often described a generic system failure without a useful next step.
- Help copy sometimes used internal terms such as tenant, intake, and protocol.
- Store copy described product categories before explaining what DRX helps track.
- Email and sales delivery paths do not yet have one implemented source, so they
  need approved templates before a provider is changed.

## 2. Conflicting terminology

| Current terms                    | Approved term   | Surfaces affected                          |
| -------------------------------- | --------------- | ------------------------------------------ |
| Dashboard, overview              | Home            | Web, iOS, Help                             |
| Inventory, catalog               | Products        | Web, iOS, Android, Marketing, Help         |
| Inventory level, units available | Stock           | All product surfaces                       |
| POS, Quick POS, Point of Sale    | New sale        | Web, iOS, Android, Marketing, Help, Stores |
| Orders & Receipts, transactions  | Sales           | Web, iOS, Marketing, Help                  |
| Store Credit, Credit             | Payments        | Web, iOS, Android, Help                    |
| Outstanding balance, receivable  | Balance due     | Marketing, Product, Help, Notifications    |
| Intake, replenish inventory      | Add stock       | Web, iOS, Android, Help                    |
| Adjustment, reconciliation       | Fix count       | Web, iOS, Android, Help                    |
| Staff, user, operator account    | Team member     | Web, iOS, Android, Help                    |
| Workspace, tenant                | Business        | Web, iOS, Help                             |
| Store used as account boundary   | Location        | Web, iOS, Help                             |
| Insights, intelligence center    | Trends          | Web, iOS, Marketing, Help                  |
| ProteXion Mode                   | Hide details    | Web, Marketing, Help                       |
| Vault Mode                       | Protect details | Web, Marketing, Help                       |
| Minimal Data Engine              | What’s saved    | Web, Marketing, Help                       |
| Privacy ProteXion                | Privacy         | Marketing, Web, Help                       |

Internal route names, database fields, APIs, analytics names, and migration files
are not renamed by this copy project. They may keep older identifiers as long as
those identifiers do not appear in customer-facing text.

## 3. Marketing alignment findings

- The site must lead with customers, stock, sales, payments, and balances due.
- Claims about refunds, purchase orders, downloads, native parity, offline use,
  automation, and public availability must stay beta-scoped until verified.
- DRX records merchant-managed balances. It is not a lender, payment network, or
  debt collector. Copy must not imply that DRX moves money when it only records it.
- Privacy copy must describe controls and encryption without guaranteeing privacy.
- Current public posture is early access. “Start free” is not approved until the
  price, billing path, and availability are confirmed.
- One approved price and plan matrix does not yet exist. No price claim should be
  added until product, store, and billing records agree.

## 4. Approved content system

### Core promise

Know what you have, what you sold, what you made, and who still owes you.

Supporting line: You handle the work. DRX keeps the numbers straight.

### Feature and navigation names

Home, Customers, Products, New sale, Sales, Payments, Deliveries, Loyalty,
Trends, Reports, Team, Business, Settings, and Help. Use Stock for quantity and
Location for a physical store.

### Standard actions

Add customer, Add product, Add sale, Add stock, Mark paid, Record payment, Save
note, Send reminder, See details, Try again, Not now, Keep editing, and Remove.

### Message patterns

- Success: `[Result].` Example: `Payment added.`
- Error: `[What failed]. [What to do].` Add data reassurance when true.
- Warning: `[Risk]. [Action that avoids it].`
- Empty: `[What is missing]. [Why or next action].`
- Destructive: `[What will be removed]. [Whether it can be recovered].`
- Permission: `[Who needs access]. [What they will be able to see or do].`
- Privacy: `[What is saved]. [Who can see it]. [When it is deleted].`
- Upgrade: `[Feature or limit]. [Exact plan and price only when approved].`
- Payment failure: `[What failed]. [What to check]. [Whether it was charged].`
- Offline: `You’re offline. Check your connection and try again.`

### Banned customer-facing language

Avoid the list in `BRAND_VOICE.md`, including leverage, optimize, streamline,
seamless, robust, actionable insights, AI-powered, management system,
successfully completed, an error occurred, and something went wrong. Also avoid
the retired privacy names listed above.

## 5. Rewritten copy

**Surface:** Marketing  
**Screen or Page:** Home  
**Purpose:** Explain DRX and invite the right person into early access.  
**Headline:** Know what you sold. See who still owes you.  
**Supporting text:** Know what you have, what you sold, what you made, and who still owes you.  
**Labels:** Fast sales; Clear stock; Controlled access  
**Buttons:** Join early access; See how it works  
**Empty state:** Not used  
**Success message:** You’re on the list. We’ll email you when access is ready.  
**Error message:** We couldn’t add you. Check your email and try again.  
**Consistency notes:** Use early-access language until public availability changes.

**Surface:** Web and PWA  
**Screen or Page:** Home  
**Purpose:** Show today’s numbers and what needs attention.  
**Headline:** Today’s numbers  
**Supporting text:** See what sold, what is running low, and what still needs attention.  
**Labels:** Sales; Money in; Products running low; Balance due  
**Buttons:** New sale; See details  
**Empty state:** No sales yet. Start your first sale.  
**Success message:** Changes saved.  
**Error message:** We couldn’t load today’s numbers. Try again.  
**Consistency notes:** The route may remain `/dashboard`; the public label is Home.

**Surface:** Web, iOS, Android, and PWA  
**Screen or Page:** Products  
**Purpose:** Find products and keep stock counts right.  
**Headline:** Products  
**Supporting text:** Know what you have, what moved, and what is running low.  
**Labels:** Stock; Low stock; Product; Price; Cost; Stock history  
**Buttons:** Add product; Add stock; Fix count  
**Empty state:** No products yet. Add your first product and start keeping count.  
**Success message:** Stock updated.  
**Error message:** That stock change didn’t save. Your details are still here. Try again.  
**Consistency notes:** Internal inventory routes and types remain unchanged.

**Surface:** Web, iOS, Android, and PWA  
**Screen or Page:** New sale  
**Purpose:** Add products, take a payment, and save a sale.  
**Headline:** New sale  
**Supporting text:** Find a product or scan it to get started.  
**Labels:** Customer; Product; Amount; Payment; Total  
**Buttons:** Add customer; Take payment; Save sale  
**Empty state:** Nothing here yet. Add a product to start the sale.  
**Success message:** Sale saved.  
**Error message:** That sale didn’t save. Your details are still here. Try again.  
**Consistency notes:** POS may remain an internal route or technical category.

**Surface:** Web, iOS, Android, and PWA  
**Screen or Page:** Payments  
**Purpose:** See balances due and record customer payments.  
**Headline:** Who still owes you?  
**Supporting text:** See each balance due and record what customers paid.  
**Labels:** Balance due; Paid; Left; Limit; Payment history  
**Buttons:** Record payment; Mark paid; View balance  
**Empty state:** Nothing due. Everybody is paid up. Nice.  
**Success message:** Payment added.  
**Error message:** That payment didn’t save. Check the amount and try again.  
**Consistency notes:** Legal and plan review is required before final approval or provider publication.

**Surface:** iOS and Android  
**Screen or Page:** Signed out  
**Purpose:** Explain the value before account access.  
**Headline:** Keep the business straight  
**Supporting text:** Create an account or sign in to track customers, stock, sales, and money.  
**Buttons:** Create account; Sign in  
**Error message:** We couldn’t sign you in. Check your details and try again.  
**Consistency notes:** Authentication provider strings need separate provider approval.

**Surface:** Email  
**Screen or Page:** Weekly numbers template  
**Purpose:** Bring the user back to a useful report.  
**Headline:** Your weekly numbers are ready  
**Supporting text:** See what sold, what you made, and what is running low.  
**Button:** Check your numbers  
**Error message:** Not used  
**Consistency notes:** Draft only; no sending provider is wired to this catalog.

**Surface:** Push  
**Screen or Page:** Low stock  
**Purpose:** Flag products that need attention.  
**Headline:** You’re running low  
**Supporting text:** Two products are below their stock limit.  
**Button:** Check products  
**Consistency notes:** Keep names and customer details out of lock-screen copy.

**Surface:** App Store and Google Play  
**Screen or Page:** Listing  
**Purpose:** Explain the benefit without generic software language.  
**Headline:** Keep customers, stock, sales, and money straight.  
**Supporting text:** DRX helps you see what came in, what went out, what you made, and who still owes you.  
**Consistency notes:** Draft only. Store submission and public release remain blocked.

**Surface:** Support  
**Screen or Page:** Add stock  
**Purpose:** Show the exact steps using product labels.  
**Headline:** Add stock  
**Supporting text:** Open Products, choose an item, and tap Add stock. Enter what came in, then tap Save.  
**Success message:** Stock updated.  
**Error message:** That stock change didn’t save. Try again.  
**Consistency notes:** Do not use “inventory intake” in customer instructions.

## 6. Cross-surface consistency matrix

| Marketing            | Product and navigation | Help     | iOS      | Android   | Web and PWA | Approved term |
| -------------------- | ---------------------- | -------- | -------- | --------- | ----------- | ------------- |
| Today’s numbers      | Home                   | Home     | Home     | Home/More | Home        | Home          |
| Products and stock   | Products               | Products | Products | Products  | Products    | Products      |
| Fast sales           | New sale               | New sale | New sale | New sale  | New sale    | New sale      |
| Sale history         | Sales                  | Sales    | Sales    | Sales     | Sales       | Sales         |
| See who owes you     | Payments               | Payments | Payments | Payments  | Payments    | Payments      |
| What’s selling       | Trends                 | Trends   | Trends   | Trends    | Trends      | Trends        |
| Choose who sees what | Team                   | Team     | Team     | Team      | Team        | Team          |
| Keep details private | Privacy                | Privacy  | Privacy  | Privacy   | Privacy     | Privacy       |

When a feature does not exist on a platform, do not create a matching label just
for appearance. State the availability instead.

## 7. Remaining decisions

1. Product and legal must approve one public term for merchant-managed credit.
   This draft uses Payments for the area and Balance due for money owed.
2. Product, billing, and store records must establish the plan names, prices,
   billing periods, limits, and cancellation language.
3. Release owners must confirm which native and offline behaviors are ready to
   claim on iOS, Android, and PWA.
4. Legal and security must approve final privacy, deletion, encryption, and
   customer-data statements against current behavior.
5. Product must choose the support destination and owner for email templates.
6. Store owners must approve and submit App Store and Google Play metadata.
7. Help Center owners must reconcile this glossary with WRE-92 before the next
   authenticated publication. Existing article IDs and source mappings stay intact.

## 8. Implementation and verification record

- The shared TypeScript catalog lives in `packages/content/src/index.ts`.
- Native iOS copy is generated into `apps/ios/DRXApp/Content/DRXContent.swift`;
  `pnpm content:swift:check` prevents drift.
- The copy lint scans marketing, web, Expo, iOS, and Mintlify customer-facing
  sources for the retired labels and unsafe claims.
- The official DRX product document now records the approved public vocabulary,
  the internal-identifier exception, and the core promise.
- Web, marketing, and mobile type checks pass.
- The focused auth and checkout suite passes 190 tests.
- The Mintlify audit checks 22 pages and passes.
- Public visual fixtures pass 9 viewport checks after the cold desktop retry;
  protected Home, New sale, Products, and Customers fixtures pass 12 viewport
  checks across desktop, tablet, and mobile.
- The native iOS arm64 simulator build succeeds.
- `pnpm release:integrity` passes and does not imply deployment, store upload,
  Help Center publication, or release.
