import { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { HelpTopicId } from "@/lib/help/support-center";
import { HelpSectionNav } from "./help-section-nav";
import { HelpSupportSidebar } from "./help-support-sidebar";

type HelpPageShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  topic?: HelpTopicId;
  badge?: string;
};

export function HelpPageShell({
  title,
  description,
  children,
  topic,
  badge = "Help & Support",
}: HelpPageShellProps) {
  return (
    <div className="mx-auto w-full max-w-7xl p-4 md:p-8 space-y-6">
      <HelpSectionNav />

      <Card className="border-white/10 bg-gradient-to-br from-background via-background to-accent/5">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-accent/40 text-accent">
              Operator Guide
            </Badge>
            <Badge variant="outline" className="border-white/10 text-muted-foreground">
              {badge}
            </Badge>
          </div>
          <CardTitle className="text-2xl md:text-3xl tracking-tight">{title}</CardTitle>
          <CardDescription className="max-w-3xl text-sm md:text-base">
            {description}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">{children}</div>
        <div className="space-y-6 lg:col-span-4">
          <HelpSupportSidebar topic={topic} />
        </div>
      </div>
    </div>
  );
}
