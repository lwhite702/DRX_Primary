export const dynamic = "force-dynamic";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-foreground">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2 text-lg text-muted-foreground">
        This page could not be found.
      </p>
      <div className="mt-8">
        <Link href="/">
          <Button variant="default">Go back home</Button>
        </Link>
      </div>
    </div>
  );
}
