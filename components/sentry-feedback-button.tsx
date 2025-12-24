"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect, useState } from "react";
import { Slot } from "@radix-ui/react-slot";
import { toast } from "sonner";

interface SentryFeedbackButtonProps {
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
}: SentryFeedbackButtonProps) {
  const [feedback, setFeedback] = useState<any>(null);

  useEffect(() => {
    // Sentry.getFeedback() might be null if not initialized or if integration is missing
    const fb = Sentry.getFeedback();
    setFeedback(fb);
  }, []);

  const handleClick = async () => {
    try {
      if (!feedback) {
        console.warn("Sentry Feedback integration not found");
        // Lazy load attempt
        const fb = Sentry.getFeedback();
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
