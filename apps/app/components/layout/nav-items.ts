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
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const primaryNav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/credit", label: "Credit", icon: CreditCard },
  { href: "/insights", label: "Event Desk Board", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/help", label: "Help", icon: HelpCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];
