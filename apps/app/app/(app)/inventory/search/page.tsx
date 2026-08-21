import { SearchView } from "@/components/inventory/search-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Product Search | Inventory",
  description: "Quickly lookup inventory items.",
};

export default function ProductSearchPage() {
  return <SearchView />;
}
