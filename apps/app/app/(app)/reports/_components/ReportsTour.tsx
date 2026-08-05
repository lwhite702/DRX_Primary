"use client";

import { Tour } from "@/components/ui/tour";

export function ReportsTour() {
  return (
    <Tour
      tourId="reports_v1"
      onComplete={() => {}}
      steps={[
        {
          targetId: "tour-reports-stats",
          title: "Your numbers.",
          description:
            "Today's sales, COGS, and gross profit at a glance. Check this first.",
        },
        {
          targetId: "tour-reports-margin",
          title: "Margin by sale.",
          description:
            "See how much you cleared on each transaction. Spot thin deals fast.",
        },
        {
          targetId: "tour-reports-lowstock",
          title: "Low stock alert.",
          description:
            "Products at or below reorder level show up here. Reup before you run out.",
        },
      ]}
    />
  );
}
