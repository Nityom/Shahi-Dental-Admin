import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Default Main Doctors to seed if table is empty
 */
const DEFAULT_MAIN_DOCTORS = [
  {
    name: "Dr. Kautilya Swaroop",
    doctor_type: "MAIN" as const,
    commission_percentage: undefined,
    phone: "9917606732",
    status: "ACTIVE" as const,
    joining_date: "2024-01-01",
    signature_url: "/sign.png",
    notes: "Chief Dental Surgeon & Founder",
  },
  {
    name: "Dr. Anjali Swaroop",
    doctor_type: "MAIN" as const,
    commission_percentage: undefined,
    status: "ACTIVE" as const,
    joining_date: "2024-01-01",
    signature_url: "/sign1.png",
    notes: "Main Doctor & Dental Surgeon",
  },
];

/* =========================================================================
   1. DOCTOR CRUD & LISTING
   ========================================================================= */

export const list = query({
  args: {
    doctorType: v.optional(v.union(v.literal("MAIN"), v.literal("ASSISTANT"), v.literal("ALL"))),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"), v.literal("ALL"))),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let doctors = await ctx.db.query("doctors").order("asc").collect();

    // If doctors table is empty, return default main doctors
    if (doctors.length === 0) {
      doctors = DEFAULT_MAIN_DOCTORS.map((d, index) => ({
        _id: `default_${index}` as any,
        _creationTime: Date.now(),
        ...d,
      }));
    }

    if (args.doctorType && args.doctorType !== "ALL") {
      doctors = doctors.filter((d) => d.doctor_type === args.doctorType);
    }
    if (args.status && args.status !== "ALL") {
      doctors = doctors.filter((d) => d.status === args.status);
    }
    if (args.search) {
      const q = args.search.toLowerCase();
      doctors = doctors.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.phone && d.phone.includes(q)) ||
          (d.notes && d.notes.toLowerCase().includes(q))
      );
    }

    return doctors;
  },
});

export const getById = query({
  args: { id: v.id("doctors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const seedDefaults = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("doctors").collect();
    if (existing.length === 0) {
      const now = Date.now();
      for (const doc of DEFAULT_MAIN_DOCTORS) {
        await ctx.db.insert("doctors", {
          ...doc,
          created_at: now,
          updated_at: now,
        });
      }
      return true;
    }
    return false;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    doctor_type: v.union(v.literal("MAIN"), v.literal("ASSISTANT")),
    commission_percentage: v.optional(v.number()), // 2, 5, 7, 10
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
    joining_date: v.optional(v.string()),
    notes: v.optional(v.string()),
    signature_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if defaults exist first, if not seed them
    const existing = await ctx.db.query("doctors").collect();
    if (existing.length === 0) {
      const now = Date.now();
      for (const doc of DEFAULT_MAIN_DOCTORS) {
        if (doc.name.toLowerCase() !== args.name.toLowerCase()) {
          await ctx.db.insert("doctors", {
            ...doc,
            created_at: now,
            updated_at: now,
          });
        }
      }
    }

    const now = Date.now();
    return await ctx.db.insert("doctors", {
      ...args,
      created_at: now,
      updated_at: now,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("doctors"),
    name: v.optional(v.string()),
    doctor_type: v.optional(v.union(v.literal("MAIN"), v.literal("ASSISTANT"))),
    commission_percentage: v.optional(v.number()),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.optional(v.union(v.literal("ACTIVE"), v.literal("INACTIVE"))),
    joining_date: v.optional(v.string()),
    notes: v.optional(v.string()),
    signature_url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, { ...updates, updated_at: Date.now() });
    return await ctx.db.get(id);
  },
});

export const remove = mutation({
  args: { id: v.id("doctors") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return true;
  },
});

/* =========================================================================
   2. REVENUE & COMMISSION ENGINE FOR ASSISTANT DOCTORS
   ========================================================================= */

// Helpers for exclusion categorization
function isMedicineItem(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("tab ") || n.includes("cap ") || n.includes("syr ") || n.includes("ointment") || n.includes("mouthwash") || n.includes("gel") || n.includes("medicine");
}

function isCrownOrCapItem(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("crown") || n.includes("cap") || n.includes("pfm") || n.includes("zirconia") || n.includes("emax") || n.includes("e-max") || n.includes("monolithic") || n.includes("cutting");
}

function isXrayItem(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("iopar") || n.includes("opg") || n.includes("x-ray") || n.includes("xray") || n.includes("radiograph") || n.includes("rvg") || n.includes("cbct") || n.includes("lateral ceph");
}

function isConsultationItem(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("consultation") || n.includes("consult") || n.includes("checkup") || n.includes("check up") || n.includes("examination") || n.includes("opd");
}

function isBracesItem(name: string): boolean {
  const n = name.toLowerCase();
  return n.includes("brace") || n.includes("braces") || n.includes("ortho") || n.includes("orthodontic") || n.includes("aligner") || n.includes("aligners") || n.includes("retainer");
}

function isProsthoOrImplantItem(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n.includes("rpd") ||
    n.includes("removable partial denture") ||
    n.includes("denture") ||
    n.includes("cast partial") ||
    n.includes("complete denture") ||
    n.includes("fpd") ||
    n.includes("fixed partial denture") ||
    n.includes("bridge") ||
    n.includes("cantilever") ||
    n.includes("implant") ||
    n.includes("impant") ||
    n.includes("abutment") ||
    n.includes("prosthesis")
  );
}

/**
 * Calculates monthly revenue and eligible commission for an Assistant Doctor
 */
export const getDoctorMonthlyRevenue = query({
  args: {
    doctorId: v.optional(v.id("doctors")),
    doctorName: v.optional(v.string()),
    month: v.string(), // YYYY-MM
  },
  handler: async (ctx, args) => {
    let doctor: any = null;
    if (args.doctorId) {
      doctor = await ctx.db.get(args.doctorId);
    }
    if (!doctor && args.doctorName) {
      const allDocs = await ctx.db.query("doctors").collect();
      doctor = allDocs.find((d) => d.name.toLowerCase() === args.doctorName!.toLowerCase());
    }

    const docName = doctor ? doctor.name : (args.doctorName || "");
    const commissionPercent = doctor?.commission_percentage || 0;
    const isAssistant = doctor?.doctor_type === "ASSISTANT";

    // Query all prescriptions for this doctor
    const allPrescriptions = await ctx.db.query("prescriptions").collect();
    const docPrescriptions = allPrescriptions.filter((p) => {
      const matchesDoc = p.doctor_name && p.doctor_name.toLowerCase() === docName.toLowerCase();
      const matchesMonth = p.prescription_date && p.prescription_date.startsWith(args.month);
      return matchesDoc && matchesMonth;
    });

    // Query all medicine sales for this month
    const allMedicineSales = await ctx.db.query("medicine_sales").collect();
    const allBills = await ctx.db.query("bills").collect();

    let totalRevenue = 0;
    let medicineCost = 0;
    let crownCapCost = 0;
    let xrayCost = 0;
    let consultationCost = 0;
    let bracesCost = 0;
    let prosthoImplantCost = 0;

    const prescriptionBreakdowns = [];

    for (const rx of docPrescriptions) {
      const rxId = rx._id;
      const bill = allBills.find((b) => b.prescription_id === rxId);
      
      let rxRevenue = 0;
      let rxMedCost = 0;
      let rxCrownCapCost = 0;
      let rxXrayCost = 0;
      let rxConsultationCost = 0;
      let rxBracesCost = 0;
      let rxProsthoImplantCost = 0;

      // 1. Calculate Treatment Done Revenue & Itemized Exclusions
      if (rx.treatment_done) {
        let treatments: any[] = [];
        try {
          treatments = typeof rx.treatment_done === "string" ? JSON.parse(rx.treatment_done) : rx.treatment_done;
        } catch {
          treatments = [];
        }

        if (Array.isArray(treatments)) {
          for (const item of treatments) {
            const amount = Number(item.total ?? (Number(item.quantity || 1) * Number(item.unit_price || item.price || 0))) || 0;
            const desc = (item.description || item.name || "").toString();

            rxRevenue += amount;

            if (isCrownOrCapItem(desc)) {
              rxCrownCapCost += amount;
            } else if (isProsthoOrImplantItem(desc)) {
              rxProsthoImplantCost += amount;
            } else if (isXrayItem(desc)) {
              rxXrayCost += amount;
            } else if (isConsultationItem(desc)) {
              rxConsultationCost += amount;
            } else if (isBracesItem(desc)) {
              rxBracesCost += amount;
            } else if (isMedicineItem(desc)) {
              rxMedCost += amount;
            }
          }
        }
      }

      // 2. Calculate Medicine Sales linked to this prescription
      const rxSales = allMedicineSales.filter((s) => s.prescription_id === rxId);
      for (const sale of rxSales) {
        const saleAmt = sale.total_amount || 0;
        rxRevenue += saleAmt;
        rxMedCost += saleAmt;
      }

      // If no medicine sales recorded but medicines array has items with quantities
      if (rxSales.length === 0 && rx.medicines) {
        let meds: any[] = [];
        try {
          meds = typeof rx.medicines === "string" ? JSON.parse(rx.medicines) : rx.medicines;
        } catch {
          meds = [];
        }
        if (Array.isArray(meds)) {
          for (const med of meds) {
            if (med.total_price || (med.quantity && med.price)) {
              const medAmt = Number(med.total_price || (med.quantity * med.price)) || 0;
              rxRevenue += medAmt;
              rxMedCost += medAmt;
            }
          }
        }
      }

      // If bill has total amount greater than computed rxRevenue, reconcile with bill
      if (bill && bill.total_amount > rxRevenue && rxRevenue === 0) {
        rxRevenue = bill.total_amount;
      }

      const rxTotalExcluded = rxMedCost + rxCrownCapCost + rxXrayCost + rxConsultationCost + rxBracesCost + rxProsthoImplantCost;
      const rxEligibleRevenue = Math.max(0, rxRevenue - rxTotalExcluded);
      const rxPayable = Math.round(rxEligibleRevenue * (commissionPercent / 100));

      totalRevenue += rxRevenue;
      medicineCost += rxMedCost;
      crownCapCost += rxCrownCapCost;
      xrayCost += rxXrayCost;
      consultationCost += rxConsultationCost;
      bracesCost += rxBracesCost;
      prosthoImplantCost += rxProsthoImplantCost;

      prescriptionBreakdowns.push({
        prescription_id: rx._id,
        prescription_date: rx.prescription_date,
        patient_name: rx.patient_name,
        phone_number: rx.phone_number,
        reference_number: rx.reference_number,
        total_revenue: rxRevenue,
        medicine_cost: rxMedCost,
        crown_cap_cost: rxCrownCapCost,
        xray_cost: rxXrayCost,
        consultation_cost: rxConsultationCost,
        braces_cost: rxBracesCost,
        prostho_implant_cost: rxProsthoImplantCost,
        total_excluded: rxTotalExcluded,
        eligible_revenue: rxEligibleRevenue,
        payable_commission: rxPayable,
      });
    }

    const totalExcluded = medicineCost + crownCapCost + xrayCost + consultationCost + bracesCost + prosthoImplantCost;
    const eligibleRevenue = Math.max(0, totalRevenue - totalExcluded);
    const amountPayable = isAssistant ? Math.round(eligibleRevenue * (commissionPercent / 100)) : 0;

    // Check existing payout record for this month
    let existingPayout = null;
    if (doctor?._id) {
      existingPayout = await ctx.db
        .query("doctor_payouts")
        .withIndex("by_doctor_month", (q) => q.eq("doctor_id", doctor._id).eq("month", args.month))
        .first();
    }

    return {
      doctorId: doctor?._id,
      doctorName: docName,
      doctorType: doctor?.doctor_type || "MAIN",
      isAssistant,
      commissionPercentage: commissionPercent,
      month: args.month,
      totalPrescriptionsCount: docPrescriptions.length,
      totalRevenue,
      medicineCost,
      crownCapCost,
      xrayCost,
      consultationCost,
      bracesCost,
      prosthoImplantCost,
      totalExcluded,
      eligibleRevenue,
      amountPayable,
      payoutRecord: existingPayout,
      prescriptions: prescriptionBreakdowns.sort((a, b) => b.prescription_date.localeCompare(a.prescription_date)),
    };
  },
});

/**
 * Returns monthly summary for all assistant doctors
 */
export const getAssistantDoctorsMonthlySummary = query({
  args: {
    month: v.string(), // YYYY-MM
  },
  handler: async (ctx, args) => {
    const allDoctors = await ctx.db.query("doctors").collect();
    const assistantDoctors = allDoctors.filter((d) => d.doctor_type === "ASSISTANT" && d.status === "ACTIVE");

    const allPrescriptions = await ctx.db.query("prescriptions").collect();
    const allMedicineSales = await ctx.db.query("medicine_sales").collect();

    const summaryList = [];

    for (const doc of assistantDoctors) {
      const docName = doc.name;
      const commissionPercent = doc.commission_percentage || 0;

      const docPrescriptions = allPrescriptions.filter((p) => {
        const matchesDoc = p.doctor_name && p.doctor_name.toLowerCase() === docName.toLowerCase();
        const matchesMonth = p.prescription_date && p.prescription_date.startsWith(args.month);
        return matchesDoc && matchesMonth;
      });

      let totalRevenue = 0;
      let medicineCost = 0;
      let crownCapCost = 0;
      let xrayCost = 0;
      let consultationCost = 0;
      let bracesCost = 0;
      let prosthoImplantCost = 0;

      for (const rx of docPrescriptions) {
        let rxRevenue = 0;
        let rxMedCost = 0;

        if (rx.treatment_done) {
          let treatments: any[] = [];
          try {
            treatments = typeof rx.treatment_done === "string" ? JSON.parse(rx.treatment_done) : rx.treatment_done;
          } catch {
            treatments = [];
          }

          if (Array.isArray(treatments)) {
            for (const item of treatments) {
              const amount = Number(item.total ?? (Number(item.quantity || 1) * Number(item.unit_price || item.price || 0))) || 0;
              const desc = (item.description || item.name || "").toString();

              rxRevenue += amount;
              if (isCrownOrCapItem(desc)) crownCapCost += amount;
              else if (isProsthoOrImplantItem(desc)) prosthoImplantCost += amount;
              else if (isXrayItem(desc)) xrayCost += amount;
              else if (isConsultationItem(desc)) consultationCost += amount;
              else if (isBracesItem(desc)) bracesCost += amount;
              else if (isMedicineItem(desc)) rxMedCost += amount;
            }
          }
        }

        const rxSales = allMedicineSales.filter((s) => s.prescription_id === rx._id);
        for (const sale of rxSales) {
          const saleAmt = sale.total_amount || 0;
          rxRevenue += saleAmt;
          rxMedCost += saleAmt;
        }

        totalRevenue += rxRevenue;
        medicineCost += rxMedCost;
      }

      const totalExcluded = medicineCost + crownCapCost + xrayCost + consultationCost + bracesCost + prosthoImplantCost;
      const eligibleRevenue = Math.max(0, totalRevenue - totalExcluded);
      const amountPayable = Math.round(eligibleRevenue * (commissionPercent / 100));

      const payout = await ctx.db
        .query("doctor_payouts")
        .withIndex("by_doctor_month", (q) => q.eq("doctor_id", doc._id).eq("month", args.month))
        .first();

      summaryList.push({
        doctorId: doc._id,
        doctorName: doc.name,
        phone: doc.phone,
        commissionPercentage: commissionPercent,
        totalPrescriptions: docPrescriptions.length,
        totalRevenue,
        medicineCost,
        crownCapCost,
        xrayCost,
        consultationCost,
        bracesCost,
        prosthoImplantCost,
        totalExcluded,
        eligibleRevenue,
        amountPayable,
        payoutStatus: payout ? payout.payment_status : "PENDING",
        paidAmount: payout ? payout.paid_amount : 0,
      });
    }

    return summaryList;
  },
});

/* =========================================================================
   3. DOCTOR PAYOUT RECORDING & HISTORY
   ========================================================================= */

export const recordDoctorPayout = mutation({
  args: {
    doctor_id: v.id("doctors"),
    doctor_name: v.string(),
    month: v.string(),
    total_revenue: v.number(),
    medicine_cost: v.number(),
    crown_cap_cost: v.number(),
    xray_cost: v.number(),
    consultation_cost: v.number(),
    braces_cost: v.number(),
    prostho_implant_cost: v.optional(v.number()),
    total_excluded: v.number(),
    eligible_revenue: v.number(),
    commission_percentage: v.number(),
    payout_amount: v.number(),
    paid_amount: v.number(),
    payment_status: v.union(v.literal("PENDING"), v.literal("PARTIAL"), v.literal("PAID")),
    payment_date: v.optional(v.string()),
    payment_mode: v.optional(v.union(v.literal("Cash"), v.literal("UPI"), v.literal("Bank Transfer"), v.literal("Cheque"), v.literal("Other"))),
    transaction_reference: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("doctor_payouts")
      .withIndex("by_doctor_month", (q) => q.eq("doctor_id", args.doctor_id).eq("month", args.month))
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updated_at: now,
      });
      return existing._id;
    } else {
      return await ctx.db.insert("doctor_payouts", {
        ...args,
        created_at: now,
        updated_at: now,
      });
    }
  },
});

export const listDoctorPayouts = query({
  args: {
    doctorId: v.optional(v.id("doctors")),
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let payouts = await ctx.db.query("doctor_payouts").order("desc").collect();

    if (args.doctorId) {
      payouts = payouts.filter((p) => p.doctor_id === args.doctorId);
    }
    if (args.month && args.month !== "ALL") {
      payouts = payouts.filter((p) => p.month === args.month);
    }

    return payouts;
  },
});
