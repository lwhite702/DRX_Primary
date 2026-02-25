"use client";

import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CreditCard,
  HelpCircle,
  Package,
  Receipt,
  ShoppingCart,
  Users,
  Wrench,
} from "lucide-react";

import { SentryFeedbackButton } from "@/components/sentry-feedback-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const quickStartSteps = [
  {
    step: "1",
    title: "Create or confirm your business profile",
    route: "/onboarding",
    note: "Business details drive receipts, roles, and reporting context.",
  },
  {
    step: "2",
    title: "Load inventory before ringing sales",
    route: "/inventory/intake",
    note: "Use Intake for stock additions so quantities and cost history stay accurate.",
  },
  {
    step: "3",
    title: "Add customers only when needed",
    route: "/customers",
    note: "Walk-in sales can proceed without a profile. Credit sales require a customer record.",
  },
  {
    step: "4",
    title: "Use Quick Sale for fast checkout",
    route: "/pos/sale",
    note: "Fast path: search/scan → tender → receipt → next sale.",
  },
];

const workflows = [
  {
    key: "pos",
    label: "Quick Sale",
    icon: ShoppingCart,
    route: "/pos/sale",
    summary: "Fastest path for ringing a sale with minimal setup.",
    fastPath: [
      "Open Quick Sale and scan/search product",
      "Add item(s) to cart and confirm quantity",
      "Choose tender type on payment screen",
      "Confirm receipt option and complete sale",
    ],
    watchFor: [
      "Insufficient stock blocks checkout",
      "Credit tender requires customer + credit eligibility",
      "If checkout errors, retry before rebuilding cart",
    ],
  },
  {
    key: "inventory",
    label: "Inventory",
    icon: Package,
    route: "/inventory",
    summary: "Manage stock levels, intake, and adjustments with audit trail coverage.",
    fastPath: [
      "Use Inventory Intake to add new stock",
      "Use Adjust for shrinkage/corrections",
      "Review low-stock items before shift close",
      "Verify SKU and pricing before publishing changes",
    ],
    watchFor: [
      "Manual edits outside intake/adjust can create reconciliation gaps",
      "Low stock warnings are threshold-driven, not sales velocity-driven",
      "Duplicate SKUs per business are blocked",
    ],
  },
  {
    key: "customers",
    label: "Customers",
    icon: Users,
    route: "/customers",
    summary: "Profiles, lookup, and credit support for repeat buyers.",
    fastPath: [
      "Create customer with first name + phone or email",
      "Add alias/notes only when operationally useful",
      "Confirm profile before attaching credit activity",
      "Use customer history for payment follow-up",
    ],
    watchFor: [
      "Missing contact method causes create failures",
      "Credit and cash activity may appear in different views",
      "Use consistent phone formatting for lookup reliability",
    ],
  },
  {
    key: "payments",
    label: "Payments & Credit",
    icon: CreditCard,
    route: "/credit",
    summary: "Cash/card/credit tender handling and balance tracking.",
    fastPath: [
      "Select tender method in checkout",
      "Use credit only for approved customer accounts",
      "Record payment activity against outstanding balances",
      "Review credit exposure from reports/dashboard",
    ],
    watchFor: [
      "Credit payment without customer context will fail",
      "Partial payments require follow-up balance checks",
      "Reversals/voids should be role-restricted",
    ],
  },
  {
    key: "reports",
    label: "Reports",
    icon: BarChart3,
    route: "/reports",
    summary: "Shift/day visibility for sales, top products, and low stock.",
    fastPath: [
      "Check dashboard for today + week sales baseline",
      "Review top products and low-stock list",
      "Validate business context before comparing totals",
      "Use date filters when totals look unexpected",
    ],
    watchFor: [
      "Zero totals usually mean no sales or wrong business/date scope",
      "Low-stock list follows reorder thresholds",
      "Recent transactions may lag if a checkout failed",
    ],
  },
] as const;

const troubleshooting = [
  {
    title: "Checkout blocked: insufficient stock",
    severity: "Operational",
    icon: AlertTriangle,
    checks: [
      "Confirm on-hand quantity in Inventory",
      "Reduce line quantity or remove item",
      "If stock should exist, record intake/adjustment first",
    ],
    recovery:
      "Do not force the sale through with manual notes. Fix stock first so reports and inventory stay aligned.",
  },
  {
    title: "Customer create/update fails",
    severity: "Data entry",
    icon: Users,
    checks: [
      "Ensure first name is present",
      "Provide phone OR email (one is required)",
      "Check duplicate formatting (especially phone)",
    ],
    recovery:
      "Retry with the minimum required fields, then add extra details after the record exists.",
  },
  {
    title: "Dashboard/report totals look wrong",
    severity: "Reporting",
    icon: BarChart3,
    checks: [
      "Verify active business/workspace",
      "Check date range / filter scope",
      "Confirm checkout actually completed (receipt/confirmation state)",
    ],
    recovery:
      "Use Sales history or recent activity to confirm transactions before escalating as a reporting bug.",
  },
  {
    title: "Error during checkout or save",
    severity: "High",
    icon: Wrench,
    checks: [
      "Retry once before refreshing the page",
      "Check if the sale already completed (avoid duplicate charge)",
      "Capture the exact step + tender + product involved",
    ],
    recovery:
      "Report via the in-app bug button with the route, action taken, and whether a receipt/sale ID appeared.",
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8 space-y-6">
      <Card className="border-white/10 bg-gradient-to-br from-background via-background to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-accent/40 text-accent">
              Operator Guide
            </Badge>
            <Badge variant="outline" className="border-white/10 text-muted-foreground">
              Help & Support
            </Badge>
          </div>
          <CardTitle className="text-2xl md:text-3xl tracking-tight">
            Support Center
          </CardTitle>
          <CardDescription className="max-w-3xl text-sm md:text-base">
            Use this page to unblock shift operations quickly: start with the task tabs,
            then use troubleshooting and escalation if something breaks.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Link href="/pos/sale">
            <Button className="w-full justify-start bg-accent hover:bg-accent/90 text-black">
              <Receipt className="mr-2 h-4 w-4" />
              Open Quick Sale
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full justify-start">
              <BarChart3 className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
          <SentryFeedbackButton
            asChild
            source="help_page"
            placeholder="What happened, where did it happen, and what did you expect?"
          >
            <Button variant="outline" className="w-full justify-start">
              <HelpCircle className="mr-2 h-4 w-4" />
              Report Issue / Ask Support
            </Button>
          </SentryFeedbackButton>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-accent" />
                Start Here (New Store / New Operator)
              </CardTitle>
              <CardDescription>
                Follow this order to avoid setup loops and bad data.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {quickStartSteps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Badge className="h-6 min-w-6 justify-center px-2">{item.step}</Badge>
                    <Link
                      href={item.route}
                      className="text-xs font-medium text-accent hover:underline"
                    >
                      {item.route}
                    </Link>
                  </div>
                  <h3 className="font-semibold leading-snug">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-accent" />
                Task-Based Guides
              </CardTitle>
              <CardDescription>
                Pick the workflow you are trying to complete right now.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="pos" className="gap-4">
                <TabsList className="w-full h-auto flex-wrap justify-start">
                  {workflows.map((workflow) => {
                    const Icon = workflow.icon;
                    return (
                      <TabsTrigger
                        key={workflow.key}
                        value={workflow.key}
                        className="flex-none px-3 py-2"
                      >
                        <Icon className="h-4 w-4" />
                        {workflow.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {workflows.map((workflow) => {
                  const Icon = workflow.icon;
                  return (
                    <TabsContent key={workflow.key} value={workflow.key}>
                      <div className="rounded-xl border border-white/10 p-4 md:p-5 space-y-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-accent" />
                              <h3 className="font-semibold">{workflow.label}</h3>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {workflow.summary}
                            </p>
                          </div>
                          <Link
                            href={workflow.route}
                            className="text-sm font-medium text-accent hover:underline"
                          >
                            Open {workflow.label}
                          </Link>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-lg border border-white/10 bg-muted/20 p-4">
                            <div className="mb-2 text-sm font-semibold">Fast Path</div>
                            <ol className="space-y-2 text-sm text-muted-foreground list-decimal pl-5">
                              {workflow.fastPath.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ol>
                          </div>

                          <div className="rounded-lg border border-white/10 bg-muted/20 p-4">
                            <div className="mb-2 text-sm font-semibold">Watch For</div>
                            <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                              {workflow.watchFor.map((item) => (
                                <li key={item}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  );
                })}
              </Tabs>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5 text-accent" />
                Troubleshooting (Common Problems)
              </CardTitle>
              <CardDescription>
                Start with the checks below before escalating. This reduces duplicate issues and speeds fixes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {troubleshooting.map((issue) => {
                const Icon = issue.icon;
                return (
                  <div
                    key={issue.title}
                    className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-accent" />
                        <h3 className="font-semibold">{issue.title}</h3>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {issue.severity}
                      </Badge>
                    </div>
                    <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                      {issue.checks.map((check) => (
                        <li key={check}>{check}</li>
                      ))}
                    </ul>
                    <div className="rounded-md border border-accent/20 bg-accent/5 px-3 py-2 text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">Recovery:</span>{" "}
                      {issue.recovery}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:col-span-4">
          <Card className="lg:sticky lg:top-4 border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle>Need Help Right Now?</CardTitle>
              <CardDescription>
                Fastest way to get support without slowing down a shift.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Support Actions
                </div>
                <div className="grid gap-2">
                  <SentryFeedbackButton
                    asChild
                    source="help_page_triage"
                    placeholder="Route, action, expected result, actual result, and whether a sale/receipt was created."
                  >
                    <Button className="w-full justify-start bg-accent hover:bg-accent/90 text-black">
                      <HelpCircle className="mr-2 h-4 w-4" />
                      Report Issue / Ask Question
                    </Button>
                  </SentryFeedbackButton>
                  <Link href="/sales">
                    <Button variant="outline" className="w-full justify-start">
                      <Receipt className="mr-2 h-4 w-4" />
                      Check Recent Sales
                    </Button>
                  </Link>
                  <Link href="/inventory">
                    <Button variant="outline" className="w-full justify-start">
                      <Package className="mr-2 h-4 w-4" />
                      Verify Inventory
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Include In Your Report
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                  <li>Page/route where it happened (example: `/pos/payment`)</li>
                  <li>What you clicked or submitted right before the error</li>
                  <li>Whether a sale ID, receipt, or confirmation appeared</li>
                  <li>Business/workspace you were in</li>
                  <li>Screenshot if the UI looks wrong</li>
                </ul>
              </div>

              <div className="rounded-lg border border-white/10 bg-background/60 p-3 text-xs text-muted-foreground">
                Checkout issues can be retried. Before retrying, verify whether the sale already completed to avoid duplicate processing.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
