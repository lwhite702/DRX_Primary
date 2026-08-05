export const drxClerkAuthAppearance = {
  variables: {
    colorPrimary: "#CCFF00",
    colorText: "#F5F5F5",
    colorTextSecondary: "#C7C7C7",
    colorBackground: "transparent",
    colorInputBackground: "#1A1A1A",
    colorInputText: "#F5F5F5",
    colorDanger: "#F87171",
    colorSuccess: "#34D399",
    colorWarning: "#FBBF24",
    colorRing: "#CCFF00",
    borderRadius: "10px",
    fontFamily: "var(--font-plus-jakarta-sans), var(--font-inter), sans-serif",
    fontFamilyButtons: "var(--font-plus-jakarta-sans), var(--font-inter), sans-serif",
  },
  layout: {
    socialButtonsPlacement: "bottom",
    showOptionalFields: false,
    socialButtonsVariant: "blockButton",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full bg-transparent shadow-none",
    card: "w-full gap-6 bg-transparent p-0 shadow-none",
    header: "gap-2 text-left",
    headerTitle: "text-left text-2xl font-bold tracking-[-0.025em] text-[#F5F5F5]",
    headerSubtitle: "text-left text-base leading-6 text-[#C7C7C7]",
    main: "gap-5",
    form: "gap-5",
    formField: "gap-2",
    formFieldLabel: "text-sm font-semibold leading-5 text-[#E7E7E7]",
    formFieldInput:
      "min-h-12 rounded-lg border border-white/15 bg-[#1A1A1A] px-3.5 text-base text-[#F5F5F5] placeholder:text-[#8A8A8A] focus:border-[#CCFF00] focus:ring-2 focus:ring-[#CCFF00] focus:ring-offset-2 focus:ring-offset-[#121212]",
    formFieldInputShowPasswordButton:
      "min-h-11 min-w-11 text-[#C7C7C7] hover:text-[#CCFF00] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]",
    formFieldErrorText: "mt-1 text-sm font-medium leading-5 text-[#FCA5A5]",
    formFieldSuccessText: "mt-1 text-sm font-medium leading-5 text-[#6EE7B7]",
    formButtonPrimary:
      "min-h-12 rounded-lg bg-[#CCFF00] px-4 text-sm font-extrabold uppercase tracking-[0.06em] text-[#0A0A0A] shadow-none hover:bg-[#D7FF38] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00] focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] disabled:opacity-60",
    socialButtonsBlockButton:
      "min-h-12 rounded-lg border border-white/15 bg-[#1A1A1A] text-[#F5F5F5] hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]",
    socialButtonsBlockButtonText: "text-sm font-semibold text-[#F5F5F5]",
    dividerRow: "my-1",
    dividerLine: "bg-white/15",
    dividerText: "px-3 font-mono text-xs uppercase tracking-[0.14em] text-[#AFAFAF]",
    alert: "rounded-lg border border-red-400/40 bg-red-400/10 px-4 py-3 text-[#FECACA]",
    alertText: "text-sm font-medium leading-5",
    formResendCodeLink:
      "min-h-11 text-sm font-semibold text-[#CCFF00] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]",
    otpCodeFieldInput:
      "min-h-12 min-w-11 rounded-lg border border-white/15 bg-[#1A1A1A] text-base text-[#F5F5F5] focus:border-[#CCFF00] focus:ring-2 focus:ring-[#CCFF00]",
    identityPreview: "rounded-lg border border-white/10 bg-[#1A1A1A] px-3 py-2",
    identityPreviewText: "text-sm text-[#F5F5F5]",
    identityPreviewEditButton:
      "min-h-11 text-sm font-semibold text-[#CCFF00] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]",
    footer: "mt-0",
    footerAction: "text-sm text-[#C7C7C7]",
    footerActionLink:
      "min-h-11 text-sm font-semibold text-[#CCFF00] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]",
    alternativeMethodsBlockButton:
      "min-h-12 rounded-lg border border-white/15 bg-[#1A1A1A] text-sm font-semibold text-[#F5F5F5] hover:bg-[#242424] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]",
    backLink:
      "min-h-11 text-sm font-semibold text-[#CCFF00] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CCFF00]",
    captchaBox: "rounded-lg border border-white/15 bg-[#1A1A1A] p-2",
  },
} as const;
