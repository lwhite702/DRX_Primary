interface FaqItem {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

interface FaqAccordionProps {
  items: FaqItem[];
}

export function FaqAccordion({ items }: FaqAccordionProps) {
  return (
    <div className="flex flex-col w-full divide-y divide-border border-t border-border">
      {items.map((item) => (
        <details
          key={item.question}
          open={item.defaultOpen}
          className="group py-2.5 text-left transition-colors duration-150"
        >
          <summary className="flex min-h-[44px] py-2 cursor-pointer list-none items-center justify-between gap-4 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm [&::-webkit-details-marker]:hidden">
            <span className="text-[16px] font-normal leading-[24px] text-text-primary group-hover:text-white transition-colors">
              {item.question}
            </span>
            <span
              className="font-display text-[22px] font-semibold text-accent transition-transform duration-200 select-none shrink-0"
              aria-hidden="true"
            >
              <span className="group-open:hidden">+</span>
              <span className="hidden group-open:inline">−</span>
            </span>
          </summary>
          <div className="pt-2 text-[14px] font-normal leading-[20px] text-muted-foreground">
            {item.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
