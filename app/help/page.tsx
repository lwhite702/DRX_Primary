"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  BarChart3,
  HelpCircle,
  BookOpen,
  Video,
} from "lucide-react";

export default function HelpPage() {
  return (
    <div className="p-4 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Help & Support</h1>
        <p className="text-muted-foreground mt-2">
          Everything you need to get started with DRX
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            Getting Started
          </CardTitle>
          <CardDescription>
            New to DRX? Start here to learn the basics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold">1. Set Up Your Business</h3>
            <p className="text-sm text-muted-foreground">
              Complete your business profile with name, address, and tax
              settings. This information will appear on receipts and reports.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">2. Add Inventory</h3>
            <p className="text-sm text-muted-foreground">
              Navigate to <strong>Inventory → Add Item</strong>. Enter product
              details, cost, and selling price. The system will generate a SKU
              automatically.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">3. Create Customer Profiles</h3>
            <p className="text-sm text-muted-foreground">
              Go to <strong>Customers → Add Customer</strong>. Enter their name
              and either phone or email (at least one is required). Last name
              and alias are optional.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold">4. Make Your First Sale</h3>
            <p className="text-sm text-muted-foreground">
              Open <strong>Sales</strong>, search for products, add to cart,
              select customer (or leave as walk-in), and complete checkout.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Core Workflows */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-accent" />
              Point of Sale
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Processing a Sale</h4>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Search for products using the search bar</li>
                <li>Click "Add" to add items to cart</li>
                <li>Adjust quantities using +/- buttons</li>
                <li>Select customer (optional)</li>
                <li>Choose payment method</li>
                <li>Click "Complete Checkout"</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Price Overrides</h4>
              <p className="text-muted-foreground">
                Admins and Managers can override prices by clicking the $ icon
                next to cart items. Provide a reason for audit tracking.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-accent" />
              Inventory Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Adding Inventory</h4>
              <p className="text-muted-foreground">
                Use <strong>Inventory Intake</strong> to record new stock. Enter
                total cost and weight—the system calculates cost-per-gram
                automatically.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Fractional Quantities</h4>
              <p className="text-muted-foreground">
                Products can be sold by weight (grams) or units. Weight-based
                items support fractional sales for precise inventory tracking.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-accent" />
              Customer Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Customer Requirements</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>First name (required)</li>
                <li>Last name (optional)</li>
                <li>Phone OR email (at least one required)</li>
                <li>Alias (optional)</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Credit Tracking</h4>
              <p className="text-muted-foreground">
                Set credit limits per customer. Track outstanding balances and
                payment history in the Credit section.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5 text-accent" />
              Payments
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <h4 className="font-semibold mb-1">Payment Methods</h4>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>
                  <strong>Cash:</strong> Immediate payment
                </li>
                <li>
                  <strong>Card:</strong> Credit/debit card
                </li>
                <li>
                  <strong>Credit:</strong> Charge to customer account
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Partial Payments</h4>
              <p className="text-muted-foreground">
                Accept partial payments on credit accounts. Track remaining
                balance in the customer's credit profile.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-accent" />
            Common Issues & Solutions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">
              Sale Failed: "Insufficient Stock"
            </h4>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Cause:</strong> You're trying to sell more than available
              inventory.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Solution:</strong> Check current stock in Inventory.
              Reduce quantity or add more stock via Inventory Intake.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Customer Creation Failed</h4>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Cause:</strong> Missing required fields (phone or email).
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Solution:</strong> Ensure at least one contact method
              (phone OR email) is provided. First name is also required.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Dashboard Shows Zero Sales</h4>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Cause:</strong> No sales recorded yet, or date filter is
              incorrect.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Solution:</strong> Check the date range filter. Make a
              test sale to verify the system is working.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Error During Checkout</h4>
            <p className="text-sm text-muted-foreground mb-2">
              <strong>Cause:</strong> Network issue or database error.
            </p>
            <p className="text-sm text-muted-foreground">
              <strong>Solution:</strong> Your cart is preserved. Check your
              internet connection and try again. If the problem persists, click
              "Report a Bug" in the navigation menu.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card className="bg-accent/10 border-accent/30">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>We're here to help you succeed</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            If you encounter any issues or have questions not covered here:
          </p>
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => {
                const feedback = (window as any).Sentry?.getFeedback?.();
                if (feedback) {
                  feedback.createWidget();
                }
              }}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Report an Issue or Ask a Question
            </Button>
            <Link href="/dashboard">
              <Button className="w-full bg-accent hover:bg-accent-dark text-black">
                <BarChart3 className="h-4 w-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
