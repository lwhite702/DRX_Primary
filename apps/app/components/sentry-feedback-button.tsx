"use client";

import { useEffect, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { openFeedbackWithFallback } from "@/lib/feedback";
import {
  getSentryFeedbackClient,
  openSentryFeedbackDialog,
  type SentryFeedbackClient,
} from "@/lib/sentry/feedback";

interface FeedbackButtonProps {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
  source?: string;
  placeholder?: string;
}

export function SentryFeedbackButton({
  children,
  asChild = false,
  className,
  source = "unknown",
  placeholder = "How can we improve your experience?",
}: FeedbackButtonProps) {
  const [feedback, setFeedback] = useState<SentryFeedbackClient | null>(null);

  useEffect(() => {
    setFeedback(getSentryFeedbackClient());
  }, []);

  const handleClick = async () => {
    const currentFeedback = feedback ?? getSentryFeedbackClient();
    await openFeedbackWithFallback(
      currentFeedback
        ? async () => {
            await openSentryFeedbackDialog({
              messagePlaceholder: placeholder,
              source,
            });
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
