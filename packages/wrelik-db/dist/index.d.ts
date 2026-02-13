type AccessChecker = (userId: string, tenantId: string) => Promise<boolean>;
declare function setTenantAccessChecker(checker: AccessChecker): void;
declare function assertTenantAccess(userId: string, tenantId: string): Promise<void>;
declare function withTenant<T>(tenantId: string, fn: (tenantId: string) => Promise<T>): Promise<T>;
declare function getPrismaSingleton<T>(factory: () => T): T;

export { assertTenantAccess, getPrismaSingleton, setTenantAccessChecker, withTenant };
