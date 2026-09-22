import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        quantity: v.number(),
        rate: v.number(),
        company: v.optional(v.string()),
        is_consumable: v.boolean(),
        subdivision: v.optional(v.union(
            v.literal("One-Time Material"),
            v.literal("Consumable"),
            v.literal("Non-Dental / Cleaning Consumable"),
            v.literal("Record Maintenance Material")
        )),
        unit: v.optional(v.string()),
        min_stock_level: v.optional(v.number()),
        deduction_qty: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("inventory", args);
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("inventory").order("desc").collect();
    },
});

export const getById = query({
    args: { id: v.id("inventory") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const update = mutation({
    args: {
        id: v.id("inventory"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        quantity: v.optional(v.number()),
        rate: v.optional(v.number()),
        company: v.optional(v.string()),
        is_consumable: v.optional(v.boolean()),
        subdivision: v.optional(v.union(
            v.literal("One-Time Material"),
            v.literal("Consumable"),
            v.literal("Non-Dental / Cleaning Consumable"),
            v.literal("Record Maintenance Material")
        )),
        unit: v.optional(v.string()),
        min_stock_level: v.optional(v.number()),
        enabled: v.optional(v.boolean()),
        deduction_qty: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("inventory") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

/**
 * Mutation to restore stock that was erroneously auto-deducted from prescriptions
 * and delete the fake inventory_sales records.
 */
export const restoreAutoDeductedStock = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Find all inventory_sales recorded via auto-deduction
        const allSales = await ctx.db.query("inventory_sales").collect();
        const autoSales = allSales.filter((s) =>
            s.notes && s.notes.includes("Auto-deducted for prescription")
        );

        // Group auto deductions by inventory name (normalized)
        const deductedQuantities: Record<string, number> = {};
        for (const sale of autoSales) {
            const name = (sale.inventory_name || "").trim().toLowerCase();
            if (name) {
                deductedQuantities[name] = (deductedQuantities[name] || 0) + (sale.quantity || 1);
            }
        }

        // 2. Fetch all inventory items and material_transactions
        const allInventory = await ctx.db.query("inventory").collect();
        const allTx = await ctx.db.query("material_transactions").collect();

        const restoredItems: Array<{ name: string; oldQuantity: number; addedBack: number; newQuantity: number }> = [];

        for (const inv of allInventory) {
            const invName = inv.name.trim().toLowerCase();
            const autoDeducted = deductedQuantities[invName] || 0;

            let targetQuantity = inv.quantity + autoDeducted;

            // Check if there was an INITIAL_STOCK in material_transactions for this item
            const itemTx = allTx.filter((t) =>
                (t.material_id && t.material_id === inv._id) ||
                (t.material_name && t.material_name.trim().toLowerCase() === invName)
            );

            const initialTx = itemTx.find((t) => t.transaction_type === "INITIAL_STOCK");
            if (initialTx && initialTx.quantity > 0) {
                let calculatedFromTx = initialTx.quantity;
                for (const t of itemTx) {
                    if (t._id === initialTx._id) continue;
                    if (t.transaction_type === "PURCHASE") calculatedFromTx += t.quantity;
                    else if (t.transaction_type === "USAGE" || t.transaction_type === "SCRAP") {
                        calculatedFromTx = Math.max(0, calculatedFromTx - t.quantity);
                    } else if (t.transaction_type === "ADJUSTMENT") {
                        calculatedFromTx = t.quantity;
                    }
                }
                if (calculatedFromTx > targetQuantity) {
                    targetQuantity = calculatedFromTx;
                }
            }

            if (targetQuantity !== inv.quantity) {
                await ctx.db.patch(inv._id, {
                    quantity: targetQuantity,
                    enabled: false,
                });
                restoredItems.push({
                    name: inv.name,
                    oldQuantity: inv.quantity,
                    addedBack: targetQuantity - inv.quantity,
                    newQuantity: targetQuantity,
                });
            } else {
                await ctx.db.patch(inv._id, { enabled: false });
            }
        }

        // 3. Delete the fake inventory_sales records
        let deletedSalesCount = 0;
        for (const sale of autoSales) {
            await ctx.db.delete(sale._id);
            deletedSalesCount++;
        }

        return {
            success: true,
            restoredItems,
            deletedSalesCount,
        };
    },
});

