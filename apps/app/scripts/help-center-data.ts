export interface HelpArticle {
  title: string;
  summary: string;
  tags: string[];
  content: string;
}

export const helpCenterData: HelpArticle[] = [
  // Getting Started (8)
  {
    title: "What DRX Is and How It Works",
    summary:
      "The basics of DRX: privacy, local-first data, and how it keeps your business running smoothly.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:both",
      "role:all",
      "order:001",
    ],
    content: `
      <p>DRX is a modern point-of-sale system built for speed and privacy. Unlike cloud-only systems, DRX stores data on your device first.</p>
      <h3>Who is this for?</h3>
      <p>Owners, Managers, and Staff.</p>
      <h3>Key Features</h3>
      <ul>
        <li><strong>Privacy Profiles:</strong> You decide data retention.</li>
        <li><strong>Vault Mode:</strong> Encryption keys stay in your environment, never in the database.</li>
        <li><strong>Minimal Data Engine:</strong> Monitor stored PII counts and trend changes.</li>
        <li><strong>Ephemeral Profiles:</strong> Quick POS customers can auto-expire in 1, 7, or 30 days.</li>
        <li><strong>Offline Mode:</strong> Keep selling without Wi-Fi.</li>
      </ul>
      <h3>Common Mistakes</h3>
      <ul><li>Thinking it's cloud-only. Sync is automatic but requires internet.</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Tenant Basics: Businesses Stay Separate</li>
         <li>Owner Setup: Business Info, Units, Privacy Profile</li>
      </ul>
    `,
  },
  {
    title: "Setup Checklist Before Your First Sale",
    summary: "A quick list of things to do before you open for business.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:web",
      "role:owner",
      "order:002",
    ],
    content: `
      <p>Run through this list to be ready.</p>
      <ol>
        <li>Create Business Profile.</li>
        <li>Configure Privacy Profile.</li>
        <li>Add a Unit.</li>
        <li>Create Staff Accounts.</li>
        <li>Add Products.</li>
      </ol>
      <h3>Common Mistakes</h3>
      <ul><li>Using Owner account for sales.</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Owner Setup: Business Info, Units, Privacy Profile</li>
         <li>Staff Roles Overview (Owner, Manager, Staff)</li>
      </ul>
    `,
  },
  {
    title: "Owner Setup: Business Info, Units, Privacy Profile",
    summary: "Configure your business identity and privacy settings.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:web",
      "role:owner",
      "order:003",
    ],
    content: `
      <p>Set up your core business details.</p>
      <ol>
       <li>Go to Settings > Business.</li>
       <li>Enter Name and Logo.</li>
       <li>Set Privacy Profile (Alias Mode, Standard Mode, Business CRM Mode).</li>
      </ol>
      <h3>Fixes</h3>
      <ul><li>If logo doesn't load, check file size (< 2MB).</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Privacy Profiles Explained (Alias Mode/Standard Mode/Business CRM Mode)</li>
         <li>Tenant Basics: Businesses Stay Separate</li>
      </ul>
    `,
  },
  {
    title: "Adding Your First Products",
    summary: "How to manually add products to your catalog.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:web",
      "role:manager",
      "order:004",
    ],
    content: `
      <p>Add products one by one.</p>
      <ol>
        <li>Go to Inventory > Products.</li>
        <li>Click "Add Product".</li>
        <li>Enter Name, Price, and SKU.</li>
      </ol>
      <h3>Common Mistakes</h3>
      <ul><li> forgetting to assign a category.</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Products: Create, Edit, Archive</li>
         <li>Importing Products via CSV</li>
      </ul>
    `,
  },
  {
    title: "Quick Quantities (Quickpicks): Set, Edit, Use",
    summary: "Set up fast-access buttons for common quantities.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:mobile",
      "role:manager",
      "order:005",
    ],
    content: `
      <p>Speed up sales with Quickpicks.</p>
      <ol>
        <li>Long press a product tile.</li>
        <li>Select "Edit Quickpicks".</li>
        <li>Choose common amounts (e.g., 1g, 3.5g).</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Items Fast: Search, Quickpicks, Favorites</li>
         <li>Start a Sale (Mobile)</li>
      </ul>
    `,
  },
  {
    title: "Staff Roles Overview (Owner, Manager, Staff)",
    summary: "Understand what each role can see and do.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:both",
      "role:owner",
      "order:006",
    ],
    content: `
      <p>Roles define access.</p>
      <ul>
        <li><strong>Owner:</strong> Full access, billing, privacy settings.</li>
        <li><strong>Manager:</strong> Inventory, staff management, reports.</li>
        <li><strong>Staff:</strong> Sales, basic customer add.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Staff and Assign Roles</li>
         <li>Sensitive Actions: Who Can Do What</li>
      </ul>
    `,
  },
  {
    title: "Tenant Basics: Businesses Stay Separate",
    summary: "How data isolation works in DRX.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:web",
      "role:owner",
      "order:007",
    ],
    content: `
      <p>Your data is yours.</p>
      <p>Each tenant is completely isolated. Staff in one tenant cannot see data from another.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>What DRX Is and How It Works</li>
         <li>Privacy Profiles Explained (Alias Mode/Standard Mode/Business CRM Mode)</li>
      </ul>
    `,
  },
  {
    title: "Common Setup Mistakes and Fixes",
    summary: "Avoid these common pitfalls during setup.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:both",
      "role:owner",
      "order:008",
    ],
    content: `
      <p>Check these before launching.</p>
      <ul>
        <li>Not setting tax rates.</li>
        <li>Ignoring receipt printer setup.</li>
        <li>Leaving test data in the system.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Setup Checklist Before Your First Sale</li>
         <li>POS Troubleshooting: Most Common Fixes</li>
      </ul>
    `,
  },

  // POS and Sales (9)
  {
    title: "Start a Sale (Mobile)",
    summary: "How to begin a new transaction.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:staff",
      "order:009",
    ],
    content: `
      <p>Starting a sale is simple.</p>
      <ol>
        <li>Tap "New Sale" on the POS screen.</li>
        <li>Add items to the cart.</li>
        <li>Tap "Checkout".</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Items Fast: Search, Quickpicks, Favorites</li>
         <li>Receipts: What’s Included and Reprints</li>
      </ul>
    `,
  },
  {
    title: "Add Items Fast: Search, Quickpicks, Favorites",
    summary: "Three ways to find products on the POS.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:staff",
      "order:010",
    ],
    content: `
      <p>Find what you need quickly.</p>
      <ul>
        <li><strong>Search:</strong> Type name or SKU.</li>
        <li><strong>Quickpicks:</strong> Tap pre-set buttons.</li>
        <li><strong>Favorites:</strong> Star items for top-row access.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Quick Quantities (Quickpicks): Set, Edit, Use</li>
         <li>Product Search Tips (Mobile)</li>
      </ul>
    `,
  },
  {
    title: "Receipts: What’s Included and Reprints",
    summary: "Understanding receipts and how to print them again.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:staff",
      "order:011",
    ],
    content: `
      <p>Receipts show items, tax, and total.</p>
      <p>To reprint: Go to Order History > Select Order > Tap "Print Receipt".</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Start a Sale (Mobile)</li>
         <li>Offline Sales: What Happens</li>
      </ul>
    `,
  },
  {
    title: "Discounts: Apply and Restrict (If Enabled)",
    summary: "How to apply discounts and who can do it.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:manager",
      "order:012",
    ],
    content: `
      <p>Applying discounts.</p>
      <ol>
        <li>Tap the "Discount" button in the cart.</li>
        <li>Select a preset or enter a manual amount (if allowed).</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Sensitive Actions: Who Can Do What</li>
         <li>Start a Sale (Mobile)</li>
      </ul>
    `,
  },
  {
    title: "Refunds and Voids (If Enabled)",
    summary: "Correcting mistakes and returning items.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:manager",
      "order:013",
    ],
    content: `
      <p>Fixing orders.</p>
      <p><strong>Void:</strong> Before payment. Swipe left on cart item.</p>
      <p><strong>Refund:</strong> After payment. Go to Order History > Select Order > Refund.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Receipts: What’s Included and Reprints</li>
         <li>End-of-Shift Basics</li>
      </ul>
    `,
  },
  {
    title: "End-of-Shift Basics",
    summary: "Closing out your register for the day.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:staff",
      "order:014",
    ],
    content: `
      <p>Wrap up your shift.</p>
      <ol>
        <li>Count cash drawer.</li>
        <li>Tap "End Shift" in menu.</li>
        <li>Enter closing amounts.</li>
        <li>Print Z-Report.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>POS Troubleshooting: Most Common Fixes</li>
         <li>Audit Logs + Exports: What’s Recorded, What’s Allowed</li>
      </ul>
    `,
  },
  {
    title: "POS Troubleshooting: Most Common Fixes",
    summary: "Quick fixes for printer, sync, and app issues.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:staff",
      "order:015",
    ],
    content: `
      <p>If things go wrong:</p>
      <ul>
        <li><strong>Printer not printing:</strong> Check IP address and paper.</li>
        <li><strong>App slow:</strong> Force quit and restart.</li>
        <li><strong>Sync failed:</strong> Check Wi-Fi connection.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Offline Sales: What Happens</li>
         <li>Common Setup Mistakes and Fixes</li>
      </ul>
    `,
  },
  {
    title: "Offline Sales: What Happens",
    summary: "Selling without an internet connection.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:staff",
      "order:016",
    ],
    content: `
      <p>DRX works offline.</p>
      <p>Sales are stored locally. They will sync automatically when internet returns. <strong>Do not uninstall the app</strong> while offline or data will be lost.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>What DRX Is and How It Works</li>
         <li>POS Troubleshooting: Most Common Fixes</li>
      </ul>
    `,
  },
  {
    title: "Speed Tips: Keeping Checkout Fast",
    summary: "Tips to process customers faster.",
    tags: [
      "help",
      "v1",
      "category:pos",
      "platform:mobile",
      "role:staff",
      "order:017",
    ],
    content: `
      <p>Be a speed demon.</p>
      <ul>
        <li>Use Quickpicks.</li>
        <li>Use Favorites for top sellers.</li>
        <li>Keep a barcode scanner handy.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Items Fast: Search, Quickpicks, Favorites</li>
         <li>Quick Quantities (Quickpicks): Set, Edit, Use</li>
      </ul>
    `,
  },

  // Inventory (12)
  {
    title: "Inventory Basics: Units, Conversions, Canonical Stock",
    summary: "How we track Grams vs Units.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:018",
    ],
    content: `
      <p>DRX tracks inventory flexibly.</p>
      <ul>
         <li><strong>Canonical:</strong> The base unit (e.g., Grams for flower, Count for edibles).</li>
         <li><strong>Conversions:</strong> e.g., "1/8th" = 3.5g. We deduct 3.5g when you sell an eighth.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Inventory (Mobile Intake)</li>
         <li>Product Costs (If Enabled)</li>
      </ul>
    `,
  },
  {
    title: "Add Inventory (Mobile Intake)",
    summary: "Bringing new stock in using the mobile app.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:mobile",
      "role:manager",
      "order:019",
    ],
    content: `
      <p>Receive stock on the go.</p>
      <ol>
        <li>Go to Inventory > Intake.</li>
        <li>Scan or search product.</li>
        <li>Enter quantity received.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Inventory Basics: Units, Conversions, Canonical Stock</li>
         <li>Bulk Intake (Web): Multi-row Entry</li>
      </ul>
    `,
  },
  {
    title: "Adjust Inventory: Increase, Decrease, Set-to Value",
    summary: "Fixing counts and handling breakage.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:020",
    ],
    content: `
      <p>Keep counts accurate.</p>
      <ul>
        <li><strong>Increase:</strong> Found items.</li>
        <li><strong>Decrease:</strong> Breakage, theft, loss.</li>
        <li><strong>Set-to:</strong> Audit corrections.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Required Reasons: How and Why</li>
         <li>Inventory History: View Recent Changes</li>
      </ul>
    `,
  },
  {
    title: "Required Reasons: How and Why",
    summary: "Why you must give a reason for inventory changes.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:021",
    ],
    content: `
      <p>Accountability matters.</p>
      <p>Every adjustment requires a reason (e.g., "Damaged", "Transfer") for the audit log.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Adjust Inventory: Increase, Decrease, Set-to Value</li>
         <li>Audit Logs + Exports: What’s Recorded, What’s Allowed</li>
      </ul>
    `,
  },
  {
    title: "Inventory History: View Recent Changes",
    summary: "See who changed what and when.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:web",
      "role:manager",
      "order:022",
    ],
    content: `
      <p>Trace your stock.</p>
      <p>Go to Product > History tab to see a timeline of all sales, intakes, and adjustments.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Adjust Inventory: Increase, Decrease, Set-to Value</li>
         <li>Audit Logs + Exports: What’s Recorded, What’s Allowed</li>
      </ul>
    `,
  },
  {
    title: "Low Stock Alerts (If Enabled)",
    summary: "Get notified when running low.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:web",
      "role:manager",
      "order:023",
    ],
    content: `
      <p>Never run out.</p>
      <ol>
        <li>Set a "Low Stock Threshold" on the product page.</li>
        <li>Notifications appear on the Dashboard when stock dips below this number.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Inventory Basics: Units, Conversions, Canonical Stock</li>
         <li>Add Inventory (Mobile Intake)</li>
      </ul>
    `,
  },
  {
    title: "Product Costs (If Enabled)",
    summary: "Tracking COGS and profitability.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:web",
      "role:owner",
      "order:024",
    ],
    content: `
      <p>Know your margins.</p>
      <p>Enter cost per unit (or gram) during Intake or on the Product page.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Inventory Basics: Units, Conversions, Canonical Stock</li>
         <li>Add Inventory (Mobile Intake)</li>
      </ul>
    `,
  },
  {
    title: "Bulk Intake (Web): Multi-row Entry",
    summary: "Adding many items at once on the computer.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:web",
      "role:manager",
      "order:025",
    ],
    content: `
      <p>Process big shipments.</p>
      <p>Use the "Bulk Intake" grid to enter multiple products and quantities in one save action.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Inventory (Mobile Intake)</li>
         <li>CSV Import (Web): Template + Fixing Errors</li>
      </ul>
    `,
  },
  {
    title: "CSV Import (Web): Template + Fixing Errors",
    summary: "Importing extensive catalogs via spreadsheet.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:web",
      "role:manager",
      "order:026",
    ],
    content: `
      <p>Move data fast.</p>
      <ol>
        <li>Download our CSV template.</li>
        <li>Fill it out (don't change headers).</li>
        <li>Upload and review errors before confirming.</li>
      </ol>
      <h3>Common Mistakes</h3>
      <ul><li>Changing column names.</li><li>Duplicate SKUs.</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Bulk Intake (Web): Multi-row Entry</li>
         <li>Inventory Conflicts: What They Mean</li>
      </ul>
    `,
  },
  {
    title: "Inventory Conflicts: What They Mean",
    summary: "Resolving sync issues or duplicate SKUs.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:027",
    ],
    content: `
      <p>When data clashes.</p>
      <p>A conflict means the same item was changed in two places. Choose which version (Server vs Local) to keep.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Inventory Troubleshooting: Intake Errors + Fixes</li>
         <li>Offline Sales: What Happens</li>
      </ul>
    `,
  },
  {
    title: "Inventory Troubleshooting: Intake Errors + Fixes",
    summary: "Solving common stock problems.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:028",
    ],
    content: `
      <p>Stuck?</p>
      <ul>
        <li><strong>Negative Inventory:</strong> You sold more than recorded. Count and adjust.</li>
        <li><strong>Can't Find Product:</strong> Check Archieved filter.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Adjust Inventory: Increase, Decrease, Set-to Value</li>
         <li>Inventory Best Practices (Counts That Stay Accurate)</li>
      </ul>
    `,
  },
  {
    title: "Inventory Best Practices (Counts That Stay Accurate)",
    summary: "Habits for a healthy warehouse.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:029",
    ],
    content: `
      <p>Stay ready.</p>
      <ul>
        <li>Count regularly (cycle counts).</li>
        <li>Process breakdown/waste immediately.</li>
        <li>Restrict adjustment permissions.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Sensitive Actions: Who Can Do What</li>
         <li>Inventory Basics: Units, Conversions, Canonical Stock</li>
      </ul>
    `,
  },

  // Products and Aliases (7)
  {
    title: "Products: Create, Edit, Archive",
    summary: "Managing your catalog lifecycle.",
    tags: [
      "help",
      "v1",
      "category:products",
      "platform:web",
      "role:manager",
      "order:030",
    ],
    content: `
      <p>The core of your sales.</p>
      <ul>
        <li><strong>Create:</strong> Add new items.</li>
        <li><strong>Edit:</strong> Update prices or names.</li>
        <li><strong>Archive:</strong> Hide old items without deleting history.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Adding Your First Products</li>
         <li>Aliases/Nicknames: What They Are</li>
      </ul>
    `,
  },
  {
    title: "Aliases/Nicknames: What They Are",
    summary: "Using short codes to sell faster.",
    tags: [
      "help",
      "v1",
      "category:products",
      "platform:both",
      "role:staff",
      "order:031",
    ],
    content: `
      <p>Type less, sell more.</p>
      <p>An alias (e.g., "OG8") can map to "OG Kush - 1/8th". Type the alias in search to add it instantly.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Create Aliases Staff Will Actually Use</li>
         <li>Alias Auto-Fill: Quantity + Unit Behavior</li>
      </ul>
    `,
  },
  {
    title: "Create Aliases Staff Will Actually Use",
    summary: "Making nicknames intuitive.",
    tags: [
      "help",
      "v1",
      "category:products",
      "platform:web",
      "role:manager",
      "order:032",
    ],
    content: `
      <p>Keep it simple.</p>
      <p>Use logic like [Strain][Size]. Example: "BG35" for "Billy Goat 3.5g".</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Aliases/Nicknames: What They Are</li>
         <li>Alias Collisions: Fix Duplicate Nicknames</li>
      </ul>
    `,
  },
  {
    title: "Alias Auto-Fill: Quantity + Unit behavior",
    summary: "How aliases speed up cart entry.",
    tags: [
      "help",
      "v1",
      "category:products",
      "platform:both",
      "role:manager",
      "order:033",
    ],
    content: `
      <p>Smart mapping.</p>
      <p>Aliases trigger a specific quantity (e.g. 3.5) and unit (e.g. grams) so staff don't have to select them.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Aliases/Nicknames: What They Are</li>
         <li>Inventory Basics: Units, Conversions, Canonical Stock</li>
      </ul>
    `,
  },
  {
    title: "Alias Collisions: Fix Duplicate Nicknames",
    summary: "When two products have the same code.",
    tags: [
      "help",
      "v1",
      "category:products",
      "platform:web",
      "role:manager",
      "order:034",
    ],
    content: `
      <p>Avoid confusion.</p>
      <p>DRX will warn you if an alias is used twice. You must change one to save.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Create Aliases Staff Will Actually Use</li>
         <li>Products: Create, Edit, Archive</li>
      </ul>
    `,
  },
  {
    title: "Product Search Tips (Mobile)",
    summary: "Find items instantly during a rush.",
    tags: [
      "help",
      "v1",
      "category:products",
      "platform:mobile",
      "role:staff",
      "order:035",
    ],
    content: `
      <p>Search better.</p>
      <ul>
        <li>Scan barcode (fastest).</li>
        <li>Type Alias.</li>
        <li>Partial name search.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Items Fast: Search, Quickpicks, Favorites</li>
         <li>Barcode Mapping (If Enabled)</li>
      </ul>
    `,
  },
  {
    title: "Barcode Mapping (If Enabled)",
    summary: "Using manufacturer barcodes.",
    tags: [
      "help",
      "v1",
      "category:products",
      "platform:web",
      "role:manager",
      "order:036",
    ],
    content: `
      <p>Scan to sell.</p>
      <ol>
        <li>Edit Product.</li>
        <li>Scan the barcode into the "Barcode" field.</li>
        <li>Save.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Products: Create, Edit, Archive</li>
         <li>Product Search Tips (Mobile)</li>
      </ul>
    `,
  },

  // Customers (4)
  {
    title: "Customers: When You Need Them and When You Don’t",
    summary: "Understanding guest checkout vs tracked profiles.",
    tags: [
      "help",
      "v1",
      "category:customers",
      "platform:both",
      "role:staff",
      "order:037",
    ],
    content: `
      <p>You don't always need a name.</p>
      <ul>
        <li><strong>Guest:</strong> Fast, no data recorded.</li>
        <li><strong>Profile:</strong> Tracks history, preferences, and credit.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add a Customer (Minimal vs Full Details)</li>
         <li>Privacy Profiles Explained (Alias Mode/Standard Mode/Business CRM Mode)</li>
      </ul>
    `,
  },
  {
    title: "Add a Customer (Minimal vs Full Details)",
    summary: "Creating profiles quickly.",
    tags: [
      "help",
      "v1",
      "category:customers",
      "platform:mobile",
      "role:staff",
      "order:038",
    ],
    content: `
      <p>Get the basics.</p>
      <p>You can create a profile with just a nickname, or add full info (Name, Phone, Email) if permitted.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Customer Visibility by Privacy Profile</li>
         <li>Customers: When You Need Them and When You Don’t</li>
      </ul>
    `,
  },
  {
    title: "Customer Search and History",
    summary: "Finding profiles and past orders.",
    tags: [
      "help",
      "v1",
      "category:customers",
      "platform:mobile",
      "role:staff",
      "order:039",
    ],
    content: `
      <p>Know your regulars.</p>
      <p>Search by name or phone. Tap "History" to see what they bought last time.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Add a Customer (Minimal vs Full Details)</li>
         <li>Aliases/Nicknames: What They Are</li>
      </ul>
    `,
  },
  {
    title: "Customer Visibility by Privacy Profile",
    summary: "How privacy rules hide customer info.",
    tags: [
      "help",
      "v1",
      "category:customers",
      "platform:both",
      "role:owner",
      "order:040",
    ],
    content: `
      <p>Protecting data.</p>
      <ul>
         <li><strong>Open:</strong> All staff see full details.</li>
         <li><strong>Private:</strong> Staff see Nickname only.</li>
         <li><strong>Max Secure:</strong> Details masked even for managers.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Privacy Profiles Explained (Alias Mode/Standard Mode/Business CRM Mode)</li>
         <li>Sensitive Actions: Who Can Do What</li>
      </ul>
    `,
  },

  // Credit (5)
  {
    title: "Credit Basics: Limits, Roles, Rules",
    summary: "How store credit works in DRX.",
    tags: [
      "help",
      "v1",
      "category:credit",
      "platform:both",
      "role:owner",
      "order:041",
    ],
    content: `
      <p>Lend responsibly.</p>
      <p>Credit allows customers to buy now, pay later. You set the rules on who can authorize it.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Set Credit Limits (Owner/Manager)</li>
         <li>Overdue Balances: Viewing and Managing</li>
      </ul>
    `,
  },
  {
    title: "Set Credit Limits (Owner/Manager)",
    summary: "Controlling how much a customer can owe.",
    tags: [
      "help",
      "v1",
      "category:credit",
      "platform:web",
      "role:manager",
      "order:042",
    ],
    content: `
      <p>Set boundaries.</p>
      <ol>
        <li>Go to Customer Profile.</li>
        <li>Set "Credit Limit".</li>
        <li>Save. Stops sales if balance exceeds limit.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Credit Basics: Limits, Roles, Rules</li>
         <li>Record a Credit Sale (If Enabled)</li>
      </ul>
    `,
  },
  {
    title: "Record a Credit Sale (If Enabled)",
    summary: "Checking out on account.",
    tags: [
      "help",
      "v1",
      "category:credit",
      "platform:mobile",
      "role:staff",
      "order:043",
    ],
    content: `
      <p>Put it on the tab.</p>
      <ol>
        <li>Add items to cart.</li>
        <li>Assign Customer.</li>
        <li>Select "Charge to Account" at checkout.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Set Credit Limits (Owner/Manager)</li>
         <li>Record a Payment</li>
      </ul>
    `,
  },
  {
    title: "Record a Payment",
    summary: "Accepting payment for past debts.",
    tags: [
      "help",
      "v1",
      "category:credit",
      "platform:mobile",
      "role:staff",
      "order:044",
    ],
    content: `
      <p>Clearing the balance.</p>
      <ol>
        <li>Go to Customer Profile.</li>
        <li>Tap "Pay Balance".</li>
        <li>Enter amount and payment method.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Record a Credit Sale (If Enabled)</li>
         <li>Overdue Balances: Viewing and Managing</li>
      </ul>
    `,
  },
  {
    title: "Overdue Balances: Viewing and Managing",
    summary: "Tracking who owes you money.",
    tags: [
      "help",
      "v1",
      "category:credit",
      "platform:web",
      "role:manager",
      "order:045",
    ],
    content: `
      <p>Get paid.</p>
      <p>Use the "Outstanding Balances" report to see all debts aged by time.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Credit Basics: Limits, Roles, Rules</li>
         <li>Record a Payment</li>
      </ul>
    `,
  },

  // Roles and Permissions (3)
  {
    title: "Add Staff and Assign Roles",
    summary: "Creating logins for your team.",
    tags: [
      "help",
      "v1",
      "category:roles",
      "platform:web",
      "role:owner",
      "order:046",
    ],
    content: `
      <p>Grow your team.</p>
      <ol>
        <li>Settings > Staff.</li>
        <li>Add New.</li>
        <li>Choose Role (Manager, Staff).</li>
        <li>Set Pin.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Staff Roles Overview (Owner, Manager, Staff)</li>
         <li>Remove Access: Offboarding Staff</li>
      </ul>
    `,
  },
  {
    title: "Sensitive Actions: Who Can Do What",
    summary: "Understanding permission gates.",
    tags: [
      "help",
      "v1",
      "category:roles",
      "platform:both",
      "role:owner",
      "order:047",
    ],
    content: `
      <p>Protect your business.</p>
      <p>Only Owners/Managers can usually: Refunds, Void saved orders, View full reports, Edit inventory.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Staff Roles Overview (Owner, Manager, Staff)</li>
         <li>Audit Logs + Exports: What’s Recorded, What’s Allowed</li>
      </ul>
    `,
  },
  {
    title: "Remove Access: Offboarding Staff",
    summary: "Securely removing former employees.",
    tags: [
      "help",
      "v1",
      "category:roles",
      "platform:web",
      "role:owner",
      "order:048",
    ],
    content: `
      <p>Safety first.</p>
      <p>Deactivate the staff member immediately in Settings > Staff. This revokes access to all devices instantly (once synced).</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Staff and Assign Roles</li>
         <li>Sensitive Actions: Who Can Do What</li>
      </ul>
    `,
  },

  // Privacy, Exports, Audit, Security (2)
  {
    title: "Privacy Profiles Explained (Alias Mode/Standard Mode/Business CRM Mode)",
    summary: "Choosing the right data policy for you.",
    tags: [
      "help",
      "v1",
      "category:privacy",
      "platform:both",
      "role:owner",
      "order:049",
    ],
    content: `
      <p>Your data, your rules.</p>
      <ul>
        <li><strong>Open:</strong> Maximum convenience, most data visible.</li>
        <li><strong>Balanced:</strong> Hides sensitive fields from Staff.</li>
        <li><strong>Private:</strong> Minimal retention.</li>
        <li><strong>Max Secure:</strong> Aggressive masking, auto-deletion triggers.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Owner Setup: Business Info, Units, Privacy Profile</li>
         <li>Customer Visibility by Privacy Profile</li>
      </ul>
    `,
  },
  {
    title: "Audit Logs + Exports: What’s Recorded, What’s Allowed",
    summary: "Transparency for sensitive actions.",
    tags: [
      "help",
      "v1",
      "category:privacy",
      "platform:web",
      "role:owner",
      "order:050",
    ],
    content: `
      <p>Trust but verify.</p>
      <p>Sensitive actions (Discounts, Voids, Inventory Changes) are logged forever in the Audit Log. This cannot be deleted.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Sensitive Actions: Who Can Do What</li>
         <li>Owner Setup: Business Info, Units, Privacy Profile</li>
      </ul>
    `,
  },
];
