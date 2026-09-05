"use client";

import { useEffect, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { openFeedbackWithFallback } from "@/lib/feedback";

interface FeedbackButtonProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  source?: string;
  placeholder?: string;
}

type SentryFeedback = {
  createForm: (options: {
    messagePlaceholder?: string;
    tags?: Record<string, string>;
  }) => Promise<{ appendToDom: () => void; open: () => void }>;
};

type SentryBrowserClient = {
  getFeedback?: () => SentryFeedback | null;
};

function getSentryFeedback(): SentryFeedback | null {
  if (typeof window === "undefined") {
    return null;
  }
  const sentry = (window as Window & { Sentry?: SentryBrowserClient }).Sentry;
  return sentry?.getFeedback?.() ?? null;
}

export function SentryFeedbackButton({
  children,
  asChild = false,
  className,
  source = "unknown",
  placeholder = "How can we improve your experience?",
}: FeedbackButtonProps) {
  const [feedback, setFeedback] = useState<SentryFeedback | null>(null);

  useEffect(() => {
    const fb = getSentryFeedback();
    setFeedback(fb);
  }, []);

  const handleClick = async () => {
    const currentFeedback = feedback ?? getSentryFeedback();
    await openFeedbackWithFallback(
      currentFeedback
        ? async () => {
          const form = await currentFeedback.createForm({
            messagePlaceholder: placeholder,
            tags: { "feedback.source": source },
          });
          form.appendToDom();
          form.open();
        }
        : null,
    );
  };

  const Comp = asChild ? Slot : "button";

  return (
    <Comp onClick={handleClick} className={className}>
      {children}
    </Comp>
  );
}
