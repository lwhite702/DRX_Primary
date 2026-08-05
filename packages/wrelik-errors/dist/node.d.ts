export { A as AppError, a as AuthRequiredError, P as PermissionDeniedError, T as TenantRequiredError, V as ValidationError } from './shared-DXFP3J32.js';

interface ErrorsConfig {
    dsn: string;
    environment?: string;
    tracesSampleRate?: number;
    sendDefaultPii?: boolean;
}
declare function initErrors(config: ErrorsConfig): void;
declare function captureError(err: unknown, context?: Record<string, any>): void;
declare function setUserContext(user: {
    id: string;
    email?: string;
} | null): void;
declare function addBreadcrumb(message: string, category?: string, data?: Record<string, any>): void;
declare function captureMessage(message: string, level?: "info" | "warning" | "error"): void;

export { type ErrorsConfig, addBreadcrumb, captureError, captureMessage, initErrors, setUserContext };
