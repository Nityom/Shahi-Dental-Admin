import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* =========================================================================
   1. REVIEW REGISTER
   ========================================================================= */

export const createReview = mutation({
  args: {
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    review_date: v.string(),
    doctor_name: v.optional(v.string()),
    chief_complaint_or_treatment: v.optional(v.string()),
    findings_notes: v.optional(v.string()),
    status: v.union(v.literal("Scheduled"), v.literal("Visited"), v.literal("Completed"), v.literal("Missed"), v.literal("Rescheduled")),
    prescription_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("review_register", {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const updateReview = mutation({
  args: {
    id: v.id("review_register"),
    patient_name: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    reference_number: v.optional(v.string()),
    review_date: v.optional(v.string()),
    doctor_name: v.optional(v.string()),
    chief_complaint_or_treatment: v.optional(v.string()),
    findings_notes: v.optional(v.string()),
    status: v.optional(v.union(v.literal("Scheduled"), v.literal("Visited"), v.literal("Completed"), v.literal("Missed"), v.literal("Rescheduled"))),
    prescription_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteReview = mutation({
  args: { id: v.id("review_register") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listReviews = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let reviews = await ctx.db.query("review_register").order("desc").collect();

    if (args.startDate) {
      reviews = reviews.filter((r) => r.review_date >= args.startDate!);
    }
    if (args.endDate) {
      reviews = reviews.filter((r) => r.review_date <= args.endDate!);
    }
    if (args.status && args.status !== "ALL") {
      reviews = reviews.filter((r) => r.status === args.status);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      reviews = reviews.filter(
        (r) =>
          r.patient_name.toLowerCase().includes(q) ||
          r.phone_number.includes(q) ||
          (r.reference_number && r.reference_number.toLowerCase().includes(q)) ||
          (r.doctor_name && r.doctor_name.toLowerCase().includes(q))
      );
    }

    return reviews;
  },
});

/* =========================================================================
   2. PATIENT RECALL REGISTER
   ========================================================================= */

export const createRecall = mutation({
  args: {
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    recall_type: v.string(),
    due_date: v.string(),
    last_visit_date: v.optional(v.string()),
    status: v.union(v.literal("Due"), v.literal("Contacted"), v.literal("Scheduled"), v.literal("Completed"), v.literal("Dismissed")),
    doctor_name: v.optional(v.string()),
    notes: v.optional(v.string()),
    contacted_date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("patient_recalls", {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const updateRecall = mutation({
  args: {
    id: v.id("patient_recalls"),
    patient_name: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    reference_number: v.optional(v.string()),
    recall_type: v.optional(v.string()),
    due_date: v.optional(v.string()),
    last_visit_date: v.optional(v.string()),
    status: v.optional(v.union(v.literal("Due"), v.literal("Contacted"), v.literal("Scheduled"), v.literal("Completed"), v.literal("Dismissed"))),
    doctor_name: v.optional(v.string()),
    notes: v.optional(v.string()),
    contacted_date: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteRecall = mutation({
  args: { id: v.id("patient_recalls") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listRecalls = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let recalls = await ctx.db.query("patient_recalls").order("desc").collect();

    if (args.startDate) {
      recalls = recalls.filter((r) => r.due_date >= args.startDate!);
    }
    if (args.endDate) {
      recalls = recalls.filter((r) => r.due_date <= args.endDate!);
    }
    if (args.status && args.status !== "ALL") {
      recalls = recalls.filter((r) => r.status === args.status);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      recalls = recalls.filter(
        (r) =>
          r.patient_name.toLowerCase().includes(q) ||
          r.phone_number.includes(q) ||
          (r.reference_number && r.reference_number.toLowerCase().includes(q)) ||
          r.recall_type.toLowerCase().includes(q)
      );
    }

    return recalls;
  },
});

/* =========================================================================
   3. PATIENT FOLLOW-UP REGISTER
   ========================================================================= */

export const createFollowup = mutation({
  args: {
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    followup_date: v.string(),
    treatment_summary: v.optional(v.string()),
    doctor_name: v.optional(v.string()),
    status: v.union(v.literal("Pending"), v.literal("Called - Reached"), v.literal("Called - No Answer"), v.literal("Confirmed"), v.literal("Completed"), v.literal("Cancelled")),
    notes: v.optional(v.string()),
    next_followup_date: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("patient_followups", {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const updateFollowup = mutation({
  args: {
    id: v.id("patient_followups"),
    patient_name: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    reference_number: v.optional(v.string()),
    followup_date: v.optional(v.string()),
    treatment_summary: v.optional(v.string()),
    doctor_name: v.optional(v.string()),
    status: v.optional(v.union(v.literal("Pending"), v.literal("Called - Reached"), v.literal("Called - No Answer"), v.literal("Confirmed"), v.literal("Completed"), v.literal("Cancelled"))),
    notes: v.optional(v.string()),
    next_followup_date: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteFollowup = mutation({
  args: { id: v.id("patient_followups") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listFollowups = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let followups = await ctx.db.query("patient_followups").order("desc").collect();

    if (args.startDate) {
      followups = followups.filter((f) => f.followup_date >= args.startDate!);
    }
    if (args.endDate) {
      followups = followups.filter((f) => f.followup_date <= args.endDate!);
    }
    if (args.status && args.status !== "ALL") {
      followups = followups.filter((f) => f.status === args.status);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      followups = followups.filter(
        (f) =>
          f.patient_name.toLowerCase().includes(q) ||
          f.phone_number.includes(q) ||
          (f.reference_number && f.reference_number.toLowerCase().includes(q)) ||
          (f.treatment_summary && f.treatment_summary.toLowerCase().includes(q))
      );
    }

    return followups;
  },
});

/* =========================================================================
   4. CROWN CUTTING REGISTER
   ========================================================================= */

export const createCrownCutting = mutation({
  args: {
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    tooth_numbers: v.string(),
    crown_type: v.string(),
    shade: v.optional(v.string()),
    cutting_date: v.string(),
    dentist_name: v.string(),
    lab_name: v.string(),
    impression_type: v.optional(v.string()),
    expected_delivery_date: v.optional(v.string()),
    lab_cost: v.optional(v.number()),
    patient_cost: v.optional(v.number()),
    status: v.union(v.literal("Sent to Lab"), v.literal("In Lab"), v.literal("Received"), v.literal("Trial Done"), v.literal("Cemented / Completed"), v.literal("Sent for Redo")),
    notes: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("crown_cutting_register", {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const updateCrownCutting = mutation({
  args: {
    id: v.id("crown_cutting_register"),
    patient_name: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    reference_number: v.optional(v.string()),
    tooth_numbers: v.optional(v.string()),
    crown_type: v.optional(v.string()),
    shade: v.optional(v.string()),
    cutting_date: v.optional(v.string()),
    dentist_name: v.optional(v.string()),
    lab_name: v.optional(v.string()),
    impression_type: v.optional(v.string()),
    expected_delivery_date: v.optional(v.string()),
    lab_cost: v.optional(v.number()),
    patient_cost: v.optional(v.number()),
    status: v.optional(v.union(v.literal("Sent to Lab"), v.literal("In Lab"), v.literal("Received"), v.literal("Trial Done"), v.literal("Cemented / Completed"), v.literal("Sent for Redo"))),
    notes: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });
    return await ctx.db.get(id);
  },
});

export const deleteCrownCutting = mutation({
  args: { id: v.id("crown_cutting_register") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listCrownCutting = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.string()),
    labName: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let cases = await ctx.db.query("crown_cutting_register").order("desc").collect();

    if (args.startDate) {
      cases = cases.filter((c) => c.cutting_date >= args.startDate!);
    }
    if (args.endDate) {
      cases = cases.filter((c) => c.cutting_date <= args.endDate!);
    }
    if (args.status && args.status !== "ALL") {
      cases = cases.filter((c) => c.status === args.status);
    }
    if (args.labName && args.labName !== "ALL") {
      cases = cases.filter((c) => c.lab_name.toLowerCase() === args.labName!.toLowerCase());
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      cases = cases.filter(
        (c) =>
          c.patient_name.toLowerCase().includes(q) ||
          c.phone_number.includes(q) ||
          (c.reference_number && c.reference_number.toLowerCase().includes(q)) ||
          c.tooth_numbers.toLowerCase().includes(q) ||
          c.crown_type.toLowerCase().includes(q) ||
          c.lab_name.toLowerCase().includes(q)
      );
    }

    return cases;
  },
});

/* =========================================================================
   5. CROWN RECEIVED REGISTER
   ========================================================================= */

export const createCrownReceived = mutation({
  args: {
    crown_cutting_id: v.optional(v.id("crown_cutting_register")),
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    tooth_numbers: v.string(),
    crown_type: v.string(),
    shade: v.optional(v.string()),
    lab_name: v.string(),
    cutting_date: v.optional(v.string()),
    received_date: v.string(),
    received_by: v.optional(v.string()),
    fitting_date: v.optional(v.string()),
    status: v.union(v.literal("Received in Clinic"), v.literal("Trial Scheduled"), v.literal("Trial Done - Fit OK"), v.literal("Cemented / Delivered"), v.literal("Rejected / Redo Needed")),
    lab_bill_no: v.optional(v.string()),
    lab_amount: v.optional(v.number()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const newId = await ctx.db.insert("crown_received_register", {
      ...args,
      created_at: now,
      updated_at: now,
    });

    // If linked to crown cutting, update its status
    if (args.crown_cutting_id) {
      await ctx.db.patch(args.crown_cutting_id, {
        status: "Received",
        updated_at: now,
      });
    }

    return newId;
  },
});

export const updateCrownReceived = mutation({
  args: {
    id: v.id("crown_received_register"),
    crown_cutting_id: v.optional(v.id("crown_cutting_register")),
    patient_name: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    reference_number: v.optional(v.string()),
    tooth_numbers: v.optional(v.string()),
    crown_type: v.optional(v.string()),
    shade: v.optional(v.string()),
    lab_name: v.optional(v.string()),
    cutting_date: v.optional(v.string()),
    received_date: v.optional(v.string()),
    received_by: v.optional(v.string()),
    fitting_date: v.optional(v.string()),
    status: v.optional(v.union(v.literal("Received in Clinic"), v.literal("Trial Scheduled"), v.literal("Trial Done - Fit OK"), v.literal("Cemented / Delivered"), v.literal("Rejected / Redo Needed"))),
    lab_bill_no: v.optional(v.string()),
    lab_amount: v.optional(v.number()),
    remarks: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });

    // Sync cutting status if cemented or rejected
    if (updates.status && updates.crown_cutting_id) {
      if (updates.status === "Cemented / Delivered") {
        await ctx.db.patch(updates.crown_cutting_id, { status: "Cemented / Completed", updated_at: Date.now() });
      } else if (updates.status === "Rejected / Redo Needed") {
        await ctx.db.patch(updates.crown_cutting_id, { status: "Sent for Redo", updated_at: Date.now() });
      }
    }

    return await ctx.db.get(id);
  },
});

export const deleteCrownReceived = mutation({
  args: { id: v.id("crown_received_register") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listCrownReceived = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.string()),
    labName: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let received = await ctx.db.query("crown_received_register").order("desc").collect();

    if (args.startDate) {
      received = received.filter((r) => r.received_date >= args.startDate!);
    }
    if (args.endDate) {
      received = received.filter((r) => r.received_date <= args.endDate!);
    }
    if (args.status && args.status !== "ALL") {
      received = received.filter((r) => r.status === args.status);
    }
    if (args.labName && args.labName !== "ALL") {
      received = received.filter((r) => r.lab_name.toLowerCase() === args.labName!.toLowerCase());
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      received = received.filter(
        (r) =>
          r.patient_name.toLowerCase().includes(q) ||
          r.phone_number.includes(q) ||
          (r.reference_number && r.reference_number.toLowerCase().includes(q)) ||
          r.tooth_numbers.toLowerCase().includes(q) ||
          r.crown_type.toLowerCase().includes(q) ||
          r.lab_name.toLowerCase().includes(q)
      );
    }

    return received;
  },
});

/* =========================================================================
   6. STAFF PAYMENT HISTORY / LEDGER
   ========================================================================= */

export const createStaffPayment = mutation({
  args: {
    staff_name: v.string(),
    staff_role: v.string(),
    staff_phone: v.optional(v.string()),
    salary_month: v.string(), // e.g. "2026-08"
    payment_date: v.string(), // YYYY-MM-DD
    payment_type: v.union(
      v.literal("Salary"),
      v.literal("Advance"),
      v.literal("Incentive / Bonus"),
      v.literal("Reimbursement"),
      v.literal("Deduction")
    ),
    base_salary: v.optional(v.number()),
    amount_paid: v.number(),
    previous_payments_total: v.optional(v.number()),
    pending_balance: v.optional(v.number()),
    payment_mode: v.union(v.literal("Cash"), v.literal("UPI"), v.literal("Bank Transfer"), v.literal("Cheque"), v.literal("Other")),
    transaction_reference: v.optional(v.string()),
    paid_by: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("staff_payments", {
      ...args,
      created_at: now,
    });
  },
});

export const updateStaffPayment = mutation({
  args: {
    id: v.id("staff_payments"),
    staff_name: v.optional(v.string()),
    staff_role: v.optional(v.string()),
    staff_phone: v.optional(v.string()),
    salary_month: v.optional(v.string()),
    payment_date: v.optional(v.string()),
    payment_type: v.optional(v.union(
      v.literal("Salary"),
      v.literal("Advance"),
      v.literal("Incentive / Bonus"),
      v.literal("Reimbursement"),
      v.literal("Deduction")
    )),
    base_salary: v.optional(v.number()),
    amount_paid: v.optional(v.number()),
    previous_payments_total: v.optional(v.number()),
    pending_balance: v.optional(v.number()),
    payment_mode: v.optional(v.union(v.literal("Cash"), v.literal("UPI"), v.literal("Bank Transfer"), v.literal("Cheque"), v.literal("Other"))),
    transaction_reference: v.optional(v.string()),
    paid_by: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const deleteStaffPayment = mutation({
  args: { id: v.id("staff_payments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listStaffPayments = query({
  args: {
    staffName: v.optional(v.string()),
    salaryMonth: v.optional(v.string()),
    paymentType: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payments = await ctx.db.query("staff_payments").order("desc").collect();

    if (args.staffName && args.staffName !== "ALL") {
      payments = payments.filter((p) => p.staff_name.toLowerCase() === args.staffName!.toLowerCase());
    }
    if (args.salaryMonth && args.salaryMonth !== "ALL") {
      payments = payments.filter((p) => p.salary_month === args.salaryMonth);
    }
    if (args.paymentType && args.paymentType !== "ALL") {
      payments = payments.filter((p) => p.payment_type === args.paymentType);
    }
    if (args.startDate) {
      payments = payments.filter((p) => p.payment_date >= args.startDate!);
    }
    if (args.endDate) {
      payments = payments.filter((p) => p.payment_date <= args.endDate!);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      payments = payments.filter(
        (p) =>
          p.staff_name.toLowerCase().includes(q) ||
          p.staff_role.toLowerCase().includes(q) ||
          (p.transaction_reference && p.transaction_reference.toLowerCase().includes(q)) ||
          (p.notes && p.notes.toLowerCase().includes(q))
      );
    }

    return payments;
  },
});

export const getStaffLedgerSummary = query({
  args: {
    staffName: v.string(),
  },
  handler: async (ctx, args) => {
    const allPayments = await ctx.db
      .query("staff_payments")
      .withIndex("by_staff_name", (q) => q.eq("staff_name", args.staffName))
      .collect();

    const totalSalaryPaid = allPayments
      .filter((p) => p.payment_type === "Salary")
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const totalAdvancePaid = allPayments
      .filter((p) => p.payment_type === "Advance")
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const totalIncentives = allPayments
      .filter((p) => p.payment_type === "Incentive / Bonus")
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const totalReimbursements = allPayments
      .filter((p) => p.payment_type === "Reimbursement")
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const totalDeductions = allPayments
      .filter((p) => p.payment_type === "Deduction")
      .reduce((sum, p) => sum + p.amount_paid, 0);

    const netPaid = totalSalaryPaid + totalAdvancePaid + totalIncentives + totalReimbursements - totalDeductions;

    return {
      staffName: args.staffName,
      totalPaymentsCount: allPayments.length,
      totalSalaryPaid,
      totalAdvancePaid,
      totalIncentives,
      totalReimbursements,
      totalDeductions,
      netPaid,
      payments: allPayments.sort((a, b) => b.payment_date.localeCompare(a.payment_date)),
    };
  },
});
