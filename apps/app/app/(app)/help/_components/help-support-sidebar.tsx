import Link from "next/link";
import { HelpCircle, Package, Receipt, ScanLine } from "lucide-react";

import { SentryFeedbackButton } from "@/components/sentry-feedback-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DEFAULT_HELP_TOPIC,
  HelpTopicId,
  buildHelpLibraryHref,
} from "@/lib/help/support-center";

type HelpSupportSidebarProps = {
  topic?: HelpTopicId;
};

export function HelpSupportSidebar({ topic = DEFAULT_HELP_TOPIC }: HelpSupportSidebarProps) {
  return (
    <Card className="lg:sticky lg:top-4 border-accent/20 bg-accent/5">
      <CardHeader>
        <CardTitle className="text-base">Need Help Right Now?</CardTitle>
        <CardDescription>
          Use this triage flow to avoid duplicate sales or data drift.
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
              source={`help_${topic}`}
              placeholder="Route, action, expected result, actual result, and whether a sale/receipt was created."
            >
              <Button className="w-full justify-start bg-accent hover:bg-accent/90 text-black">
                <HelpCircle className="mr-2 h-4 w-4" />
                Report Issue / Ask Question
              </Button>
            </SentryFeedbackButton>

            <Link href={buildHelpLibraryHref(topic)}>
              <Button variant="outline" className="w-full justify-start">
                <Receipt className="mr-2 h-4 w-4" />
                Read Full Docs
              </Button>
            </Link>

            <Link href="/pos/sale">
              <Button variant="outline" className="w-full justify-start">
                <ScanLine className="mr-2 h-4 w-4" />
                Open Quick Sale
              </Button>
            </Link>

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
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              Include in report
            </Badge>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
            <li>Page/route where issue happened (example: `/pos/payment`).</li>
            <li>Action right before failure.</li>
            <li>Whether sale ID, receipt, or confirmation appeared.</li>
            <li>Active business/workspace context.</li>
            <li>Screenshot if UI state is unexpected.</li>
          </ul>
        </div>

        <div className="rounded-lg border border-white/10 bg-background/60 p-3 text-xs text-muted-foreground">
          Before retrying checkout, confirm whether the sale already completed.
        </div>
      </CardContent>
    </Card>
  );
}
