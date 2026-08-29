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
