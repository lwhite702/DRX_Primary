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
import { docsHubUrl } from "@/lib/docs-links";
import { drxContent } from "@deelrx/content";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
};

export const primaryNav: NavItem[] = [
  {
    href: "/dashboard",
    label: drxContent.navigation.home,
    icon: LayoutDashboard,
  },
  { href: "/sales", label: drxContent.navigation.sales, icon: ShoppingCart },
  { href: "/pos/sale", label: drxContent.navigation.newSale, icon: ScanLine },
  { href: "/deliveries", label: drxContent.navigation.deliveries, icon: Truck },
  { href: "/inventory", label: drxContent.navigation.products, icon: Package },
  { href: "/customers", label: drxContent.navigation.customers, icon: Users },
  { href: "/credit", label: drxContent.navigation.payments, icon: Wallet },
  { href: "/insights", label: drxContent.navigation.trends, icon: LineChart },
  { href: "/reports", label: drxContent.navigation.reports, icon: BarChart2 },
  {
    href: docsHubUrl,
    label: drxContent.navigation.help,
    icon: HelpCircle,
    external: true,
  },
  { href: "/settings", label: drxContent.navigation.settings, icon: Settings },
];
