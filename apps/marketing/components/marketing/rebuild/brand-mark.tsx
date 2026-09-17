import Image from "next/image";
import Link from "next/link";

interface BrandMarkProps {
  variant?: "wordmark" | "mark";
  className?: string;
  href?: string;
  priority?: boolean;
}

export function BrandMark({
  variant = "wordmark",
  className = "",
  href = "/",
  priority = false,
}: BrandMarkProps) {
  const content =
    variant === "mark" ? (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className || "size-8"}`}
        aria-label="DRX"
      >
        <Image
          src="/brand/drx-mark.svg"
          alt="DRX"
          width={32}
          height={32}
          className="size-full object-contain"
          priority={priority}
        />
      </span>
    ) : (
      <span
        className={`inline-flex items-center justify-center shrink-0 ${className || "h-[25px] w-[60px]"}`}
        aria-label="Deelrx CRM (DRX)"
      >
        <Image
          src="/brand/drx-wordmark.svg"
          alt="Deelrx CRM (DRX)"
          width={60}
          height={25}
          className="h-full w-auto object-contain"
          priority={priority}
        />
      </span>
    );

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm"
      >
        {content}
      </Link>
    );
  }

  return content;
}
