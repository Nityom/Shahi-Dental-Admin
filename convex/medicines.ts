import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
    args: {
        name: v.string(),
        description: v.optional(v.string()),
        quantity: v.number(),
        rate: v.number(),
        cost_price: v.optional(v.number()),
        selling_price: v.optional(v.number()),
        company: v.optional(v.string()),
        low_stock_threshold: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("medicines", args);
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("medicines").order("desc").collect();
    },
});

export const getById = query({
    args: { id: v.id("medicines") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const update = mutation({
    args: {
        id: v.id("medicines"),
        name: v.optional(v.string()),
        description: v.optional(v.string()),
        quantity: v.optional(v.number()),
        rate: v.optional(v.number()),
        cost_price: v.optional(v.number()),
        selling_price: v.optional(v.number()),
        company: v.optional(v.string()),
        low_stock_threshold: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
        return await ctx.db.get(id);
    },
});

export const remove = mutation({
    args: { id: v.id("medicines") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

// List medicine sales within a date range (YYYY-MM-DD strings)
export const listSalesByDate = query({
    args: {
        start_date: v.string(),
        end_date: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("medicine_sales")
            .withIndex("by_sale_date", (q) => q.gte("sale_date", args.start_date))
            .filter((q) => q.lte(q.field("sale_date"), args.end_date))
            .collect();
    },
});

// Record medicine sales
export const recordSale = mutation({
    args: {
        medicine_id: v.optional(v.id("medicines")),
        medicine_name: v.string(),
        company: v.optional(v.string()),
        quantity: v.number(),
        unit_price: v.number(),
        unit_cost: v.optional(v.number()),
        total_amount: v.number(),
        sale_date: v.string(), // YYYY-MM-DD
        prescription_id: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Insert sale record
        const saleId = await ctx.db.insert("medicine_sales", args);

        // If medicine_id is provided, reduce inventory
        if (args.medicine_id) {
            const medicine = await ctx.db.get(args.medicine_id);
            if (medicine) {
                const newQuantity = Math.max(0, medicine.quantity - args.quantity);
                await ctx.db.patch(args.medicine_id, { quantity: newQuantity });
            }
        }

        return saleId;
    },
});
