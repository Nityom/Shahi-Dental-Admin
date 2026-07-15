/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as bills from "../bills.js";
import type * as consumables from "../consumables.js";
import type * as inventory from "../inventory.js";
import type * as inventory_sales from "../inventory_sales.js";
import type * as medicines from "../medicines.js";
import type * as patients from "../patients.js";
import type * as payment_transactions from "../payment_transactions.js";
import type * as prescriptions from "../prescriptions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appointments: typeof appointments;
  auth: typeof auth;
  bills: typeof bills;
  consumables: typeof consumables;
  inventory: typeof inventory;
  inventory_sales: typeof inventory_sales;
  medicines: typeof medicines;
  patients: typeof patients;
  payment_transactions: typeof payment_transactions;
  prescriptions: typeof prescriptions;
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
