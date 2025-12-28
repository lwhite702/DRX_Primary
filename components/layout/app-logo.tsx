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
      <div className="relative h-8 w-8 shrink-0">
        <Image
          src="/DeelRx CRM.svg"
          alt="DeelRx CRM"
          fill
          className="object-contain opacity-90"
          priority
        />
      </div>
      <div className="min-w-0">
        <div className="text-base font-bold text-accent leading-none truncate">
          DRX CRM
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
