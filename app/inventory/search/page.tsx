import { SearchView } from "@/components/inventory/search-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Search | Inventory",
  description: "Quickly lookup inventory items.",
};

export default function ProductSearchPage() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <SearchView />
    </div>
  );
}
