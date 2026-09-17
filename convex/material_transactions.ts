import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* =========================================================================
   MATERIAL TRANSACTIONS & SUBDIVISIONS AUDIT
   ========================================================================= */

export const recordTransaction = mutation({
  args: {
    material_id: v.optional(v.id("inventory")),
    material_name: v.string(),
    subdivision: v.union(
      v.literal("One-Time Material"),
      v.literal("Consumable"),
      v.literal("Non-Dental / Cleaning Consumable"),
      v.literal("Record Maintenance Material")
    ),
    transaction_type: v.union(
      v.literal("PURCHASE"),
      v.literal("USAGE"),
      v.literal("INITIAL_STOCK"),
      v.literal("ADJUSTMENT"),
      v.literal("SCRAP")
    ),
    quantity: v.number(),
    unit: v.optional(v.string()),
    rate: v.number(),
    vendor_name: v.optional(v.string()),
    invoice_no: v.optional(v.string()),
    transaction_date: v.string(), // YYYY-MM-DD
    recorded_by: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const total_cost = args.quantity * args.rate;
    let balance_after: number | undefined;

    // Update stock in inventory table if material_id exists or match by name
    let targetInventory = args.material_id ? await ctx.db.get(args.material_id) : null;
    if (!targetInventory && args.material_name) {
      const match = await ctx.db
        .query("inventory")
        .withIndex("by_name", (q) => q.eq("name", args.material_name))
        .first();
      if (match) targetInventory = match;
    }

    if (targetInventory) {
      let newQty = targetInventory.quantity;
      if (args.transaction_type === "PURCHASE") {
        newQty += args.quantity;
      } else if (args.transaction_type === "INITIAL_STOCK") {
        // Initial stock defines the base stock, do not double-increment
        newQty = args.quantity;
      } else if (args.transaction_type === "USAGE" || args.transaction_type === "SCRAP") {
        newQty = Math.max(0, newQty - args.quantity);
      } else if (args.transaction_type === "ADJUSTMENT") {
        newQty = args.quantity;
      }

      await ctx.db.patch(targetInventory._id, {
        quantity: newQty,
        rate: args.rate > 0 ? args.rate : targetInventory.rate,
        subdivision: args.subdivision,
        unit: args.unit || targetInventory.unit,
      });

      balance_after = newQty;
    }

    const now = Date.now();
    const transactionId = await ctx.db.insert("material_transactions", {
      material_id: targetInventory ? targetInventory._id : args.material_id,
      material_name: args.material_name,
      subdivision: args.subdivision,
      transaction_type: args.transaction_type,
      quantity: args.quantity,
      unit: args.unit,
      rate: args.rate,
      total_cost,
      vendor_name: args.vendor_name,
      invoice_no: args.invoice_no,
      transaction_date: args.transaction_date,
      recorded_by: args.recorded_by,
      balance_after,
      notes: args.notes,
      created_at: now,
    });

    return { transactionId, balance_after };
  },
});

export const list = query({
  args: {
    subdivision: v.optional(v.string()),
    transaction_type: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let logs = await ctx.db.query("material_transactions").order("desc").collect();

    if (args.subdivision && args.subdivision !== "ALL") {
      logs = logs.filter((l) => l.subdivision === args.subdivision);
    }
    if (args.transaction_type && args.transaction_type !== "ALL") {
      logs = logs.filter((l) => l.transaction_type === args.transaction_type);
    }
    if (args.startDate) {
      logs = logs.filter((l) => l.transaction_date >= args.startDate!);
    }
    if (args.endDate) {
      logs = logs.filter((l) => l.transaction_date <= args.endDate!);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.material_name.toLowerCase().includes(q) ||
          (l.vendor_name && l.vendor_name.toLowerCase().includes(q)) ||
          (l.invoice_no && l.invoice_no.toLowerCase().includes(q)) ||
          (l.notes && l.notes.toLowerCase().includes(q))
      );
    }

    return logs;
  },
});

export const getSubdivisionSummary = query({
  args: {},
  handler: async (ctx) => {
    const inventory = await ctx.db.query("inventory").collect();

    const subdivisions = [
      "One-Time Material",
      "Consumable",
      "Non-Dental / Cleaning Consumable",
      "Record Maintenance Material",
    ] as const;

    const summary: Record<string, { count: number; totalQuantity: number; totalValue: number }> = {};

    for (const sub of subdivisions) {
      summary[sub] = { count: 0, totalQuantity: 0, totalValue: 0 };
    }
    summary["Unassigned"] = { count: 0, totalQuantity: 0, totalValue: 0 };

    for (const item of inventory) {
      const key = item.subdivision || (item.is_consumable ? "Consumable" : "Unassigned");
      if (!summary[key]) {
        summary[key] = { count: 0, totalQuantity: 0, totalValue: 0 };
      }
      summary[key].count += 1;
      summary[key].totalQuantity += Number(item.quantity) || 0;
      summary[key].totalValue += (Number(item.quantity) || 0) * (Number(item.rate) || 0);
    }

    return summary;
  },
});
