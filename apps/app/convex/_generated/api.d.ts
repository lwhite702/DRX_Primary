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
import type * as credit from "../credit.js";
import type * as customers from "../customers.js";
import type * as helpers_audit from "../helpers/audit.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_errors from "../helpers/errors.js";
import type * as helpers_fifo from "../helpers/fifo.js";
import type * as helpers_idempotency from "../helpers/idempotency.js";
import type * as helpers_money from "../helpers/money.js";
import type * as helpers_permissions from "../helpers/permissions.js";
import type * as intake from "../intake.js";
import type * as inventoryAdjustments from "../inventoryAdjustments.js";
import type * as members from "../members.js";
import type * as onboarding from "../onboarding.js";
import type * as products from "../products.js";
import type * as reporting from "../reporting.js";
import type * as refunds from "../refunds.js";
import type * as settings from "../settings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  categories: typeof categories;
  checkout: typeof checkout;
  credit: typeof credit;
  customers: typeof customers;
  "helpers/audit": typeof helpers_audit;
  "helpers/auth": typeof helpers_auth;
  "helpers/errors": typeof helpers_errors;
  "helpers/fifo": typeof helpers_fifo;
  "helpers/idempotency": typeof helpers_idempotency;
  "helpers/money": typeof helpers_money;
  "helpers/permissions": typeof helpers_permissions;
  intake: typeof intake;
  inventoryAdjustments: typeof inventoryAdjustments;
  members: typeof members;
  onboarding: typeof onboarding;
  products: typeof products;
  reporting: typeof reporting;
  refunds: typeof refunds;
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
