declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    readonly context?: Record<string, any>;
    constructor(message: string, code: string, statusCode?: number, context?: Record<string, any>);
}
declare class AuthRequiredError extends AppError {
    constructor(message?: string, context?: Record<string, any>);
}
declare class TenantRequiredError extends AppError {
    constructor(message?: string, context?: Record<string, any>);
}
declare class PermissionDeniedError extends AppError {
    constructor(message?: string, context?: Record<string, any>);
}
declare class ValidationError extends AppError {
    constructor(message: string, context?: Record<string, any>);
}

export { AppError as A, PermissionDeniedError as P, TenantRequiredError as T, ValidationError as V, AuthRequiredError as a };
