import { notFound } from "next/navigation";

// Do not redirect old bookmarks: that would disclose the platform entry URL.
export default function RetiredAdminPage() { notFound(); }
