import { SearchView } from "@/components/inventory/search-view";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Find a Product | DRX",
  description: "Find a product by name, code, or barcode.",
};

export default function ProductSearchPage() {
  return <SearchView />;
}
