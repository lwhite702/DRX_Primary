import Image from "next/image";
import Link from "next/link";

export function AppLogo({
  href = "/dashboard",
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
      aria-label="DRX — Home"
    >
      {isSidebar ? (
        /* Sidebar: mark icon + wordmark side by side */
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0 h-8 w-8 rounded-md overflow-hidden">
            <Image
              src="/brand/drx-mark-primary.png"
              alt=""
              fill
              className="object-contain"
              priority
            />
          </div>
          <div className="relative shrink-0 h-7 w-[110px]">
            <Image
              src="/brand/DRX Wordmark Color Tight.svg"
              alt="DRX"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </div>
      ) : (
        /* Top nav / default: wordmark only */
        <div className="relative shrink-0 h-8 w-[110px]">
          <Image
            src="/brand/DRX Wordmark Color.svg"
            alt="DRX"
            fill
            className="object-contain object-left"
            priority
          />
        </div>
      )}

      <div className="min-w-0 sr-only">
        <div className="text-base font-bold text-accent leading-none truncate">
          Deelrx CRM
        </div>
        {showTagline && (
          <div className="text-[11px] text-muted-foreground truncate mt-1">
            Your front. Your numbers. Locked.
          </div>
        )}
      </div>
    </Link>
  );
}
