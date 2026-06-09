import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { GlobalErrorBoundary } from "@/components/ui/global-error-boundary";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { FeaturebaseProvider } from "@/components/providers/featurebase-provider";
import { ClerkProvider } from "@/lib/adapters/auth/ui";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta-sans",
});
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-inter",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app",
  ),
  alternates: {
    canonical: "/",
  },
  title:
    process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true"
      ? "[BYPASS] Deelrx - Run real transactions. Without the mess."
      : "Deelrx - Run real transactions. Without the mess.",
  description:
    "Deelrx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
  icons: {
    icon: "/brand/favicon-32.png",

    apple: "/brand/apple-touch-icon-180.png",
  },
  openGraph: {
    title: "Deelrx - Run real transactions. Without the mess.",
    description:
      "Deelrx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
    type: "website",
    locale: "en_US",
    url: "/",
    images: ["/brand/opengraph-image.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Deelrx - Run real transactions. Without the mess.",
    description:
      "Deelrx is a privacy-first CRM and POS built for cash-heavy, inventory-sensitive businesses that don't operate on neat timelines.",
    images: ["/brand/opengraph-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shouldEnableMeticulous =
    process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const meticulousToken = process.env.NEXT_PUBLIC_METICULOUS_TOKEN;
  const canLoadMeticulous = shouldEnableMeticulous && Boolean(meticulousToken);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function ensureVersions(val) {
                  if (!val || typeof val !== 'object') {
                    return { versions: { node: '18.0.0' } };
                  }
                  
                  try {
                    if (val.versions && typeof val.versions === 'object' && val.versions.node) {
                      return val;
                    }
                  } catch (e) {}

                  try {
                    var wrapper = Object.create(val);
                    
                    var targetVersions = null;
                    try {
                      targetVersions = val.versions;
                    } catch (e) {}
                    
                    if (targetVersions && typeof targetVersions === 'object') {
                      var versionsWrapper = Object.create(targetVersions);
                      Object.defineProperty(versionsWrapper, 'node', {
                        value: '18.0.0',
                        writable: true,
                        configurable: true,
                        enumerable: true
                      });
                      
                      Object.defineProperty(wrapper, 'versions', {
                        value: versionsWrapper,
                        writable: true,
                        configurable: true,
                        enumerable: true
                      });
                    } else {
                      Object.defineProperty(wrapper, 'versions', {
                        value: { node: '18.0.0' },
                        writable: true,
                        configurable: true,
                        enumerable: true
                      });
                    }
                    
                    return wrapper;
                  } catch (e) {
                    return val;
                  }
                }

                var currentProcess = ensureVersions(window.process);

                function setupProcess(obj) {
                  if (!obj) return;
                  try {
                    Object.defineProperty(obj, 'process', {
                      get: function() {
                        return currentProcess;
                      },
                      set: function(val) {
                        currentProcess = ensureVersions(val);
                      },
                      configurable: true,
                      enumerable: true
                    });
                  } catch (e) {
                    try {
                      obj.process = currentProcess;
                    } catch (err) {}
                  }
                }

                setupProcess(window);
                if (typeof globalThis !== 'undefined') setupProcess(globalThis);
                if (typeof self !== 'undefined') setupProcess(self);

                try {
                  var origDefineProperty = Object.defineProperty;
                  Object.defineProperty = function(obj, prop, desc) {
                    if ((obj === window || (typeof globalThis !== 'undefined' && obj === globalThis) || (typeof self !== 'undefined' && obj === self)) && prop === 'process' && desc) {
                      if ('value' in desc) {
                        desc.value = ensureVersions(desc.value);
                      } else if ('get' in desc) {
                        var origGet = desc.get;
                        desc.get = function() {
                          return ensureVersions(origGet.call(this));
                        };
                      }
                    }
                    return origDefineProperty.call(Object, obj, prop, desc);
                  };
                } catch (e) {}
              })();
            `,
          }}
        />
        {canLoadMeticulous ? (
          <script
            data-recording-token={meticulousToken}
            data-is-production-environment="false"
            src="https://snippet.meticulous.ai/v1/meticulous.js"
          />
        ) : null}
      </head>
      <body
        className={`${plusJakartaSans.variable} ${inter.variable} ${geistMono.variable} ${plusJakartaSans.className} bg-background text-foreground antialiased`}
      >
        <ClerkProvider
          signInUrl="/login"
          signUpUrl="/register"
          waitlistUrl="/waitlist"
          signInFallbackRedirectUrl="/dashboard"
          signUpFallbackRedirectUrl="/onboarding"
          afterSignOutUrl="/login"
        >
          <GlobalErrorBoundary>
            <PostHogProvider>
              <FeaturebaseProvider />
              {children}
              <Toaster position="top-right" />
            </PostHogProvider>
          </GlobalErrorBoundary>
        </ClerkProvider>
      </body>
    </html>
  );
}
