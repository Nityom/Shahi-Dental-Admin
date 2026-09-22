import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all staff members with dynamic advance balance and monthly payment metrics
 */
export const list = query({
  args: {
    month: v.optional(v.string()), // e.g. "2026-09"
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let staff = await ctx.db.query("staff_members").order("asc").collect();

    const currentMonth = args.month || new Date().toISOString().slice(0, 7);

    if (args.search) {
      const q = args.search.toLowerCase();
      staff = staff.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.role.toLowerCase().includes(q) ||
          (s.phone && s.phone.includes(q))
      );
    }

    // Fetch all staff payments to calculate balances
    const allPayments = await ctx.db.query("staff_payments").collect();

    const result = staff.map((member) => {
      const memberNameLower = member.name.trim().toLowerCase();

      // Find all payments belonging to this staff member
      const memberPayments = allPayments.filter(
        (p) =>
          (p.staff_id && p.staff_id === member._id) ||
          p.staff_name.trim().toLowerCase() === memberNameLower
      );

      // Advances given
      const totalAdvances = memberPayments
        .filter((p) => p.payment_type === "Advance")
        .reduce((sum, p) => sum + p.amount_paid, 0);

      // Advances deducted / settled
      const totalAdvanceDeductions = memberPayments.reduce(
        (sum, p) => sum + (p.advance_deducted || (p.payment_type === "Deduction" ? p.amount_paid : 0)),
        0
      );

      // Outstanding Advance Balance
      const advanceBalance = Math.max(0, totalAdvances - totalAdvanceDeductions);

      // Payments for the queried month
      const monthPayments = memberPayments.filter((p) => p.salary_month === currentMonth);
      const salaryPaidThisMonth = monthPayments
        .filter((p) => p.payment_type === "Salary")
        .reduce((sum, p) => sum + p.amount_paid, 0);

      const advancePaidThisMonth = monthPayments
        .filter((p) => p.payment_type === "Advance")
        .reduce((sum, p) => sum + p.amount_paid, 0);

      const advanceDeductedThisMonth = monthPayments.reduce(
        (sum, p) => sum + (p.advance_deducted || 0),
        0
      );

      const totalPaidThisMonth = monthPayments.reduce((sum, p) => sum + p.amount_paid, 0);

      const pendingSalaryThisMonth = Math.max(
        0,
        member.fixed_salary - salaryPaidThisMonth - advanceDeductedThisMonth
      );

      return {
        ...member,
        id: member._id,
        advance_balance: advanceBalance,
        total_advances_given: totalAdvances,
        total_advances_settled: totalAdvanceDeductions,
        salary_paid_this_month: salaryPaidThisMonth,
        advance_paid_this_month: advancePaidThisMonth,
        advance_deducted_this_month: advanceDeductedThisMonth,
        total_paid_this_month: totalPaidThisMonth,
        pending_salary_this_month: pendingSalaryThisMonth,
        payments_count: memberPayments.length,
      };
    });

    return result;
  },
});

/**
 * Get staff member by ID with full payment history
 */
export const getById = query({
  args: { id: v.id("staff_members") },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    if (!member) return null;

    const payments = await ctx.db
      .query("staff_payments")
      .withIndex("by_staff_name", (q) => q.eq("staff_name", member.name))
      .collect();

    const totalAdvances = payments
      .filter((p) => p.payment_type === "Advance")
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const totalAdvanceDeductions = payments.reduce(
      (sum, p) => sum + (p.advance_deducted || (p.payment_type === "Deduction" ? p.amount_paid : 0)),
      0
    );

    return {
      ...member,
      id: member._id,
      advance_balance: Math.max(0, totalAdvances - totalAdvanceDeductions),
      payments: payments.sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
    };
  },
});

/**
 * Create a new staff member with fixed salary
 */
export const create = mutation({
  args: {
    name: v.string(),
    role: v.string(),
    phone: v.optional(v.string()),
    fixed_salary: v.number(),
    joining_date: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("staff_members", {
      name: args.name.trim(),
      role: args.role.trim(),
      phone: args.phone ? args.phone.trim() : undefined,
      fixed_salary: Math.max(0, Number(args.fixed_salary) || 0),
      advance_balance: 0,
      joining_date: args.joining_date || new Date().toISOString().split("T")[0],
      status: "ACTIVE",
      notes: args.notes,
      created_at: now,
      updated_at: now,
    });
  },
});

/**
 * Update staff member details (fixed salary, role, phone, status, notes)
 */
export const update = mutation({
  args: {
    id: v.id("staff_members"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    fixed_salary: v.optional(v.number()),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    const cleanUpdates: any = { updated_at: now };

    if (updates.name !== undefined) cleanUpdates.name = updates.name.trim();
    if (updates.role !== undefined) cleanUpdates.role = updates.role.trim();
    if (updates.phone !== undefined) cleanUpdates.phone = updates.phone.trim();
    if (updates.fixed_salary !== undefined) cleanUpdates.fixed_salary = Math.max(0, Number(updates.fixed_salary) || 0);
    if (updates.status !== undefined) cleanUpdates.status = updates.status;
    if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;

    await ctx.db.patch(id, cleanUpdates);
    return await ctx.db.get(id);
  },
});

/**
 * Delete a staff member
 */
export const remove = mutation({
  args: { id: v.id("staff_members") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

/**
 * Record a payment (Salary, Advance, Incentive, Advance Settlement) to a staff member
 * Automatically notes how much was paid and when it was paid
 */
export const recordPayment = mutation({
  args: {
    staff_id: v.optional(v.id("staff_members")),
    staff_name: v.string(),
    staff_role: v.string(),
    staff_phone: v.optional(v.string()),
    salary_month: v.string(), // e.g. "2026-09"
    payment_date: v.string(), // YYYY-MM-DD
    payment_type: v.union(
      v.literal("Salary"),
      v.literal("Advance"),
      v.literal("Incentive / Bonus"),
      v.literal("Reimbursement"),
      v.literal("Deduction")
    ),
    amount_paid: v.number(),
    advance_deducted: v.optional(v.number()), // Advance adjusted in this payment
    base_salary: v.optional(v.number()),
    pending_balance: v.optional(v.number()),
    payment_mode: v.union(
      v.literal("Cash"),
      v.literal("UPI"),
      v.literal("Bank Transfer"),
      v.literal("Cheque"),
      v.literal("Other")
    ),
    transaction_reference: v.optional(v.string()),
    paid_by: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find staff member if not passed
    let staffMember = args.staff_id ? await ctx.db.get(args.staff_id) : null;
    if (!staffMember && args.staff_name) {
      staffMember = await ctx.db
        .query("staff_members")
        .withIndex("by_name", (q) => q.eq("name", args.staff_name.trim()))
        .first();
    }

    const baseSalary = args.base_salary ?? (staffMember ? staffMember.fixed_salary : 0);

    const paymentId = await ctx.db.insert("staff_payments", {
      staff_id: staffMember ? staffMember._id : args.staff_id,
      staff_name: args.staff_name.trim(),
      staff_role: args.staff_role.trim(),
      staff_phone: args.staff_phone || (staffMember ? staffMember.phone : undefined),
      salary_month: args.salary_month,
      payment_date: args.payment_date,
      payment_type: args.payment_type,
      base_salary: baseSalary,
      amount_paid: Number(args.amount_paid) || 0,
      advance_deducted: args.advance_deducted ? Number(args.advance_deducted) : undefined,
      pending_balance: args.pending_balance,
      payment_mode: args.payment_mode,
      transaction_reference: args.transaction_reference,
      paid_by: args.paid_by || "Admin",
      notes: args.notes,
      created_at: now,
    });

    // Update staff_members advance balance cache if member exists
    if (staffMember) {
      const allPayments = await ctx.db
        .query("staff_payments")
        .withIndex("by_staff_name", (q) => q.eq("staff_name", staffMember!.name))
        .collect();

      const totalAdvances = allPayments
        .filter((p) => p.payment_type === "Advance")
        .reduce((sum, p) => sum + p.amount_paid, 0);

      const totalAdvanceDeductions = allPayments.reduce(
        (sum, p) => sum + (p.advance_deducted || (p.payment_type === "Deduction" ? p.amount_paid : 0)),
        0
      );

      const newAdvanceBalance = Math.max(0, totalAdvances - totalAdvanceDeductions);

      await ctx.db.patch(staffMember._id, {
        advance_balance: newAdvanceBalance,
        updated_at: now,
      });
    }

    return paymentId;
  },
});

/**
 * Migration helper to import existing staff names from dummy staff payments
 * and clean up the ₹0 placeholder records
 */
export const migrateExistingStaff = mutation({
  args: {},
  handler: async (ctx) => {
    const existingPayments = await ctx.db.query("staff_payments").collect();

    // Distinct staff members
    const staffMap: Record<string, { role: string; phone?: string }> = {};
    const zeroPaymentIds: any[] = [];

    for (const p of existingPayments) {
      const name = p.staff_name.trim();
      if (!staffMap[name]) {
        staffMap[name] = {
          role: p.staff_role.trim(),
          phone: p.staff_phone,
        };
      }
      // If payment was dummy 0 amount created just to show the staff member
      if (p.amount_paid === 0 && (!p.notes || p.notes === "")) {
        zeroPaymentIds.push(p._id);
      }
    }

    const createdStaff: string[] = [];
    const now = Date.now();

    for (const [name, info] of Object.entries(staffMap)) {
      const existing = await ctx.db
        .query("staff_members")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();

      if (!existing) {
        await ctx.db.insert("staff_members", {
          name,
          role: info.role || "Clinic Staff",
          phone: info.phone,
          fixed_salary: 0, // Admin can set the actual fixed salary
          advance_balance: 0,
          joining_date: new Date().toISOString().split("T")[0],
          status: "ACTIVE",
          created_at: now,
          updated_at: now,
        });
        createdStaff.push(name);
      }
    }

    // Delete the 0 dummy payment placeholders
    let deletedCount = 0;
    for (const id of zeroPaymentIds) {
      await ctx.db.delete(id);
      deletedCount++;
    }

    return {
      success: true,
      createdStaff,
      deletedDummyPayments: deletedCount,
    };
  },
});
