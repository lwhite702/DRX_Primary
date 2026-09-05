import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-11 w-full min-w-0 rounded-lg border border-white/20 bg-[#1E1E1E] px-3.5 py-2 text-base text-white shadow-xs transition-[color,box-shadow,border-color,background-color] outline-none caret-[#CCFF00] hover:border-white/35 focus:border-accent focus:bg-[#242424] focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-[#121212] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Input }
