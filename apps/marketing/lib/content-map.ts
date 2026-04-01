export type PageType =
  | "home"
  | "product_hub"
  | "product_detail"
  | "use_case_hub"
  | "use_case_detail"
  | "resource_hub"
  | "guide"
  | "beta"
  | "legal_hub"
  | "legal_doc"
  | "waitlist";

export interface ContentPage {
  slug: string;
  pageType: PageType;
  title: string;
  metaTitle: string;
  metaDescription: string;
  audience: "owner_operator" | "manager" | "multi_role";
  primaryCTA: { label: string; href: string };
  secondaryCTA?: { label: string; href: string };
  proofPoints: string[];
  limitations?: string[];
  relatedPages: string[];
  seoCluster: string;
}
