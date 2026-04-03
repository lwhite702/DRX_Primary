import {
  BarChart3,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  TrendingUp,
  FileText,
  Settings,
  HelpCircle,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import { featurebaseHelpdeskUrl } from "@/lib/featurebase-links";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/pos/sale", label: "Quick Sale", icon: ScanLine },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/credit", label: "Credit", icon: CreditCard },
  { href: "/insights", label: "Operations Insights", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: featurebaseHelpdeskUrl, label: "Help", icon: HelpCircle, external: true },
  { href: "/settings", label: "Settings", icon: Settings },
];
