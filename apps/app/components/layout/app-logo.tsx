import Image from "next/image";
import Link from "next/link";

export function AppLogo({
  href = "/pos/sale",
  showTagline = false,
  size = "default",
}: {
  href?: string;
  showTagline?: boolean;
  size?: "default" | "sidebar";
}) {
  const isSidebar = size === "sidebar";

  return (
    <Link
      href={href}
      className={
        "flex min-w-0 items-center gap-3 " + (isSidebar ? "w-full" : "")
      }
      aria-label="Deelrx CRM Home"
    >
      <div
        className={
          "relative shrink-0 " +
          (isSidebar ? "h-[72px] w-[216px]" : "h-8 w-[120px]")
        }
      >
        <Image
          src="/brand/drx-wordmark.svg"
          alt="Deelrx CRM"
          fill
          className="object-contain"
          priority
        />
      </div>
      <div className="min-w-0 sr-only">
        <div className="text-base font-bold text-accent leading-none truncate">
          Deelrx CRM
        </div>
        {showTagline && (
          <div className="text-[11px] text-muted-foreground truncate mt-1">
            Deelrx Point of Sale
          </div>
        )}
      </div>
    </Link>
  );
}
