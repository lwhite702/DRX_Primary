import {
  LayoutDashboard,
  ShoppingCart,
  Truck,
  ScanLine,
  Package,
  Users,
  Wallet,
  LineChart,
  BarChart2,
  Settings,
  HelpCircle,
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
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/pos/sale", label: "Quick Sale", icon: ScanLine },
  { href: "/deliveries", label: "Deliveries", icon: Truck },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/credit", label: "Store Credit", icon: Wallet },
  { href: "/insights", label: "Insights", icon: LineChart },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: featurebaseHelpdeskUrl, label: "Help", icon: HelpCircle, external: true },
  { href: "/settings", label: "Settings", icon: Settings },
];
