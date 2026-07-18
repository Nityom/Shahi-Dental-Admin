import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/** One-time migration – run via: npx convex run appointments:migrateFields */
export const migrateFields = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("appointments").collect();
    let migrated = 0;
    for (const doc of all) {
      const raw = doc as Record<string, unknown>;
      const hasLegacy =
        "appointment_date" in raw ||
        "appointment_time" in raw ||
        "full_name" in raw ||
        "dentalProblem" in raw;
      if (!hasLegacy) continue;
      await ctx.db.replace(doc._id, {
        name: (raw.name ?? raw.full_name ?? undefined) as string | undefined,
        phone: (raw.phone ?? undefined) as string | undefined,
        date: (raw.date ?? raw.appointment_date ?? undefined) as string | undefined,
        time: (raw.time ?? raw.appointment_time ?? undefined) as string | undefined,
        doctor_name: (raw.doctor_name ?? undefined) as string | undefined,
        duration_minutes: (raw.duration_minutes ?? undefined) as number | undefined,
        dental_problem: (raw.dental_problem ?? raw.dentalProblem ?? undefined) as string | undefined,
        status: (raw.status ?? undefined) as "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | undefined,
        notes: (raw.notes ?? undefined) as string | undefined,
        reminder_note: (raw.reminder_note ?? undefined) as string | undefined,
        reminder_minutes_before: (raw.reminder_minutes_before ?? undefined) as number | undefined,
        is_offline: (raw.is_offline ?? undefined) as boolean | undefined,
        created_at: (raw.created_at ?? undefined) as number | undefined,
        updated_at: (raw.updated_at ?? Date.now()) as number | undefined,
      });
      migrated++;
    }
    return { migrated };
  },
});

export const getBookedSlots = query({
  args: {
    date: v.string(),
    doctor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("appointments").withIndex("by_date", (q) => q.eq("date", args.date));
    const appointments = await q.collect();
    
    // Filter out CANCELLED appointments and match doctor if provided
    return appointments
      .filter((a) => typeof a.time === "string")
      .filter(a => !args.doctor_name || a.doctor_name === args.doctor_name)
      .map(a => a.time);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    date: v.string(),
    time: v.string(),
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
         .eq("date", args.date)
         .eq("time", args.time)
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
        typeof appointment.name === "string" &&
        typeof appointment.phone === "string" &&
        typeof appointment.date === "string" &&
        typeof appointment.time === "string",
    );
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
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
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
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
    if (updates.date || updates.time || updates.doctor_name || updates.status) {
      const current = await ctx.db.get(id);
      if (!current) throw new Error("Appointment not found");

      if (
        typeof current.date !== "string" ||
        typeof current.time !== "string"
      ) {
        throw new Error("This legacy appointment must be opened and saved once before it can be rescheduled.");
      }
      
      const newDate = updates.date ?? current.date;
      const newTime = updates.time ?? current.time;
      const newDoctor = updates.doctor_name ?? current.doctor_name;
      const newStatus = updates.status ?? current.status;
      
      const existing = await ctx.db
        .query("appointments")
        .withIndex("by_doctor_date_time", (q) => 
          q.eq("doctor_name", newDoctor)
           .eq("date", newDate)
           .eq("time", newTime)
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
