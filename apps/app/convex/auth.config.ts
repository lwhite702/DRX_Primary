import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain:
        process.env.CLERK_FRONTEND_API_URL ||
        process.env.CLERK_JWT_ISSUER_DOMAIN ||
        "https://new-stallion-72.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig;
