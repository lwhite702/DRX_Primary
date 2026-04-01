const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://deelrxcrm.app";

export { appBaseUrl };
export const appLoginUrl = `${appBaseUrl}/login`;
export const appRegisterUrl = `${appBaseUrl}/register`;
export const appWaitlistUrl = `${appBaseUrl}/waitlist?source=marketing`;
