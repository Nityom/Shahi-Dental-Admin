import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const record = mutation({
    args: {
        inventory_id: v.optional(v.string()),
        inventory_name: v.string(),
        quantity: v.number(),
        rate: v.number(),
        total_amount: v.number(),
        notes: v.optional(v.string()),
        sale_date: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("inventory_sales", {
            inventory_id: args.inventory_id,
            inventory_name: args.inventory_name,
            quantity: args.quantity,
            rate: args.rate,
            total_amount: args.total_amount,
            notes: args.notes,
            sale_date: args.sale_date,
        });
    },
});

export const listByDate = query({
    args: { sale_date: v.string() },
    handler: async (ctx, args) => {
        const directSales = await ctx.db
            .query("inventory_sales")
            .withIndex("by_sale_date", (q) => q.eq("sale_date", args.sale_date))
            .order("desc")
            .collect();

        const usages = await ctx.db
            .query("material_transactions")
            .withIndex("by_date", (q) => q.eq("transaction_date", args.sale_date))
            .filter((q) => q.eq(q.field("transaction_type"), "USAGE"))
            .collect();

        const mappedUsages = usages.map((u) => ({
            _id: u._id,
            inventory_id: u.material_id ? String(u.material_id) : undefined,
            inventory_name: u.material_name,
            quantity: u.quantity,
            rate: u.rate,
            total_amount: u.total_cost,
            notes: u.notes,
            sale_date: u.transaction_date,
            unit: u.unit || "pcs",
            subdivision: u.subdivision,
            source: "material_usage",
        }));

        return [...directSales, ...mappedUsages];
    },
});

export const listAll = query({
    args: {},
    handler: async (ctx) => {
        const directSales = await ctx.db
            .query("inventory_sales")
            .order("desc")
            .collect();

        const usages = await ctx.db
            .query("material_transactions")
            .order("desc")
            .filter((q) => q.eq(q.field("transaction_type"), "USAGE"))
            .collect();

        const mappedUsages = usages.map((u) => ({
            _id: u._id,
            inventory_id: u.material_id ? String(u.material_id) : undefined,
            inventory_name: u.material_name,
            quantity: u.quantity,
            rate: u.rate,
            total_amount: u.total_cost,
            notes: u.notes,
            sale_date: u.transaction_date,
            unit: u.unit || "pcs",
            subdivision: u.subdivision,
            source: "material_usage",
        }));

        return [...directSales, ...mappedUsages].sort((a, b) => b.sale_date.localeCompare(a.sale_date));
    },
});

export const listByDateRange = query({
    args: {
        start_date: v.string(),
        end_date: v.string(),
    },
    handler: async (ctx, args) => {
        const directSales = await ctx.db
            .query("inventory_sales")
            .withIndex("by_sale_date")
            .order("desc")
            .collect();

        const filteredDirect = directSales.filter(
            (s) => s.sale_date >= args.start_date && s.sale_date <= args.end_date
        );

        const materialTx = await ctx.db
            .query("material_transactions")
            .order("desc")
            .collect();

        const usages = materialTx
            .filter(
                (m) =>
                    m.transaction_type === "USAGE" &&
                    m.transaction_date >= args.start_date &&
                    m.transaction_date <= args.end_date
            )
            .map((u) => ({
                _id: u._id,
                inventory_id: u.material_id ? String(u.material_id) : undefined,
                inventory_name: u.material_name,
                quantity: u.quantity,
                rate: u.rate,
                total_amount: u.total_cost,
                notes: u.notes,
                sale_date: u.transaction_date,
                unit: u.unit || "pcs",
                subdivision: u.subdivision,
                source: "material_usage",
            }));

        return [...filteredDirect, ...usages].sort((a, b) => b.sale_date.localeCompare(a.sale_date));
    },
});
