import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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
        await ctx.db.delete(args.id);
    },
});
