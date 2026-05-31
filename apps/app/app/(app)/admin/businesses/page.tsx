import { BusinessesClient } from "./_components/BusinessesClient";

export const revalidate = 60;

export default function AdminBusinessesPage() {
  return <BusinessesClient />;
}
