"use client";

import * as React from "react";

type ButtonVariant = "default" | "outline";
type ButtonSize = "default" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

function classes(...tokens: Array<string | false | null | undefined>) {
  return tokens.filter(Boolean).join(" ");
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={classes(
          "drx-button-motion inline-flex items-center justify-center whitespace-nowrap rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:pointer-events-none disabled:opacity-50",
          variant === "default" && "bg-white text-black hover:bg-white/90",
          variant === "outline" && "border border-white/20 bg-transparent text-white hover:bg-white/5",
          size === "default" && "h-10 px-4 py-2 text-sm",
          size === "lg" && "h-11 px-8 text-base",
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
