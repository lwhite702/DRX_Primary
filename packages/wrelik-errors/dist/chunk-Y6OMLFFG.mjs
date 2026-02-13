// src/shared.ts
var AppError = class extends Error {
  code;
  statusCode;
  context;
  constructor(message, code, statusCode = 500, context) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
};
var AuthRequiredError = class extends AppError {
  constructor(message = "Authentication required", context) {
    super(message, "AUTH_REQUIRED", 401, context);
  }
};
var TenantRequiredError = class extends AppError {
  constructor(message = "Tenant context required", context) {
    super(message, "TENANT_REQUIRED", 400, context);
  }
};
var PermissionDeniedError = class extends AppError {
  constructor(message = "Permission denied", context) {
    super(message, "PERMISSION_DENIED", 403, context);
  }
};
var ValidationError = class extends AppError {
  constructor(message, context) {
    super(message, "VALIDATION_ERROR", 400, context);
  }
};

export {
  AppError,
  AuthRequiredError,
  TenantRequiredError,
  PermissionDeniedError,
  ValidationError
};
