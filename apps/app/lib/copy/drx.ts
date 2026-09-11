import { drxContent } from "@deelrx/content";

export const drxCopy = {
  common: {
    back: "Back",
    next: "Next",
    save: "Save",
    cancel: "Cancel",
    done: "Done",
    retry: "Try again",
  },
  onboarding: {
    page: {
      label: "Get started",
      title: "Set up your business.",
      body: "Make a few quick choices. You can change them later.",
      businessName: "Business name",
      role: "Your role",
      teamSize: "Team size",
      tooling: "What you use now (optional)",
      toolingPlaceholder: "POS, stock tracker, notes, spreadsheets...",
      submit: "Finish setup",
    },
    wizard: {
      steps: {
        welcome: "Welcome",
        details: "Business details",
        owner: "Owner contact",
        units: "Units",
        quantities: "Quick quantities",
        privacy: "Privacy",
        roles: "Team roles",
        reasons: "Stock reasons",
        nicknames: "Nicknames",
        review: "Review",
        complete: "Done",
      },
      detailsDescription:
        "Add the basics so your records stay in the right place.",
      finish: "Finish setup",
      setupComplete: "You're set.",
      setupFailed: "Setup didn't finish. Try again.",
    },
    welcome: {
      title: "Welcome to DRX.",
      body: "Let's get the basics set. This takes about 2 minutes.",
    },
    privacy: {
      title: drxContent.privacy.section,
      body: "Choose what customer details to save. Old inactive records are deleted after the time shown. You can change this later.",
      presets: {
        aliasMode: {
          label: drxContent.privacy.presets.hideDetails.label,
          desc: drxContent.privacy.presets.hideDetails.description,
        },
        standardMode: {
          label: drxContent.privacy.presets.protectDetails.label,
          desc: drxContent.privacy.presets.protectDetails.description,
        },
        businessCrmMode: {
          label: drxContent.privacy.presets.keepDetails.label,
          desc: drxContent.privacy.presets.keepDetails.description,
        },
      },
    },
  },
  pos: {
    title: drxContent.navigation.newSale,
    subtitlePrefix: "Location:",
    missingBusiness: "Finish setup before starting a sale.",
    cart: {
      emptyTitle: "Nothing here yet.",
      emptyBody: "Scan something or pick a product to start the sale.",
      overrideBadge: "Custom price",
      overrideTitle: "Set price",
      wasPrice: "was",
      saleComplete: "Sale done. Order:",
      checkoutFailed: "Couldn't finish the sale. Try again.",
      priceApplyFailed: "Couldn't change the price.",
      priceUpdatedTo: "Price changed to",
    },
  },
  inventory: {
    title: drxContent.navigation.products,
    description: "Know what you have, what moved, and what is running low.",
    missingBusiness: "Finish setup before working with stock.",
    operationsLabel: "What do you need?",
    searchLabel: "Find product",
    searchPlaceholder: "Name or SKU",
    emptyTitle: "No products yet.",
    emptyBody: "Add your first product and start keeping count.",
    addItem: "Add product",
    lowStock: "Low stock",
    uncategorized: "No category",
    cards: {
      intake: { title: "Add stock", body: "Bring new stock in" },
      adjustment: { title: "Fix count", body: "Correct what's on hand" },
      audit: { title: "Stock history", body: "See every change" },
    },
    dialog: {
      editTitle: "Edit product",
      addTitle: "Add product",
      editBody: "Change the product details.",
      addBody: "Add a product to your stock.",
    },
  },
} as const;
