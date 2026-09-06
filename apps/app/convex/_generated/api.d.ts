/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as categories from "../categories.js";
import type * as checkout from "../checkout.js";
import type * as commerceIdentity from "../commerceIdentity.js";
import type * as commerceSettings from "../commerceSettings.js";
import type * as credit from "../credit.js";
import type * as customers from "../customers.js";
import type * as deliveries from "../deliveries.js";
import type * as helpers_audit from "../helpers/audit.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_checkoutSettlement from "../helpers/checkoutSettlement.js";
import type * as helpers_deliveryCrypto from "../helpers/deliveryCrypto.js";
import type * as helpers_errors from "../helpers/errors.js";
import type * as helpers_fifo from "../helpers/fifo.js";
import type * as helpers_idempotency from "../helpers/idempotency.js";
import type * as helpers_manualLinePolicy from "../helpers/manualLinePolicy.js";
import type * as helpers_money from "../helpers/money.js";
import type * as helpers_permissions from "../helpers/permissions.js";
import type * as helpers_pricing from "../helpers/pricing.js";
import type * as helpers_productCommerce from "../helpers/productCommerce.js";
import type * as helpers_pushCrypto from "../helpers/pushCrypto.js";
import type * as helpers_pushOutbox from "../helpers/pushOutbox.js";
import type * as intake from "../intake.js";
import type * as inventory from "../inventory.js";
import type * as members from "../members.js";
import type * as offline from "../offline.js";
import type * as onboarding from "../onboarding.js";
import type * as products from "../products.js";
import type * as push from "../push.js";
import type * as reporting from "../reporting.js";
import type * as session from "../session.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  checkout: typeof checkout;
  commerceIdentity: typeof commerceIdentity;
  commerceSettings: typeof commerceSettings;
  credit: typeof credit;
  customers: typeof customers;
  deliveries: typeof deliveries;
  "helpers/audit": typeof helpers_audit;
  "helpers/auth": typeof helpers_auth;
  "helpers/checkoutSettlement": typeof helpers_checkoutSettlement;
  "helpers/deliveryCrypto": typeof helpers_deliveryCrypto;
  "helpers/errors": typeof helpers_errors;
  "helpers/fifo": typeof helpers_fifo;
  "helpers/idempotency": typeof helpers_idempotency;
  "helpers/manualLinePolicy": typeof helpers_manualLinePolicy;
  "helpers/money": typeof helpers_money;
  "helpers/permissions": typeof helpers_permissions;
  "helpers/pricing": typeof helpers_pricing;
  "helpers/productCommerce": typeof helpers_productCommerce;
  "helpers/pushCrypto": typeof helpers_pushCrypto;
  "helpers/pushOutbox": typeof helpers_pushOutbox;
  intake: typeof intake;
  inventory: typeof inventory;
  members: typeof members;
  offline: typeof offline;
  onboarding: typeof onboarding;
  products: typeof products;
  push: typeof push;
  reporting: typeof reporting;
  session: typeof session;
  settings: typeof settings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
