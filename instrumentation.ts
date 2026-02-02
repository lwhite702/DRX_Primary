import { errorTracker } from "@wrelik/errors";

export async function register() {
  errorTracker.init();
}

export const onRequestError = (err: any, request: Request, context: any) => {
  errorTracker.captureException(err, { request, context });
};
