"use client";

import React, { useState } from "react";
import { InteractiveMenu } from "@/components/ui/modern-mobile-menu";
import { Home, Search, ShoppingCart, User, Plus } from "lucide-react";

export default function MobileMenuDemo() {
  const [activeTab, setActiveTab] = useState("demo");

  const menuItems = [
    { label: "Home", icon: Home },
    { label: "Search", icon: Search },
    { label: "Cart", icon: ShoppingCart },
    { label: "Profile", icon: User },
  ];

  const centerAction = {
    icon: Plus,
    label: "Add Item",
  };

  const handleCenterClick = () => {
    console.log("Center FAB clicked!");
    alert("Center action triggered!");
  };

  const handleItemClick = (index: number, item: any) => {
    console.log("Navigation item clicked:", index, item);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">Mobile Menu Demo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modern bottom navigation with elevated FAB
          </p>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8 pb-32">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Design Showcase */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Design Features</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 rounded-lg border border-border bg-card">
                <h3 className="font-medium mb-2">Elevated FAB</h3>
                <p className="text-sm text-muted-foreground">
                  Center floating action button with gradient background and
                  elevation shadow
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <h3 className="font-medium mb-2">Glassmorphism</h3>
                <p className="text-sm text-muted-foreground">
                  Rounded pill container with backdrop blur and subtle border
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <h3 className="font-medium mb-2">Split Navigation</h3>
                <p className="text-sm text-muted-foreground">
                  4 navigation items evenly distributed (2 left, 2 right)
                </p>
              </div>
              <div className="p-4 rounded-lg border border-border bg-card">
                <h3 className="font-medium mb-2">Smooth Transitions</h3>
                <p className="text-sm text-muted-foreground">
                  150ms ease-out transitions for all state changes
                </p>
              </div>
            </div>
          </section>

          {/* Usage Example */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Usage Example</h2>
            <div className="p-4 rounded-lg border border-border bg-card">
              <pre className="text-sm overflow-x-auto">
                <code>{`import { InteractiveMenu } from "@/components/ui/modern-mobile-menu";
import { Home, Search, ShoppingCart, User, Plus } from "lucide-react";

const menuItems = [
  { label: "Home", icon: Home },
  { label: "Search", icon: Search },
  { label: "Cart", icon: ShoppingCart },
  { label: "Profile", icon: User },
];

const centerAction = {
  icon: Plus,
  label: "Add Item",
};

<InteractiveMenu
  items={menuItems}
  centerAction={centerAction}
  onCenterClick={() => console.log("Center clicked!")}
  onItemClick={(index, item) => console.log(index, item)}
  accentColor="#22c55e"
/>`}</code>
              </pre>
            </div>
          </section>

          {/* Placeholder Content */}
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Scroll to Test</h2>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="p-6 rounded-lg border border-border bg-card"
              >
                <h3 className="font-medium mb-2">Content Block {i + 1}</h3>
                <p className="text-sm text-muted-foreground">
                  Scroll down to see the mobile menu fixed at the bottom of the
                  viewport. The menu stays in place while you scroll through
                  content.
                </p>
              </div>
            ))}
          </section>
        </div>
      </main>

      {/* Mobile Menu */}
      <InteractiveMenu
        items={menuItems}
        centerAction={centerAction}
        onCenterClick={handleCenterClick}
        onItemClick={handleItemClick}
        accentColor="#22c55e"
      />
    </div>
  );
}
