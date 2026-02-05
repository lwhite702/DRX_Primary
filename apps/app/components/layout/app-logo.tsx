import Image from "next/image";
import Link from "next/link";

export function AppLogo({
  href = "/dashboard",
  showTagline = false,
}: {
  href?: string;
  showTagline?: boolean;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 min-w-0"
      aria-label="DRX CRM Home"
    >
      <div className="relative h-8 w-[120px] shrink-0">
        <Image
          src="/brand/DRX Wordmark Color.svg"
          alt="DeelRx CRM"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="min-w-0 sr-only">
        <div className="text-base font-bold text-accent leading-none truncate">
          DeelRx CRM
        </div>
        {showTagline && (
          <div className="text-[11px] text-muted-foreground truncate mt-1">
            DeelRx Point of Sale
          </div>
        )}
      </div>
    </Link>
  );
}
