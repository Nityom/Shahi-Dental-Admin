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
        // Prevent accidental duplicate payment submissions within 3 seconds
        const recentTx = await ctx.db
            .query("payment_transactions")
            .withIndex("by_bill", (q) => q.eq("bill_id", args.bill_id))
            .order("desc")
            .first();

        if (
            recentTx &&
            recentTx.amount === args.amount &&
            (Date.now() - recentTx._creationTime) < 3000
        ) {
            console.warn("Duplicate payment transaction detected within 3s, skipping duplicate insertion");
            return recentTx._id;
        }

        // Validate against bill total to prevent over-collection
        let safeAmount = args.amount;
        try {
            const bill = await ctx.db.get(args.bill_id as any);
            if (bill && typeof (bill as any).total_amount === "number") {
                const existingTx = await ctx.db
                    .query("payment_transactions")
                    .withIndex("by_bill", (q) => q.eq("bill_id", args.bill_id))
                    .collect();
                const existingPaid = existingTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
                const remainingBal = Math.max(0, (bill as any).total_amount - existingPaid);

                if (remainingBal <= 0) {
                    console.warn("Bill is already fully paid, skipping redundant payment transaction");
                    return recentTx?._id || ("already_paid" as any);
                }
                if (safeAmount > remainingBal) {
                    safeAmount = remainingBal;
                }
            }
        } catch (checkErr) {
            console.warn("Could not pre-validate bill remaining balance:", checkErr);
        }

        const transactionId = await ctx.db.insert("payment_transactions", {
            ...args,
            amount: safeAmount,
        });

        // Update the bill's paid_amount, balance_amount, and payment_status based on all recorded transactions
        try {
            const bill = await ctx.db.get(args.bill_id as any);
            if (bill) {
                const allTx = await ctx.db
                    .query("payment_transactions")
                    .withIndex("by_bill", (q) => q.eq("bill_id", args.bill_id))
                    .collect();
                const newPaid = allTx.reduce((sum, tx) => sum + (tx.amount || 0), 0);
                const newBalance = Math.max(0, (bill as any).total_amount - newPaid);
                let newStatus: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
                if (newPaid >= (bill as any).total_amount) {
                    newStatus = "PAID";
                } else if (newPaid > 0) {
                    newStatus = "PARTIAL";
                }
                await ctx.db.patch(args.bill_id as any, {
                    paid_amount: newPaid,
                    balance_amount: newBalance,
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

export const remove = mutation({
    args: { id: v.id("payment_transactions") },
    handler: async (ctx, args) => {
        const tx = await ctx.db.get(args.id);
        if (!tx) return;
        const billId = tx.bill_id;
        await ctx.db.delete(args.id);

        if (billId) {
            try {
                const bill = await ctx.db.get(billId as any);
                if (bill) {
                    const allTx = await ctx.db
                        .query("payment_transactions")
                        .withIndex("by_bill", (q) => q.eq("bill_id", billId))
                        .collect();
                    const newPaid = allTx.reduce((sum, t) => sum + (t.amount || 0), 0);
                    const newBalance = Math.max(0, (bill as any).total_amount - newPaid);
                    let newStatus: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
                    if (newPaid >= (bill as any).total_amount) {
                        newStatus = "PAID";
                    } else if (newPaid > 0) {
                        newStatus = "PARTIAL";
                    }
                    await ctx.db.patch(billId as any, {
                        paid_amount: newPaid,
                        balance_amount: newBalance,
                        payment_status: newStatus,
                    });
                }
            } catch (e) {
                console.error("Failed to update bill after payment removal:", e);
            }
        }
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
