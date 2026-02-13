export { A as AppError, a as AuthRequiredError, P as PermissionDeniedError, T as TenantRequiredError, V as ValidationError } from './shared-DXFP3J32.mjs';

declare function captureError(err: unknown, context?: Record<string, any>): void;
declare function setUserContext(user: {
    id: string;
    email?: string;
} | null): void;
declare function initErrors(dsn: string): void;

export { captureError, initErrors, setUserContext };
