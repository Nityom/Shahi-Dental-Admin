import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Helper to check if a text contains RCT or Crown keywords
 */
export function isRctOrCrownTreatment(text: string): boolean {
    if (!text) return false;
    const s = text.toLowerCase();
    return (
        s.includes("rct") ||
        s.includes("r.c.t") ||
        s.includes("root canal") ||
        s.includes("crown") ||
        s.includes("cap") ||
        s.includes("fixed") ||
        s.includes("cementation") ||
        s.includes("cemented") ||
        s.includes("fitting") ||
        s.includes("endodontic") ||
        s.includes("endo") ||
        s.includes("pulpectomy") ||
        s.includes("pulpotomy") ||
        s.includes("bmp") ||
        s.includes("obturation") ||
        s.includes("access opening") ||
        s.includes("zirconia") ||
        s.includes("pfm") ||
        s.includes("emax") ||
        s.includes("e-max") ||
        s.includes("cutting") ||
        s.includes("bridge") ||
        s.includes("ceramic") ||
        s.includes("metal") ||
        s.includes("facing") ||
        s.includes("post & core") ||
        s.includes("post and core")
    );
}

/**
 * Helper to extract tooth numbers from selected_teeth, treatment description, or diagnosis
 */
export function extractTeeth(selectedTeeth: any, treatmentDesc?: string, diagnosis?: string, chiefComplaint?: string): string {
    const teethFound: string[] = [];

    if (selectedTeeth) {
        try {
            const teeth = typeof selectedTeeth === "string" ? JSON.parse(selectedTeeth) : selectedTeeth;
            if (Array.isArray(teeth)) {
                teeth.forEach((t: any) => {
                    if (t.id !== undefined && t.id !== null) teethFound.push(String(t.id));
                    else if (t.tooth !== undefined) teethFound.push(String(t.tooth));
                    else if (typeof t === "number" || typeof t === "string") teethFound.push(String(t));
                });
            }
        } catch {
            // fallback
        }
    }

    const scanForNumbers = (str?: string) => {
        if (!str) return;
        const matches = str.match(/(?:wrt|#|tooth|teeth|no\.?)\s*([0-9A-E,\s/]+)/i);
        if (matches && matches[1]) {
            const parts = matches[1].split(/[,/\s]+/).filter((p) => p.trim() && /^[0-9A-E]+$/i.test(p.trim()));
            parts.forEach((p) => {
                if (!teethFound.includes(p)) teethFound.push(p);
            });
        }
        if (teethFound.length === 0) {
            const fdiMatches = str.match(/\b([1-4][1-8])\b/g);
            if (fdiMatches) {
                fdiMatches.forEach((num) => {
                    if (!teethFound.includes(num)) teethFound.push(num);
                });
            }
        }
    };

    scanForNumbers(treatmentDesc);
    scanForNumbers(diagnosis);
    scanForNumbers(chiefComplaint);

    return teethFound.length > 0 ? teethFound.join(", ") : "16";
}

/**
 * Helper to process a prescription and return crown details if applicable
 */
function extractCrownInfoFromPrescription(rx: any): { isCrown: boolean; isFixed: boolean; toothStr: string; cost: number; ref: string; crownType: string } {
    let treatments: any[] = [];
    if (rx.treatment_done) {
        treatments = typeof rx.treatment_done === "string" ? JSON.parse(rx.treatment_done) : rx.treatment_done;
    }
    if (!Array.isArray(treatments)) treatments = [];

    let planItems: any[] = [];
    if (rx.treatment_plan) {
        planItems = typeof rx.treatment_plan === "string" ? JSON.parse(rx.treatment_plan) : rx.treatment_plan;
    }
    if (!Array.isArray(planItems)) planItems = [];

    // Find any RCT or Crown item in treatment_done
    const rctOrCrownDone = treatments.filter((t: any) => isRctOrCrownTreatment((t.description || t.name || "").toString()));
    // Find any RCT or Crown item in treatment_plan
    const rctOrCrownPlan = planItems.filter((t: any) => isRctOrCrownTreatment(typeof t === "string" ? t : (t.name || t.description || "").toString()));

    const diagMatch = isRctOrCrownTreatment(rx.diagnosis || "");
    const ccMatch = isRctOrCrownTreatment(rx.chief_complaint || "");

    const isCrown = rctOrCrownDone.length > 0 || rctOrCrownPlan.length > 0 || diagMatch || ccMatch;
    if (!isCrown) {
        return { isCrown: false, isFixed: false, toothStr: "", cost: 0, ref: "", crownType: "Zirconia" };
    }

    // Check if specifically Crown Fixed / Cemented
    const isFixed = treatments.some((t: any) => {
        const desc = (t.description || t.name || "").toString().toLowerCase();
        return (desc.includes("crown") && (desc.includes("fix") || desc.includes("cement") || desc.includes("fitting"))) || desc.includes("crown fixed") || desc.includes("crown cementation");
    }) || (rx.diagnosis && rx.diagnosis.toLowerCase().includes("crown fixed"));

    // Determine primary description
    let primaryDesc = "";
    if (rctOrCrownDone.length > 0) {
        primaryDesc = (rctOrCrownDone[0].description || rctOrCrownDone[0].name || "RCT");
    } else if (rctOrCrownPlan.length > 0) {
        const item = rctOrCrownPlan[0];
        primaryDesc = typeof item === "string" ? item : (item.name || item.description || "RCT");
    } else {
        primaryDesc = rx.diagnosis || rx.chief_complaint || "RCT / Root Canal";
    }

    const toothStr = extractTeeth(rx.selected_teeth, primaryDesc, rx.diagnosis, rx.chief_complaint);

    // Sum all matching RCT / Crown treatment amounts
    let cost = 0;
    for (const t of rctOrCrownDone) {
        const itemTotal = Number(t.total ?? (Number(t.quantity || 1) * Number(t.unit_price || t.price || 0))) || 0;
        cost += itemTotal;
    }
    if (cost === 0) {
        for (const p of rctOrCrownPlan) {
            if (typeof p === "object") {
                cost += Number(p.cost || p.total || p.price) || 0;
            }
        }
    }
    // If still 0 and only 1 treatment done exists, take that
    if (cost === 0 && treatments.length === 1 && treatments[0].total) {
        cost = Number(treatments[0].total) || 0;
    }

    let crownType = "Zirconia";
    const lowerDesc = primaryDesc.toLowerCase();
    if (lowerDesc.includes("pfm")) crownType = "PFM";
    else if (lowerDesc.includes("emax") || lowerDesc.includes("e-max")) crownType = "E-Max";
    else if (lowerDesc.includes("ceramic")) crownType = "Ceramic";
    else if (lowerDesc.includes("metal")) crownType = "Metal";

    let cleanRef = primaryDesc.trim();
    if (!cleanRef.toLowerCase().includes("rct") && !cleanRef.toLowerCase().includes("crown") && !cleanRef.toLowerCase().includes("root canal")) {
        cleanRef = `RCT / ${cleanRef}`;
    }

    return {
        isCrown: true,
        isFixed,
        toothStr,
        cost,
        ref: cleanRef,
        crownType,
    };
}

export const create = mutation({
    args: {
        patient_name: v.string(),
        phone_number: v.string(),
        age: v.string(),
        sex: v.union(v.literal("Male"), v.literal("Female"), v.literal("Other")),
        reference_number: v.optional(v.string()),
        prescription_date: v.string(),
        chief_complaint: v.optional(v.string()),
        medical_history: v.optional(v.string()),
        investigation: v.optional(v.string()),
        diagnosis: v.optional(v.string()),
        treatment_plan: v.optional(v.any()), // JSON
        oral_exam_notes: v.optional(v.string()),
        selected_teeth: v.optional(v.any()), // JSON
        medicines: v.optional(v.any()), // JSON
        treatment_done: v.optional(v.any()), // JSON
        advice: v.optional(v.string()),
        followup_date: v.optional(v.string()),
        doctor_name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const newPrescriptionId = await ctx.db.insert("prescriptions", args);

        // Auto-sync Crown Record for RCT or Crown
        try {
            const crownInfo = extractCrownInfoFromPrescription(args);
            if (crownInfo.isCrown) {
                const now = Date.now();

                // If isFixed, check if patient has an existing crown record
                let existingCrown = null;
                if (crownInfo.isFixed) {
                    if (args.reference_number) {
                        existingCrown = await ctx.db
                            .query("crown_cutting_register")
                            .withIndex("by_reference", (q) => q.eq("reference_number", args.reference_number))
                            .first();
                    }
                    if (!existingCrown && args.phone_number) {
                        existingCrown = await ctx.db
                            .query("crown_cutting_register")
                            .withIndex("by_phone", (q) => q.eq("phone_number", args.phone_number))
                            .first();
                    }
                }

                if (existingCrown) {
                    await ctx.db.patch(existingCrown._id, {
                        crown_status: "Crown Fixed",
                        status: "Crown Fixed",
                        fixed_date: args.prescription_date,
                        updated_at: now,
                    });
                } else {
                    await ctx.db.insert("crown_cutting_register", {
                        patient_name: args.patient_name,
                        phone_number: args.phone_number,
                        reference_number: args.reference_number,
                        tooth_numbers: crownInfo.toothStr,
                        crown_type: crownInfo.crownType,
                        cutting_date: args.prescription_date,
                        fixed_date: crownInfo.isFixed ? args.prescription_date : undefined,
                        dentist_name: args.doctor_name || "Dr. Kautilya Swaroop",
                        lab_name: "Dental Lab",
                        treatment_reference: crownInfo.ref,
                        crown_status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        patient_cost: crownInfo.cost,
                        prescription_id: newPrescriptionId,
                        created_at: now,
                        updated_at: now,
                    });
                }
            }
        } catch (err) {
            console.error("Auto crown record creation error:", err);
        }

        return newPrescriptionId;
    },
});

export const getById = query({
    args: { id: v.id("prescriptions") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

export const update = mutation({
    args: {
        id: v.id("prescriptions"),
        patient_name: v.optional(v.string()),
        phone_number: v.optional(v.string()),
        age: v.optional(v.string()),
        sex: v.optional(v.union(v.literal("Male"), v.literal("Female"), v.literal("Other"))),
        reference_number: v.optional(v.string()),
        prescription_date: v.optional(v.string()),
        chief_complaint: v.optional(v.string()),
        medical_history: v.optional(v.string()),
        investigation: v.optional(v.string()),
        diagnosis: v.optional(v.string()),
        treatment_plan: v.optional(v.any()), // JSON
        oral_exam_notes: v.optional(v.string()),
        selected_teeth: v.optional(v.any()), // JSON
        medicines: v.optional(v.any()), // JSON
        treatment_done: v.optional(v.any()), // JSON
        advice: v.optional(v.string()),
        followup_date: v.optional(v.string()),
        doctor_name: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);

        // Fetch full merged prescription
        const rx = await ctx.db.get(id);
        if (rx) {
            try {
                const crownInfo = extractCrownInfoFromPrescription(rx);
                const existingCrown = await ctx.db
                    .query("crown_cutting_register")
                    .withIndex("by_prescription", (q) => q.eq("prescription_id", id))
                    .first();

                const now = Date.now();
                if (crownInfo.isCrown) {
                    if (existingCrown) {
                        await ctx.db.patch(existingCrown._id, {
                            patient_name: rx.patient_name,
                            phone_number: rx.phone_number,
                            reference_number: rx.reference_number,
                            tooth_numbers: crownInfo.toothStr || existingCrown.tooth_numbers,
                            cutting_date: existingCrown.cutting_date || rx.prescription_date,
                            dentist_name: rx.doctor_name || existingCrown.dentist_name,
                            patient_cost: crownInfo.cost > 0 ? crownInfo.cost : existingCrown.patient_cost,
                            treatment_reference: crownInfo.ref,
                            ...(crownInfo.isFixed ? {
                                crown_status: "Crown Fixed",
                                status: "Crown Fixed",
                                fixed_date: rx.prescription_date,
                            } : {}),
                            updated_at: now,
                        });
                    } else {
                        // Check if patient already has crown cutting record by reference or phone
                        let patientCrown = null;
                        if (rx.reference_number) {
                            patientCrown = await ctx.db
                                .query("crown_cutting_register")
                                .withIndex("by_reference", (q) => q.eq("reference_number", rx.reference_number))
                                .first();
                        }
                        if (!patientCrown && rx.phone_number) {
                            patientCrown = await ctx.db
                                .query("crown_cutting_register")
                                .withIndex("by_phone", (q) => q.eq("phone_number", rx.phone_number))
                                .first();
                        }

                        if (patientCrown && crownInfo.isFixed) {
                            await ctx.db.patch(patientCrown._id, {
                                crown_status: "Crown Fixed",
                                status: "Crown Fixed",
                                fixed_date: rx.prescription_date,
                                updated_at: now,
                            });
                        } else {
                            await ctx.db.insert("crown_cutting_register", {
                                patient_name: rx.patient_name,
                                phone_number: rx.phone_number,
                                reference_number: rx.reference_number,
                                tooth_numbers: crownInfo.toothStr,
                                crown_type: crownInfo.crownType,
                                cutting_date: rx.prescription_date,
                                fixed_date: crownInfo.isFixed ? rx.prescription_date : undefined,
                                dentist_name: rx.doctor_name || "Dr. Kautilya Swaroop",
                                lab_name: "Dental Lab",
                                treatment_reference: crownInfo.ref,
                                crown_status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                                status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                                patient_cost: crownInfo.cost,
                                prescription_id: id,
                                created_at: now,
                                updated_at: now,
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Auto crown record sync error on update:", err);
            }
        }

        return await ctx.db.get(id);
    },
});

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("prescriptions").order("desc").collect();
    },
});

export const listByPatient = query({
    args: { reference_number: v.string() },
    handler: async (ctx, args) => {
        const prescriptions = await ctx.db.query("prescriptions").order("desc").collect();
        return prescriptions.filter((p) => p.reference_number === args.reference_number);
    },
});

export const getLatestByPhone = query({
    args: { phone_number: v.string() },
    handler: async (ctx, args) => {
        const prescriptions = await ctx.db.query("prescriptions").order("desc").collect();
        return prescriptions.find((p) => p.phone_number === args.phone_number) || null;
    },
});

export const remove = mutation({
    args: { id: v.id("prescriptions") },
    handler: async (ctx, args) => {
        // Delete linked crown records if any
        const linkedCrowns = await ctx.db
            .query("crown_cutting_register")
            .withIndex("by_prescription", (q) => q.eq("prescription_id", args.id))
            .collect();
        for (const c of linkedCrowns) {
            await ctx.db.delete(c._id);
        }

        await ctx.db.delete(args.id);
    },
});

/**
 * Mutation to scan all historical prescriptions and backfill/sync crown records for RCT or Crown
 */
export const syncAllPrescriptionsToCrownRegister = mutation({
    args: {},
    handler: async (ctx) => {
        const prescriptions = await ctx.db.query("prescriptions").collect();
        let syncedCount = 0;

        for (const rx of prescriptions) {
            const crownInfo = extractCrownInfoFromPrescription(rx);
            if (crownInfo.isCrown) {
                const existing = await ctx.db
                    .query("crown_cutting_register")
                    .withIndex("by_prescription", (q) => q.eq("prescription_id", rx._id))
                    .first();

                const now = Date.now();
                if (!existing) {
                    await ctx.db.insert("crown_cutting_register", {
                        patient_name: rx.patient_name,
                        phone_number: rx.phone_number,
                        reference_number: rx.reference_number,
                        tooth_numbers: crownInfo.toothStr,
                        crown_type: crownInfo.crownType,
                        cutting_date: rx.prescription_date,
                        fixed_date: crownInfo.isFixed ? rx.prescription_date : undefined,
                        dentist_name: rx.doctor_name || "Dr. Kautilya Swaroop",
                        lab_name: "Dental Lab",
                        treatment_reference: crownInfo.ref,
                        crown_status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        status: crownInfo.isFixed ? "Crown Fixed" : "Crown Cutting",
                        patient_cost: crownInfo.cost,
                        prescription_id: rx._id,
                        created_at: now,
                        updated_at: now,
                    });
                    syncedCount++;
                } else {
                    // Update patient_cost and info if missing or 0
                    await ctx.db.patch(existing._id, {
                        patient_name: rx.patient_name,
                        phone_number: rx.phone_number,
                        reference_number: rx.reference_number,
                        tooth_numbers: existing.tooth_numbers || crownInfo.toothStr,
                        patient_cost: (existing.patient_cost && existing.patient_cost > 0) ? existing.patient_cost : crownInfo.cost,
                        treatment_reference: existing.treatment_reference || crownInfo.ref,
                        ...(crownInfo.isFixed ? {
                            crown_status: "Crown Fixed",
                            status: "Crown Fixed",
                            fixed_date: rx.prescription_date,
                        } : {}),
                        updated_at: now,
                    });
                }
            }
        }

        return { success: true, syncedCount };
    },
});
