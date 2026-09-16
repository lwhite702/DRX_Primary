/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as businessPreferences from "../businessPreferences.js";
import type * as businessProfiles from "../businessProfiles.js";
import type * as categories from "../categories.js";
import type * as checkout from "../checkout.js";
import type * as clerkIdentityEvents from "../clerkIdentityEvents.js";
import type * as clerkMembershipEvents from "../clerkMembershipEvents.js";
import type * as clerkWebhooks from "../clerkWebhooks.js";
import type * as commerceIdentity from "../commerceIdentity.js";
import type * as commerceSettings from "../commerceSettings.js";
import type * as credit from "../credit.js";
import type * as creditAllocation from "../creditAllocation.js";
import type * as creditAudit from "../creditAudit.js";
import type * as creditDashboard from "../creditDashboard.js";
import type * as creditPolicy from "../creditPolicy.js";
import type * as creditRecommendationGeneration from "../creditRecommendationGeneration.js";
import type * as creditRecommendationInputs from "../creditRecommendationInputs.js";
import type * as creditRecommendationSettings from "../creditRecommendationSettings.js";
import type * as creditRecommendations from "../creditRecommendations.js";
import type * as creditTransactions from "../creditTransactions.js";
import type * as customers from "../customers.js";
import type * as deliveries from "../deliveries.js";
import type * as deliveryProfiles from "../deliveryProfiles.js";
import type * as drawer from "../drawer.js";
import type * as featurebase from "../featurebase.js";
import type * as health from "../health.js";
import type * as helpers_audit from "../helpers/audit.js";
import type * as helpers_auth from "../helpers/auth.js";
import type * as helpers_businessPreferences from "../helpers/businessPreferences.js";
import type * as helpers_checkoutSettlement from "../helpers/checkoutSettlement.js";
import type * as helpers_checkoutTerms from "../helpers/checkoutTerms.js";
import type * as helpers_creditLedger from "../helpers/creditLedger.js";
import type * as helpers_creditPolicyRevision from "../helpers/creditPolicyRevision.js";
import type * as helpers_deliveryCrypto from "../helpers/deliveryCrypto.js";
import type * as helpers_errors from "../helpers/errors.js";
import type * as helpers_fifo from "../helpers/fifo.js";
import type * as helpers_idempotency from "../helpers/idempotency.js";
import type * as helpers_manualLinePolicy from "../helpers/manualLinePolicy.js";
import type * as helpers_money from "../helpers/money.js";
import type * as helpers_notificationRecipient from "../helpers/notificationRecipient.js";
import type * as helpers_permissions from "../helpers/permissions.js";
import type * as helpers_pricing from "../helpers/pricing.js";
import type * as helpers_productCommerce from "../helpers/productCommerce.js";
import type * as helpers_pushCrypto from "../helpers/pushCrypto.js";
import type * as helpers_pushOutbox from "../helpers/pushOutbox.js";
import type * as helpers_salesVelocity from "../helpers/salesVelocity.js";
import type * as helpers_teamInvitations from "../helpers/teamInvitations.js";
import type * as helpers_teamManagement from "../helpers/teamManagement.js";
import type * as intake from "../intake.js";
import type * as inventory from "../inventory.js";
import type * as inventoryAdjustments from "../inventoryAdjustments.js";
import type * as inventoryChecks from "../inventoryChecks.js";
import type * as inventoryHealth from "../inventoryHealth.js";
import type * as inventoryHealthActions from "../inventoryHealthActions.js";
import type * as inventoryIntelligence from "../inventoryIntelligence.js";
import type * as members from "../members.js";
import type * as notificationActions from "../notificationActions.js";
import type * as notificationPreferenceActions from "../notificationPreferenceActions.js";
import type * as notificationPreferences from "../notificationPreferences.js";
import type * as notifications from "../notifications.js";
import type * as offline from "../offline.js";
import type * as onboarding from "../onboarding.js";
import type * as posBootstrap from "../posBootstrap.js";
import type * as products from "../products.js";
import type * as push from "../push.js";
import type * as refunds from "../refunds.js";
import type * as reporting from "../reporting.js";
import type * as securitySessions from "../securitySessions.js";
import type * as session from "../session.js";
import type * as settings from "../settings.js";
import type * as shrinkage from "../shrinkage.js";
import type * as teamManagement from "../teamManagement.js";
import type * as unitAliases from "../unitAliases.js";
import type * as validators_dashboard from "../validators/dashboard.js";
import type * as validators_privacy from "../validators/privacy.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  businessPreferences: typeof businessPreferences;
  businessProfiles: typeof businessProfiles;
  categories: typeof categories;
  checkout: typeof checkout;
  clerkIdentityEvents: typeof clerkIdentityEvents;
  clerkMembershipEvents: typeof clerkMembershipEvents;
  clerkWebhooks: typeof clerkWebhooks;
  commerceIdentity: typeof commerceIdentity;
  commerceSettings: typeof commerceSettings;
  credit: typeof credit;
  creditAllocation: typeof creditAllocation;
  creditAudit: typeof creditAudit;
  creditDashboard: typeof creditDashboard;
  creditPolicy: typeof creditPolicy;
  creditRecommendationGeneration: typeof creditRecommendationGeneration;
  creditRecommendationInputs: typeof creditRecommendationInputs;
  creditRecommendationSettings: typeof creditRecommendationSettings;
  creditRecommendations: typeof creditRecommendations;
  creditTransactions: typeof creditTransactions;
  customers: typeof customers;
  deliveries: typeof deliveries;
  deliveryProfiles: typeof deliveryProfiles;
  drawer: typeof drawer;
  featurebase: typeof featurebase;
  health: typeof health;
  "helpers/audit": typeof helpers_audit;
  "helpers/auth": typeof helpers_auth;
  "helpers/businessPreferences": typeof helpers_businessPreferences;
  "helpers/checkoutSettlement": typeof helpers_checkoutSettlement;
  "helpers/checkoutTerms": typeof helpers_checkoutTerms;
  "helpers/creditLedger": typeof helpers_creditLedger;
  "helpers/creditPolicyRevision": typeof helpers_creditPolicyRevision;
  "helpers/deliveryCrypto": typeof helpers_deliveryCrypto;
  "helpers/errors": typeof helpers_errors;
  "helpers/fifo": typeof helpers_fifo;
  "helpers/idempotency": typeof helpers_idempotency;
  "helpers/manualLinePolicy": typeof helpers_manualLinePolicy;
  "helpers/money": typeof helpers_money;
  "helpers/notificationRecipient": typeof helpers_notificationRecipient;
  "helpers/permissions": typeof helpers_permissions;
  "helpers/pricing": typeof helpers_pricing;
  "helpers/productCommerce": typeof helpers_productCommerce;
  "helpers/pushCrypto": typeof helpers_pushCrypto;
  "helpers/pushOutbox": typeof helpers_pushOutbox;
  "helpers/salesVelocity": typeof helpers_salesVelocity;
  "helpers/teamInvitations": typeof helpers_teamInvitations;
  "helpers/teamManagement": typeof helpers_teamManagement;
  intake: typeof intake;
  inventory: typeof inventory;
  inventoryAdjustments: typeof inventoryAdjustments;
  inventoryChecks: typeof inventoryChecks;
  inventoryHealth: typeof inventoryHealth;
  inventoryHealthActions: typeof inventoryHealthActions;
  inventoryIntelligence: typeof inventoryIntelligence;
  members: typeof members;
  notificationActions: typeof notificationActions;
  notificationPreferenceActions: typeof notificationPreferenceActions;
  notificationPreferences: typeof notificationPreferences;
  notifications: typeof notifications;
  offline: typeof offline;
  onboarding: typeof onboarding;
  posBootstrap: typeof posBootstrap;
  products: typeof products;
  push: typeof push;
  refunds: typeof refunds;
  reporting: typeof reporting;
  securitySessions: typeof securitySessions;
  session: typeof session;
  settings: typeof settings;
  shrinkage: typeof shrinkage;
  teamManagement: typeof teamManagement;
  unitAliases: typeof unitAliases;
  "validators/dashboard": typeof validators_dashboard;
  "validators/privacy": typeof validators_privacy;
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
