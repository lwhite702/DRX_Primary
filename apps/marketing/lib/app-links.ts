const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app";

export const appLoginUrl = `${appBaseUrl}/login`;
export const appWaitlistUrl = `${appBaseUrl}/waitlist?source=marketing`;
