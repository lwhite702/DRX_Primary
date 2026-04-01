"use client";

import Link, { type LinkProps } from "next/link";
import { trackMarketingEvent, type MarketingEventName } from "@/lib/analytics";

interface TrackedLinkProps extends LinkProps {
  children: React.ReactNode;
  className?: string;
  eventName: MarketingEventName;
  payload?: Record<string, unknown>;
}

export function TrackedLink({
  children,
  eventName,
  payload,
  className,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      className={className}
      onClick={() => trackMarketingEvent(eventName, payload || {})}
    >
      {children}
    </Link>
  );
}
