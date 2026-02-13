export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

export class AuthRequiredError extends AppError {
  constructor(message = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTH_REQUIRED', 401, context);
  }
}

export class TenantRequiredError extends AppError {
  constructor(message = 'Tenant context required', context?: Record<string, any>) {
    super(message, 'TENANT_REQUIRED', 400, context);
  }
}

export class PermissionDeniedError extends AppError {
  constructor(message = 'Permission denied', context?: Record<string, any>) {
    super(message, 'PERMISSION_DENIED', 403, context);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, context);
  }
}
