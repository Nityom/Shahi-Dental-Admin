import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/* =========================================================================
   INVESTIGATIONS & OPG MODULE
   ========================================================================= */

export const create = mutation({
  args: {
    patient_id: v.optional(v.string()),
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
    investigation_type: v.string(), // "OPG", "IOPAR", "CBCT", "Lateral Ceph", "Blood Test", etc.
    investigation_date: v.string(), // YYYY-MM-DD
    doctor_name: v.optional(v.string()),
    technician_name: v.optional(v.string()),
    indication: v.optional(v.string()),
    findings: v.optional(v.string()),
    film_type: v.optional(v.union(v.literal("Digital"), v.literal("Printed Film"), v.literal("Both"))),
    cost: v.optional(v.number()),
    payment_status: v.optional(v.union(v.literal("PAID"), v.literal("PENDING"), v.literal("INCLUDED_IN_TREATMENT"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("investigations", {
      ...args,
      created_at: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("investigations"),
    patient_id: v.optional(v.string()),
    patient_name: v.optional(v.string()),
    phone_number: v.optional(v.string()),
    reference_number: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
    investigation_type: v.optional(v.string()),
    investigation_date: v.optional(v.string()),
    doctor_name: v.optional(v.string()),
    technician_name: v.optional(v.string()),
    indication: v.optional(v.string()),
    findings: v.optional(v.string()),
    film_type: v.optional(v.union(v.literal("Digital"), v.literal("Printed Film"), v.literal("Both"))),
    cost: v.optional(v.number()),
    payment_status: v.optional(v.union(v.literal("PAID"), v.literal("PENDING"), v.literal("INCLUDED_IN_TREATMENT"))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

export const getById = query({
  args: { id: v.id("investigations") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const list = query({
  args: {
    investigationType: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    doctorName: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let items = await ctx.db.query("investigations").order("desc").collect();

    if (args.investigationType && args.investigationType !== "ALL") {
      items = items.filter(
        (i) => i.investigation_type.toLowerCase() === args.investigationType!.toLowerCase()
      );
    }
    if (args.startDate) {
      items = items.filter((i) => i.investigation_date >= args.startDate!);
    }
    if (args.endDate) {
      items = items.filter((i) => i.investigation_date <= args.endDate!);
    }
    if (args.doctorName && args.doctorName !== "ALL") {
      items = items.filter(
        (i) => i.doctor_name && i.doctor_name.toLowerCase() === args.doctorName!.toLowerCase()
      );
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      items = items.filter(
        (i) =>
          i.patient_name.toLowerCase().includes(q) ||
          i.phone_number.includes(q) ||
          (i.reference_number && i.reference_number.toLowerCase().includes(q)) ||
          (i.indication && i.indication.toLowerCase().includes(q)) ||
          (i.findings && i.findings.toLowerCase().includes(q)) ||
          i.investigation_type.toLowerCase().includes(q)
      );
    }

    return items;
  },
});

/**
 * Special OPG Counting & Analytics Query
 * Returns total OPG count, date-wise breakdown, and patient-wise list for selected date range
 */
export const getOpgAnalytics = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const all = await ctx.db.query("investigations").collect();
    let opgs = all.filter((i) => i.investigation_type.toUpperCase() === "OPG");

    if (args.startDate) {
      opgs = opgs.filter((i) => i.investigation_date >= args.startDate!);
    }
    if (args.endDate) {
      opgs = opgs.filter((i) => i.investigation_date <= args.endDate!);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      opgs = opgs.filter(
        (i) =>
          i.patient_name.toLowerCase().includes(q) ||
          i.phone_number.includes(q) ||
          (i.reference_number && i.reference_number.toLowerCase().includes(q)) ||
          (i.doctor_name && i.doctor_name.toLowerCase().includes(q)) ||
          (i.indication && i.indication.toLowerCase().includes(q))
      );
    }

    // Sort by date descending
    opgs.sort((a, b) => b.investigation_date.localeCompare(a.investigation_date));

    // Date-wise counts
    const dateCountMap = new Map<string, number>();
    for (const opg of opgs) {
      const d = opg.investigation_date;
      dateCountMap.set(d, (dateCountMap.get(d) || 0) + 1);
    }

    const dateWiseCounts = Array.from(dateCountMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalCount: opgs.length,
      dateWiseCounts,
      records: opgs,
    };
  },
});
