import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { HelpChecklistItem } from "@/lib/help/support-center";

type HelpChecklistCardProps = {
  title: string;
  description: string;
  items: HelpChecklistItem[];
};

export function HelpChecklistCard({
  title,
  description,
  items,
}: HelpChecklistCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {items.map((item, index) => (
          <div
            key={`${item.title}-${index}`}
            className="rounded-xl border border-white/10 bg-muted/20 p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-3">
              <Badge className="h-6 min-w-6 justify-center px-2">{index + 1}</Badge>
              {item.route ? (
                <Link
                  href={item.route}
                  className="text-xs font-medium text-accent hover:underline"
                >
                  {item.route}
                </Link>
              ) : null}
            </div>
            <h3 className="font-semibold leading-snug">{item.title}</h3>
            <p className="text-sm text-muted-foreground">{item.summary}</p>
            {item.details ? (
              <details className="rounded-md border border-white/10 bg-background/40 p-2.5 text-sm text-muted-foreground">
                <summary className="cursor-pointer select-none text-foreground font-medium">
                  Why this matters
                </summary>
                <p className="mt-2">{item.details}</p>
              </details>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
