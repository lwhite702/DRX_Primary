"use client";

import { useEffect, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { toast } from "sonner";

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
    try {
      if (!feedback) {
        console.warn("Feedback integration not found");
        const fb = getSentryFeedback();
        if (fb) {
          const form = await fb.createForm({
            messagePlaceholder: placeholder,
            tags: { "feedback.source": source },
          });
          form.appendToDom();
          form.open();
          return;
        }
        toast.error("Feedback system unavailable");
        return;
      }

      const form = await feedback.createForm({
        messagePlaceholder: placeholder,
        tags: { "feedback.source": source },
      });
      form.appendToDom();
      form.open();
    } catch (error) {
      console.error("Error opening feedback form:", error);
      toast.error("Failed to open feedback form");
    }
  };

  const Comp = asChild ? Slot : "button";

  return (
    <Comp onClick={handleClick} className={className}>
      {children}
    </Comp>
  );
}
