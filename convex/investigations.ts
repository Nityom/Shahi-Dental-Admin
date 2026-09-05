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
 * Automatic OPG & IOPAR Detection & Reporting from Prescriptions
 * Automatically scans the investigation field (and treatment items) of all prescriptions
 */
export const getAutomaticInvestigationReport = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    doctorName: v.optional(v.string()),
    investigationType: v.optional(v.string()), // "ALL" | "OPG" | "IOPAR" | "BLOOD" | "SUGAR"
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allPrescriptions = await ctx.db.query("prescriptions").order("desc").collect();
    const records: Array<{
      id: string;
      prescription_id: string;
      patient_name: string;
      phone_number: string;
      reference_number?: string;
      prescription_date: string;
      doctor_name?: string;
      investigation_text: string;
      has_opg: boolean;
      has_iopar: boolean;
      has_blood: boolean;
      has_sugar: boolean;
      investigation_types: string[];
      total_amount: number;
    }> = [];

    let totalOpg = 0;
    let totalIopar = 0;
    let totalBlood = 0;
    let totalSugar = 0;
    let totalIoparRevenue = 0;
    let totalBloodRevenue = 0;
    let totalSugarRevenue = 0;
    let totalRevenue = 0;

    for (const rx of allPrescriptions) {
      const invText = (rx.investigation || "").trim();
      let treatments: any[] = [];
      if (rx.treatment_done) {
        try {
          treatments = typeof rx.treatment_done === "string" ? JSON.parse(rx.treatment_done) : rx.treatment_done;
        } catch {
          treatments = [];
        }
      }

      const rxTreatmentText = Array.isArray(treatments)
        ? treatments.map((t) => (t.description || t.name || "").toString()).join(" ")
        : "";

      const combinedText = `${invText} ${rxTreatmentText}`.toLowerCase();

      // Case-insensitive detection
      const hasOpg = /\bopg\b/i.test(combinedText) || combinedText.includes("opg");
      const hasIopar = /\biopar\b/i.test(combinedText) || combinedText.includes("iopar") || combinedText.includes("x-ray") || combinedText.includes("xray");
      const hasBlood = combinedText.includes("blood test") || combinedText.includes("cbc") || combinedText.includes("hemogram");
      const hasSugar = combinedText.includes("sugar test") || combinedText.includes("rbs") || combinedText.includes("fbs") || combinedText.includes("blood sugar") || combinedText.includes("random blood sugar");

      if (!hasOpg && !hasIopar && !hasBlood && !hasSugar && !invText) {
        continue;
      }

      // Calculate amounts for each test from treatments or fallback to standard rates
      let rxIoparAmount = 0;
      let rxBloodAmount = 0;
      let rxSugarAmount = 0;

      if (Array.isArray(treatments)) {
        for (const t of treatments) {
          const desc = (t.description || t.name || "").toLowerCase();
          const cost = Number(t.cost) || 0;
          if (desc.includes("iopar") || desc.includes("x-ray") || desc.includes("xray")) {
            rxIoparAmount += cost > 0 ? cost : 200;
          }
          if (desc.includes("blood test") || desc.includes("cbc") || desc.includes("hemogram")) {
            rxBloodAmount += cost > 0 ? cost : 50;
          }
          if (desc.includes("sugar test") || desc.includes("rbs") || desc.includes("fbs") || desc.includes("blood sugar")) {
            rxSugarAmount += cost > 0 ? cost : 50;
          }
        }
      }

      if (hasIopar && rxIoparAmount === 0) rxIoparAmount = 200;
      if (hasBlood && rxBloodAmount === 0) rxBloodAmount = 50;
      if (hasSugar && rxSugarAmount === 0) rxSugarAmount = 50;

      const types: string[] = [];
      if (hasOpg) types.push("OPG");
      if (hasIopar) types.push("IOPAR (₹" + rxIoparAmount + ")");
      if (hasBlood) types.push("Blood Test (₹" + rxBloodAmount + ")");
      if (hasSugar) types.push("Sugar Test (₹" + rxSugarAmount + ")");

      // Apply date filters
      if (args.startDate && rx.prescription_date < args.startDate) {
        continue;
      }
      if (args.endDate && rx.prescription_date > args.endDate) {
        continue;
      }

      // Apply doctor filter
      if (args.doctorName && args.doctorName !== "ALL") {
        if (!rx.doctor_name || rx.doctor_name.toLowerCase() !== args.doctorName.toLowerCase()) {
          continue;
        }
      }

      // Apply search filter
      if (args.search) {
        const q = args.search.toLowerCase();
        const matches =
          rx.patient_name.toLowerCase().includes(q) ||
          rx.phone_number.includes(q) ||
          (rx.reference_number && rx.reference_number.toLowerCase().includes(q)) ||
          (rx.doctor_name && rx.doctor_name.toLowerCase().includes(q)) ||
          invText.toLowerCase().includes(q);
        if (!matches) continue;
      }

      // Apply type filter
      if (args.investigationType === "OPG" && !hasOpg) {
        continue;
      }
      if (args.investigationType === "IOPAR" && !hasIopar) {
        continue;
      }
      if (args.investigationType === "BLOOD" && !hasBlood) {
        continue;
      }
      if (args.investigationType === "SUGAR" && !hasSugar) {
        continue;
      }

      if (hasOpg) totalOpg++;
      if (hasIopar) {
        totalIopar++;
        totalIoparRevenue += rxIoparAmount;
      }
      if (hasBlood) {
        totalBlood++;
        totalBloodRevenue += rxBloodAmount;
      }
      if (hasSugar) {
        totalSugar++;
        totalSugarRevenue += rxSugarAmount;
      }

      const rxTestRevenue = rxIoparAmount + rxBloodAmount + rxSugarAmount;
      totalRevenue += rxTestRevenue;

      records.push({
        id: rx._id,
        prescription_id: rx._id,
        patient_name: rx.patient_name,
        phone_number: rx.phone_number,
        reference_number: rx.reference_number,
        prescription_date: rx.prescription_date,
        doctor_name: rx.doctor_name || "Dr. Kautilya Swaroop",
        investigation_text: invText || types.join(", "),
        has_opg: hasOpg,
        has_iopar: hasIopar,
        has_blood: hasBlood,
        has_sugar: hasSugar,
        investigation_types: types,
        total_amount: rxTestRevenue,
      });
    }

    // Sort descending by date
    records.sort((a, b) => b.prescription_date.localeCompare(a.prescription_date));

    // Date-wise breakdown
    const dateMap = new Map<string, { opgCount: number; ioparCount: number; bloodCount: number; sugarCount: number; totalCount: number; totalAmount: number }>();
    for (const r of records) {
      const d = r.prescription_date;
      const current = dateMap.get(d) || { opgCount: 0, ioparCount: 0, bloodCount: 0, sugarCount: 0, totalCount: 0, totalAmount: 0 };
      if (r.has_opg) current.opgCount++;
      if (r.has_iopar) current.ioparCount++;
      if (r.has_blood) current.bloodCount++;
      if (r.has_sugar) current.sugarCount++;
      current.totalCount += (r.has_opg ? 1 : 0) + (r.has_iopar ? 1 : 0) + (r.has_blood ? 1 : 0) + (r.has_sugar ? 1 : 0);
      current.totalAmount += r.total_amount;
      dateMap.set(d, current);
    }

    const dateWiseBreakdown = Array.from(dateMap.entries())
      .map(([date, counts]) => ({
        date,
        opgCount: counts.opgCount,
        ioparCount: counts.ioparCount,
        bloodCount: counts.bloodCount,
        sugarCount: counts.sugarCount,
        totalCount: counts.totalCount,
        totalAmount: counts.totalAmount,
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      totalOpg,
      totalIopar,
      totalBlood,
      totalSugar,
      totalCount: totalOpg + totalIopar + totalBlood + totalSugar,
      totalIoparRevenue,
      totalBloodRevenue,
      totalSugarRevenue,
      totalRevenue,
      dateWiseBreakdown,
      records,
    };
  },
});

