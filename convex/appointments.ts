import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getBookedSlots = query({
  args: {
    appointment_date: v.string(),
    doctor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("appointments").withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date));
    const appointments = await q.collect();
    
    // Filter out CANCELLED appointments and match doctor if provided
    return appointments
      .filter((a) => typeof a.appointment_time === "string")
      .filter(a => !args.doctor_name || a.doctor_name === args.doctor_name)
      .map(a => a.appointment_time);
  },
});

export const create = mutation({
  args: {
    full_name: v.string(),
    phone: v.string(),
    appointment_date: v.string(),
    appointment_time: v.string(),
    doctor_name: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    dental_problem: v.optional(v.string()),
    notes: v.optional(v.string()),
    is_offline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check for double booking
    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_doctor_date_time", (q) => 
        q.eq("doctor_name", args.doctor_name)
         .eq("appointment_date", args.appointment_date)
         .eq("appointment_time", args.appointment_time)
      )
      .collect();
    
    if (existing.length > 0) {
      throw new Error("This slot is already booked for this doctor.");
    }
    
    const now = Date.now();
    const appointmentId = await ctx.db.insert("appointments", {
      ...args,
      created_at: now,
      updated_at: now,
    });
    return appointmentId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    return (await ctx.db.query("appointments").order("desc").collect()).filter(
      (appointment) =>
        typeof appointment.full_name === "string" &&
        typeof appointment.phone === "string" &&
        typeof appointment.appointment_date === "string" &&
        typeof appointment.appointment_time === "string",
    );
  },
});

export const getByDate = query({
  args: { appointment_date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("appointment_date", args.appointment_date))
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const update = mutation({
  args: {
    id: v.id("appointments"),
    full_name: v.optional(v.string()),
    phone: v.optional(v.string()),
    appointment_date: v.optional(v.string()),
    appointment_time: v.optional(v.string()),
    doctor_name: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    dental_problem: v.optional(v.string()),
    status: v.optional(v.union(v.literal("PENDING"), v.literal("CONFIRMED"), v.literal("CANCELLED"), v.literal("COMPLETED"))),
    notes: v.optional(v.string()),
    reminder_note: v.optional(v.string()),
    reminder_minutes_before: v.optional(v.number()),
    is_offline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    // If we are changing date/time/doctor/status, we should check for double booking again
    if (updates.appointment_date || updates.appointment_time || updates.doctor_name || updates.status) {
      const current = await ctx.db.get(id);
      if (!current) throw new Error("Appointment not found");

      if (
        typeof current.appointment_date !== "string" ||
        typeof current.appointment_time !== "string"
      ) {
        throw new Error("This legacy appointment must be opened and saved once before it can be rescheduled.");
      }
      
      const newDate = updates.appointment_date ?? current.appointment_date;
      const newTime = updates.appointment_time ?? current.appointment_time;
      const newDoctor = updates.doctor_name ?? current.doctor_name;
      const newStatus = updates.status ?? current.status;
      
      const existing = await ctx.db
        .query("appointments")
        .withIndex("by_doctor_date_time", (q) => 
          q.eq("doctor_name", newDoctor)
           .eq("appointment_date", newDate)
           .eq("appointment_time", newTime)
        )
        .collect();
        
      if (existing.some(a => a._id !== id)) {
        throw new Error("This slot is already booked for this doctor.");
      }
    }
    
    await ctx.db.patch(id, {
      ...updates,
      updated_at: Date.now(),
    });
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
