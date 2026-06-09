export const drxClerkAuthAppearance = {
  variables: {
    colorPrimary: "#ccff00",
    colorText: "#FFFFFF",
    colorTextSecondary: "#A1A1AA",
    colorBackground: "transparent",
    colorInputBackground: "rgba(0,0,0,0.5)",
    colorInputText: "#FFFFFF",
    colorDanger: "#F87171",
    borderRadius: "10px",
    fontFamily: "var(--font-plus-jakarta-sans), var(--font-inter), sans-serif",
    fontFamilyButtons: "var(--font-plus-jakarta-sans), var(--font-inter), sans-serif",
  },
  layout: {
    socialButtonsPlacement: "bottom",
    showOptionalFields: false,
    socialButtonsVariant: "iconButton",
  },
  elements: {
    rootBox: "w-full",
    cardBox:
      "w-full shadow-none border-none bg-transparent backdrop-blur-none p-6 pt-2 pb-8",
    card: "bg-transparent shadow-none border-none p-0",
    header: "hidden",
    footer: "hidden",
    dividerLine: "bg-white/5",
    dividerText:
      "text-muted-foreground text-[10px] uppercase tracking-widest font-mono",
    formFieldLabel:
      "text-muted-foreground text-[10px] uppercase tracking-wider font-mono mb-1.5",
    formFieldInput:
      "bg-black/50 border border-white/10 text-white rounded-md focus:ring-primary/50 focus:border-primary/50 h-10 font-mono text-sm placeholder:text-white/20",
    formFieldInputShowPasswordButton:
      "text-white/60 hover:text-primary transition-colors",
    formFieldErrorText: "text-[10px] font-mono text-red-400 mt-1",
    formFieldSuccessText: "text-[10px] font-mono text-[#4ADE80] mt-1",
    alert:
      "bg-red-500/10 border border-red-500/20 text-red-100 rounded-md px-3 py-2",
    alertText: "text-[10px] font-mono leading-relaxed",
    formButtonPrimary:
      "bg-primary text-black hover:bg-primary/90 h-11 rounded-md font-bold tracking-wide uppercase transition-all shadow-[0_0_20px_rgba(204,255,0,0.1)] hover:shadow-[0_0_30px_rgba(204,255,0,0.2)] disabled:opacity-60",
    socialButtonsBlockButton:
      "bg-white/5 border border-white/10 text-white hover:bg-white/10 h-10 rounded-md transition-colors",
    socialButtonsBlockButtonText:
      "text-xs font-mono uppercase tracking-wide text-white",
    formResendCodeLink: "text-primary hover:text-primary/90 font-mono text-xs",
    otpCodeFieldInput:
      "bg-black/50 border border-white/10 text-white rounded-md focus:ring-primary/50 focus:border-primary/50 font-mono",
    identityPreviewText: "text-white text-xs font-mono",
    identityPreviewEditButton:
      "text-primary hover:text-primary/90 font-mono text-xs",
    footerActionLink: "text-primary hover:text-primary/90 font-mono text-xs",
    alternativeMethodsBlockButton:
      "bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded-md transition-colors",
  },
} as const;

