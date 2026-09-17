import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* =========================================================================
   1. STOCKISTS DIRECTORY
   ========================================================================= */

export const listStockists = query({
  args: {
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let stockists = await ctx.db.query("stockists").order("desc").collect();

    if (args.search) {
      const q = args.search.toLowerCase();
      stockists = stockists.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.contact_person && s.contact_person.toLowerCase().includes(q)) ||
          (s.phone && s.phone.includes(q))
      );
    }

    // Get all bills to compute ledger totals per stockist
    const allBills = await ctx.db.query("stockist_bills").collect();

    return stockists.map((s) => {
      const bills = allBills.filter(
        (b) => b.stockist_id === s._id || b.stockist_name.toLowerCase() === s.name.toLowerCase()
      );
      const total_billed = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
      const total_paid = bills.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
      const total_balance = bills.reduce((sum, b) => sum + (b.balance_amount || 0), 0);
      const open_bills_count = bills.filter((b) => b.payment_status !== "PAID").length;

      return {
        ...s,
        total_billed,
        total_paid,
        total_balance,
        bills_count: bills.length,
        open_bills_count,
      };
    });
  },
});

export const createStockist = mutation({
  args: {
    name: v.string(),
    contact_person: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    gst_number: v.optional(v.string()),
    drug_license_no: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("stockists", {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const updateStockist = mutation({
  args: {
    id: v.id("stockists"),
    name: v.optional(v.string()),
    contact_person: v.optional(v.string()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    gst_number: v.optional(v.string()),
    drug_license_no: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteStockist = mutation({
  args: { id: v.id("stockists") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

/* =========================================================================
   2. STOCKIST BILLS (PURCHASE INVOICES)
   ========================================================================= */

export const listBills = query({
  args: {
    stockist_name: v.optional(v.string()),
    stockist_id: v.optional(v.id("stockists")),
    payment_status: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let bills = await ctx.db.query("stockist_bills").order("desc").collect();

    if (args.stockist_name && args.stockist_name !== "ALL") {
      bills = bills.filter((b) => b.stockist_name.toLowerCase() === args.stockist_name!.toLowerCase());
    }

    if (args.stockist_id) {
      bills = bills.filter((b) => b.stockist_id === args.stockist_id);
    }

    if (args.payment_status && args.payment_status !== "ALL") {
      bills = bills.filter((b) => b.payment_status === args.payment_status);
    }

    if (args.startDate) {
      bills = bills.filter((b) => b.bill_date >= args.startDate!);
    }

    if (args.endDate) {
      bills = bills.filter((b) => b.bill_date <= args.endDate!);
    }

    if (args.search) {
      const q = args.search.toLowerCase();
      bills = bills.filter(
        (b) =>
          b.bill_number.toLowerCase().includes(q) ||
          b.stockist_name.toLowerCase().includes(q) ||
          (b.notes && b.notes.toLowerCase().includes(q)) ||
          (Array.isArray(b.items) &&
            b.items.some((item: any) =>
              item.medicine_name && item.medicine_name.toLowerCase().includes(q)
            ))
      );
    }

    // Sort by bill_date descending
    bills.sort((a, b) => b.bill_date.localeCompare(a.bill_date));
    return bills;
  },
});

export const getBillById = query({
  args: { id: v.id("stockist_bills") },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.id);
    if (!bill) return null;

    const payments = await ctx.db
      .query("stockist_payments")
      .withIndex("by_bill", (q) => q.eq("stockist_bill_id", args.id))
      .collect();

    payments.sort((a, b) => a.payment_date.localeCompare(b.payment_date));

    return {
      ...bill,
      payments,
    };
  },
});

export const createBill = mutation({
  args: {
    stockist_name: v.string(),
    stockist_id: v.optional(v.id("stockists")),
    bill_number: v.string(),
    bill_date: v.string(),
    due_date: v.optional(v.string()),
    total_amount: v.number(),
    items: v.optional(v.any()),
    has_physical_copy: v.optional(v.boolean()),
    physical_copy_notes: v.optional(v.string()),
    notes: v.optional(v.string()),
    initial_paid_amount: v.optional(v.number()),
    initial_payment_mode: v.optional(
      v.union(v.literal("Cash"), v.literal("UPI"), v.literal("Bank Transfer"), v.literal("Cheque"), v.literal("Other"))
    ),
    initial_payment_ref: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const cleanStockistName = args.stockist_name.trim();

    // Auto-create or link stockist if not existing
    let stockistId = args.stockist_id;
    if (!stockistId) {
      const existing = await ctx.db
        .query("stockists")
        .withIndex("by_name", (q) => q.eq("name", cleanStockistName))
        .first();

      if (existing) {
        stockistId = existing._id;
      } else {
        stockistId = await ctx.db.insert("stockists", {
          name: cleanStockistName,
          created_at: now,
          updated_at: now,
        });
      }
    }

    const initialPaid = Math.max(0, args.initial_paid_amount || 0);
    const balanceAmount = Math.max(0, args.total_amount - initialPaid);
    const paymentStatus = balanceAmount <= 0 ? "PAID" : initialPaid > 0 ? "PARTIAL" : "PENDING";

    const billId = await ctx.db.insert("stockist_bills", {
      stockist_id: stockistId,
      stockist_name: cleanStockistName,
      bill_number: args.bill_number.trim(),
      bill_date: args.bill_date,
      due_date: args.due_date,
      total_amount: args.total_amount,
      paid_amount: initialPaid,
      balance_amount: balanceAmount,
      payment_status: paymentStatus,
      items: args.items || [],
      has_physical_copy: args.has_physical_copy ?? true,
      physical_copy_notes: args.physical_copy_notes,
      notes: args.notes,
      created_at: now,
      updated_at: now,
    });

    // If an initial payment was made on bill receipt
    if (initialPaid > 0) {
      await ctx.db.insert("stockist_payments", {
        stockist_bill_id: billId,
        stockist_id: stockistId,
        stockist_name: cleanStockistName,
        bill_number: args.bill_number.trim(),
        payment_date: args.bill_date,
        amount: initialPaid,
        payment_mode: args.initial_payment_mode || "Cash",
        transaction_reference: args.initial_payment_ref,
        noted_on_physical_copy: true,
        notes: "Initial payment on delivery",
        created_at: now,
      });
    }

    return billId;
  },
});

export const updateBill = mutation({
  args: {
    id: v.id("stockist_bills"),
    stockist_name: v.optional(v.string()),
    stockist_id: v.optional(v.id("stockists")),
    bill_number: v.optional(v.string()),
    bill_date: v.optional(v.string()),
    due_date: v.optional(v.string()),
    total_amount: v.optional(v.number()),
    items: v.optional(v.any()),
    has_physical_copy: v.optional(v.boolean()),
    physical_copy_notes: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const current = await ctx.db.get(id);
    if (!current) throw new Error("Bill not found");

    const newTotal = updates.total_amount !== undefined ? updates.total_amount : current.total_amount;
    const paidAmount = current.paid_amount || 0;
    const newBalance = Math.max(0, newTotal - paidAmount);
    const newStatus = newBalance <= 0 ? "PAID" : paidAmount > 0 ? "PARTIAL" : "PENDING";

    await ctx.db.patch(id, {
      ...updates,
      total_amount: newTotal,
      balance_amount: newBalance,
      payment_status: newStatus,
      updated_at: Date.now(),
    });

    return await ctx.db.get(id);
  },
});

export const deleteBill = mutation({
  args: { id: v.id("stockist_bills") },
  handler: async (ctx, args) => {
    // Delete all payments linked to this bill
    const payments = await ctx.db
      .query("stockist_payments")
      .withIndex("by_bill", (q) => q.eq("stockist_bill_id", args.id))
      .collect();

    for (const p of payments) {
      await ctx.db.delete(p._id);
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

/* =========================================================================
   3. STOCKIST PAYMENTS (WEEKLY INSTALLMENTS & PART-PAYMENTS)
   ========================================================================= */

export const recordPayment = mutation({
  args: {
    stockist_bill_id: v.id("stockist_bills"),
    payment_date: v.string(), // YYYY-MM-DD
    amount: v.number(),
    payment_mode: v.union(v.literal("Cash"), v.literal("UPI"), v.literal("Bank Transfer"), v.literal("Cheque"), v.literal("Other")),
    transaction_reference: v.optional(v.string()),
    noted_on_physical_copy: v.optional(v.boolean()),
    collected_by: v.optional(v.string()),
    paid_by: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bill = await ctx.db.get(args.stockist_bill_id);
    if (!bill) throw new Error("Stockist bill not found");

    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    const now = Date.now();
    const newPaidAmount = (bill.paid_amount || 0) + args.amount;
    const newBalanceAmount = Math.max(0, bill.total_amount - newPaidAmount);
    const newStatus = newBalanceAmount <= 0 ? "PAID" : "PARTIAL";

    // 1. Insert payment transaction record
    const paymentId = await ctx.db.insert("stockist_payments", {
      stockist_bill_id: bill._id,
      stockist_id: bill.stockist_id,
      stockist_name: bill.stockist_name,
      bill_number: bill.bill_number,
      payment_date: args.payment_date,
      amount: args.amount,
      payment_mode: args.payment_mode,
      transaction_reference: args.transaction_reference,
      noted_on_physical_copy: args.noted_on_physical_copy ?? true,
      collected_by: args.collected_by,
      paid_by: args.paid_by,
      notes: args.notes,
      created_at: now,
    });

    // 2. Update the parent bill's paid, balance, and status
    await ctx.db.patch(bill._id, {
      paid_amount: newPaidAmount,
      balance_amount: newBalanceAmount,
      payment_status: newStatus,
      updated_at: now,
    });

    return paymentId;
  },
});

export const deletePayment = mutation({
  args: { id: v.id("stockist_payments") },
  handler: async (ctx, args) => {
    const payment = await ctx.db.get(args.id);
    if (!payment) throw new Error("Payment not found");

    const bill = await ctx.db.get(payment.stockist_bill_id);
    if (bill) {
      const restoredPaidAmount = Math.max(0, (bill.paid_amount || 0) - payment.amount);
      const restoredBalanceAmount = Math.max(0, bill.total_amount - restoredPaidAmount);
      const restoredStatus = restoredBalanceAmount <= 0 ? "PAID" : restoredPaidAmount > 0 ? "PARTIAL" : "PENDING";

      await ctx.db.patch(bill._id, {
        paid_amount: restoredPaidAmount,
        balance_amount: restoredBalanceAmount,
        payment_status: restoredStatus,
        updated_at: Date.now(),
      });
    }

    await ctx.db.delete(args.id);
    return true;
  },
});

export const listPayments = query({
  args: {
    stockist_bill_id: v.optional(v.id("stockist_bills")),
    stockist_name: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payments: any[] = [];

    if (args.stockist_bill_id) {
      payments = await ctx.db
        .query("stockist_payments")
        .withIndex("by_bill", (q) => q.eq("stockist_bill_id", args.stockist_bill_id!))
        .collect();
    } else if (args.stockist_name && args.stockist_name !== "ALL") {
      payments = await ctx.db
        .query("stockist_payments")
        .withIndex("by_stockist", (q) => q.eq("stockist_name", args.stockist_name!))
        .collect();
    } else {
      payments = await ctx.db.query("stockist_payments").order("desc").collect();
    }

    if (args.startDate) {
      payments = payments.filter((p) => p.payment_date >= args.startDate!);
    }
    if (args.endDate) {
      payments = payments.filter((p) => p.payment_date <= args.endDate!);
    }

    // Sort by payment_date descending
    payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date));
    return payments;
  },
});

/* =========================================================================
   4. DASHBOARD AGGREGATES
   ========================================================================= */

export const getDashboardSummary = query({
  args: {},
  handler: async (ctx) => {
    const bills = await ctx.db.query("stockist_bills").collect();
    const stockists = await ctx.db.query("stockists").collect();
    const payments = await ctx.db.query("stockist_payments").collect();

    const total_billed = bills.reduce((sum, b) => sum + (b.total_amount || 0), 0);
    const total_paid = bills.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
    const total_balance = bills.reduce((sum, b) => sum + (b.balance_amount || 0), 0);
    const pending_bills_count = bills.filter((b) => b.payment_status === "PENDING").length;
    const partial_bills_count = bills.filter((b) => b.payment_status === "PARTIAL").length;
    const fully_paid_bills_count = bills.filter((b) => b.payment_status === "PAID").length;

    return {
      stockists_count: stockists.length,
      total_bills_count: bills.length,
      total_billed,
      total_paid,
      total_balance,
      pending_bills_count,
      partial_bills_count,
      fully_paid_bills_count,
      total_payments_count: payments.length,
    };
  },
});
