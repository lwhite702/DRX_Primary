"use client"

import { User, Bell, Search } from 'lucide-react'

export function TopNav() {
  return (
    <header className="h-16 bg-muted border-b border-border flex items-center justify-between px-6">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-accent focus:text-background focus:p-2 focus:rounded focus:z-50">
        Skip to main content
      </a>
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            aria-label="Search DRX CRM"
            className="w-full pl-10 pr-4 py-2 bg-input border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          className="p-2 hover:bg-border rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-foreground" />
        </button>
        <button 
          className="p-2 hover:bg-border rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          aria-label="User menu"
        >
          <User className="w-5 h-5 text-foreground" />
        </button>
      </div>
    </header>
  )
}
