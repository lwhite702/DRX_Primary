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
      "The basics of DRX: sales, stock, customers, payments, and privacy.",
    tags: [
      "help",
      "v1",
      "category:getting-started",
      "platform:both",
      "role:all",
      "order:001",
    ],
    content: `
      <p>DRX helps you keep customers, products, stock, sales, payments, and balances due in one place.</p>
      <h3>Who is this for?</h3>
      <p>Owners, Managers, and Staff.</p>
      <h3>Key Features</h3>
      <ul>
        <li><strong>Privacy:</strong> Choose what customer details DRX saves.</li>
        <li><strong>Protect details:</strong> Sensitive customer details are encrypted before storage.</li>
        <li><strong>What’s saved:</strong> Check how much customer information you keep.</li>
        <li><strong>Delete old records:</strong> Choose when temporary customer records are removed.</li>
        <li><strong>Offline:</strong> Support varies by device and action. Check before relying on it.</li>
      </ul>
      <h3>Common Mistakes</h3>
      <ul><li>Thinking it's cloud-only. Sync is automatic but requires internet.</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Businesses Stay Separate</li>
         <li>Owner Setup: Business Info, Units, Privacy</li>
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
        <li>Choose what customer details are saved.</li>
        <li>Add a Unit.</li>
        <li>Create Staff Accounts.</li>
        <li>Add Products.</li>
      </ol>
      <h3>Common Mistakes</h3>
      <ul><li>Using Owner account for sales.</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Owner Setup: Business Info, Units, Privacy</li>
         <li>Team Roles (Owner, Manager, Staff)</li>
      </ul>
    `,
  },
  {
    title: "Owner Setup: Business Info, Units, Privacy",
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
       <li>Choose Hide details, Protect details, or Keep details.</li>
      </ol>
      <h3>Fixes</h3>
      <ul><li>If logo doesn't load, check file size (< 2MB).</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Choose What Customer Details Are Saved</li>
         <li>Businesses Stay Separate</li>
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
        <li>Open Products.</li>
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
    title: "Team Roles (Owner, Manager, Staff)",
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
        <li><strong>Manager:</strong> Products, stock, team, and reports.</li>
        <li><strong>Staff:</strong> Sales, basic customer add.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Team Members and Choose Roles</li>
         <li>Sensitive Actions: Who Can Do What</li>
      </ul>
    `,
  },
  {
    title: "Businesses Stay Separate",
    summary: "How DRX keeps each business in its own account area.",
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
      <p>DRX checks business access before showing records. Team members should only see businesses they are allowed to open.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>What DRX Is and How It Works</li>
         <li>Choose What Customer Details Are Saved</li>
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
         <li>New Sale Troubleshooting: Common Fixes</li>
      </ul>
    `,
  },

  // POS and Sales (9)
  {
    title: "Start a Sale (Mobile)",
    summary: "How to begin a new sale.",
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
        <li>Open New sale.</li>
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

  // Stock (12)
  {
    title: "Stock Basics: Units and Conversions",
    summary: "How DRX tracks grams and whole units.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:018",
    ],
    content: `
      <p>DRX can track products by weight or by count.</p>
      <ul>
         <li><strong>Base unit:</strong> The unit DRX uses to keep the stock count.</li>
         <li><strong>Conversions:</strong> For example, selling 3.5g removes 3.5g from stock.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Stock (Mobile)</li>
         <li>Product Costs (If Enabled)</li>
      </ul>
    `,
  },
  {
    title: "Add Stock (Mobile)",
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
      <p>Add stock from your phone.</p>
      <ol>
        <li>Open Products and tap Add stock.</li>
        <li>Scan or search for the product.</li>
        <li>Enter what came in.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Stock Basics: Units and Conversions</li>
         <li>Bulk Intake (Web): Multi-row Entry</li>
      </ul>
    `,
  },
  {
    title: "Fix a Count: Add, Remove, or Set",
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
         <li>Stock History: See Recent Changes</li>
      </ul>
    `,
  },
  {
    title: "Required Reasons: How and Why",
    summary: "Why you must give a reason when a stock count changes.",
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
      <p>Every count change needs a reason, such as Damaged or Transfer. DRX adds it to History.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Fix a Count: Add, Remove, or Set</li>
         <li>Audit Logs + Exports: What’s Recorded, What’s Allowed</li>
      </ul>
    `,
  },
  {
    title: "Stock History: See Recent Changes",
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
      <p>Open a product and choose Stock history. You’ll see sales, added stock, and count fixes.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Fix a Count: Add, Remove, or Set</li>
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
        <li>An alert appears on Home when stock falls below this number.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Stock Basics: Units and Conversions</li>
         <li>Add Stock (Mobile)</li>
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
      <p>Enter the cost per unit or gram when you add stock.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Stock Basics: Units and Conversions</li>
         <li>Add Stock (Mobile)</li>
      </ul>
    `,
  },
  {
    title: "Add Stock in Bulk (Web)",
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
      <p>Add a larger delivery.</p>
      <p>Use Add stock in bulk to enter several products and quantities before saving.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Stock (Mobile)</li>
         <li>CSV Import (Web): Template + Fixing Errors</li>
      </ul>
    `,
  },
  {
    title: "CSV Import (Web): Template + Fixing Errors",
    summary: "Add many products from a spreadsheet.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:web",
      "role:manager",
      "order:026",
    ],
    content: `
      <p>Add a long product list faster.</p>
      <ol>
        <li>Download our CSV template.</li>
        <li>Fill it out (don't change headers).</li>
        <li>Upload and review errors before confirming.</li>
      </ol>
      <h3>Common Mistakes</h3>
      <ul><li>Changing column names.</li><li>Duplicate SKUs.</li></ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Stock in Bulk (Web)</li>
         <li>Stock Conflicts: What They Mean</li>
      </ul>
    `,
  },
  {
    title: "Stock Conflicts: What They Mean",
    summary: "Choose which change to keep when stock updates clash.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:027",
    ],
    content: `
      <p>A conflict means the same product was changed in two places.</p>
      <p>Review both changes, then choose the count you want to keep.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Stock Troubleshooting: Add Stock Errors</li>
         <li>Offline Sales: What Happens</li>
      </ul>
    `,
  },
  {
    title: "Stock Troubleshooting: Add Stock Errors",
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
        <li><strong>Count below zero:</strong> Count what is on hand, then fix the count.</li>
        <li><strong>Can't find a product:</strong> Check the Archived filter.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Fix a Count: Add, Remove, or Set</li>
         <li>Stock Habits That Keep Counts Right</li>
      </ul>
    `,
  },
  {
    title: "Stock Habits That Keep Counts Right",
    summary: "Simple habits that help keep stock counts accurate.",
    tags: [
      "help",
      "v1",
      "category:inventory",
      "platform:both",
      "role:manager",
      "order:029",
    ],
    content: `
      <p>Small checks prevent bigger count problems.</p>
      <ul>
        <li>Count a few products regularly.</li>
        <li>Record damaged or wasted stock right away.</li>
        <li>Limit who can fix stock counts.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Sensitive Actions: Who Can Do What</li>
         <li>Stock Basics: Units and Conversions</li>
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
         <li>Stock Basics: Units and Conversions</li>
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
        <li><strong>Customer:</strong> Keeps the details, history, and balance you choose to record.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Add a Customer (Minimal vs Full Details)</li>
         <li>Choose What Customer Details Are Saved</li>
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
         <li>Who Can See Customer Details</li>
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
    title: "Who Can See Customer Details",
    summary: "How your privacy choice changes what the team sees.",
    tags: [
      "help",
      "v1",
      "category:customers",
      "platform:both",
      "role:owner",
      "order:040",
    ],
    content: `
      <p>Choose how much customer information your team can see.</p>
      <ul>
         <li><strong>Keep details:</strong> Save the details you choose to collect.</li>
         <li><strong>Protect details:</strong> Limit sensitive details by role.</li>
         <li><strong>Hide details:</strong> Save only the minimum needed.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Choose What Customer Details Are Saved</li>
         <li>Sensitive Actions: Who Can Do What</li>
      </ul>
    `,
  },

  // Balances due (5)
  {
    title: "Balances Due: Limits and Rules",
    summary: "Keep a clear record when a customer still owes money.",
    tags: [
      "help",
      "v1",
      "category:credit",
      "platform:both",
      "role:owner",
      "order:041",
    ],
    content: `
      <p>Record what is owed and who can approve a balance.</p>
      <p>DRX keeps the balance with the customer record so payments are easier to follow.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Set Balance Limits</li>
         <li>See Balances Due</li>
      </ul>
    `,
  },
  {
    title: "Set Balance Limits",
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
        <li>Set the "Balance Limit".</li>
        <li>Save. DRX warns when a sale would pass the limit.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Balances Due: Limits and Rules</li>
         <li>Add a Sale to a Balance</li>
      </ul>
    `,
  },
  {
    title: "Add a Sale to a Balance",
    summary: "Record a sale the customer will pay later.",
    tags: [
      "help",
      "v1",
      "category:credit",
      "platform:mobile",
      "role:staff",
      "order:043",
    ],
    content: `
      <p>Add the sale to the customer's balance.</p>
      <ol>
        <li>Add items to cart.</li>
        <li>Assign Customer.</li>
        <li>Select "Charge to Account" at checkout.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Set Balance Limits</li>
         <li>Record a Payment</li>
      </ul>
    `,
  },
  {
    title: "Record a Payment",
    summary: "Record a customer payment against a balance.",
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
         <li>Add a Sale to a Balance</li>
         <li>See Balances Due</li>
      </ul>
    `,
  },
  {
    title: "See Balances Due",
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
      <p>See who still owes you and how long each balance has been open.</p>
      <p>Open the "Balances due" report to review customer balances.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Balances Due: Limits and Rules</li>
         <li>Record a Payment</li>
      </ul>
    `,
  },

  // Roles and Permissions (3)
  {
    title: "Add Team Members and Choose Roles",
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
        <li>Go to Settings > Team.</li>
        <li>Select Add team member.</li>
        <li>Choose Role (Manager, Staff).</li>
        <li>Set Pin.</li>
      </ol>
      <h3>Related Articles</h3>
      <ul>
         <li>Team Roles Overview (Owner, Manager, Staff)</li>
         <li>Remove Team Access</li>
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
      <p>Owners and managers can control who may issue refunds, void saved orders, view full reports, or fix stock counts.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Team Roles Overview (Owner, Manager, Staff)</li>
         <li>History and Exports: What’s Recorded</li>
      </ul>
    `,
  },
  {
    title: "Remove Team Access",
    summary: "Remove access when someone leaves your team.",
    tags: [
      "help",
      "v1",
      "category:roles",
      "platform:web",
      "role:owner",
      "order:048",
    ],
    content: `
      <p>Open Settings > Team and deactivate the team member.</p>
      <p>Their access ends after the change reaches each connected device.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Add Team Members and Choose Roles</li>
         <li>Sensitive Actions: Who Can Do What</li>
      </ul>
    `,
  },

  // Privacy, Exports, Audit, Security (2)
  {
    title: "Choose What Customer Details Are Saved",
    summary: "Choose how much customer information DRX keeps.",
    tags: [
      "help",
      "v1",
      "category:privacy",
      "platform:both",
      "role:owner",
      "order:049",
    ],
    content: `
      <p>Start with the least information your business needs.</p>
      <ul>
        <li><strong>Hide details:</strong> Save only the minimum needed.</li>
        <li><strong>Protect details:</strong> Limit sensitive details by role.</li>
        <li><strong>Keep details:</strong> Save the details you choose to collect.</li>
      </ul>
      <h3>Related Articles</h3>
      <ul>
         <li>Owner Setup: Business Info, Units, Privacy</li>
         <li>Who Can See Customer Details</li>
      </ul>
    `,
  },
  {
    title: "History and Exports: What’s Recorded",
    summary: "See the record kept for sensitive actions.",
    tags: [
      "help",
      "v1",
      "category:privacy",
      "platform:web",
      "role:owner",
      "order:050",
    ],
    content: `
      <p>Discounts, voids, and stock changes are added to History and kept under the current retention rules.</p>
      <h3>Related Articles</h3>
      <ul>
         <li>Sensitive Actions: Who Can Do What</li>
         <li>Owner Setup: Business Info, Units, Privacy</li>
      </ul>
    `,
  },
];
