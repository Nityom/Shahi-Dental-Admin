import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
    args: {
        bill_id: v.string(),
        patient_id: v.string(),
        amount: v.number(),
        payment_method: v.optional(v.string()),
        payment_date: v.string(),
        notes: v.optional(v.string()),
        created_by: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const transactionId = await ctx.db.insert("payment_transactions", args);

        // Update the bill's paid_amount, balance_amount, and payment_status
        try {
            const bill = await ctx.db.get(args.bill_id as any);
            if (bill) {
                const newPaid = (bill as any).paid_amount + args.amount;
                const newBalance = (bill as any).total_amount - newPaid;
                let newStatus: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
                if (newPaid >= (bill as any).total_amount) {
                    newStatus = "PAID";
                } else if (newPaid > 0) {
                    newStatus = "PARTIAL";
                }
                await ctx.db.patch(args.bill_id as any, {
                    paid_amount: newPaid,
                    balance_amount: Math.max(0, newBalance),
                    payment_status: newStatus,
                });
            }
        } catch (e) {
            // Bill update failed but transaction was recorded
            console.error("Failed to update bill after payment:", e);
        }

        return transactionId;
    },
});

export const listByBill = query({
    args: { bill_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("payment_transactions")
            .withIndex("by_bill", (q) => q.eq("bill_id", args.bill_id))
            .order("desc")
            .collect();
    },
});

export const list = query({
    args: {
        startDate: v.optional(v.string()),
        endDate: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        let transactions = await ctx.db
            .query("payment_transactions")
            .order("desc")
            .collect();

        if (args.startDate || args.endDate) {
            return transactions.filter((tx) => {
                const date = tx.payment_date;
                if (!date) return true;
                if (args.startDate && date < args.startDate) return false;
                if (args.endDate && date > args.endDate) return false;
                return true;
            });
        }

        return transactions;
    },
});
