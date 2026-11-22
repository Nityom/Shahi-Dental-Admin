import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export function to24Hour(timeStr: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const meridiem = match12[3].toUpperCase();
    if (meridiem === "AM") {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  return trimmed;
}

export function to12Hour(timeStr: string): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    const hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const meridiem = match12[3].toUpperCase();
    return `${hours}:${minutes} ${meridiem}`;
  }
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    let hours = parseInt(match24[1], 10);
    const minutes = match24[2];
    const meridiem = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${meridiem}`;
  }
  return trimmed;
}

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

/** Normalizes all appointment times to standard 12-hour format */
export const normalizeAllAppointmentTimes = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("appointments").collect();
    let updated = 0;
    for (const doc of all) {
      if (!doc.time) continue;
      const normalized = to12Hour(doc.time);
      if (normalized !== doc.time) {
        await ctx.db.patch(doc._id, {
          time: normalized,
          updated_at: Date.now(),
        });
        updated++;
      }
    }
    return { total: all.length, updated };
  },
});

export const getBookedSlots = query({
  args: {
    date: v.string(),
    doctor_name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const q = ctx.db.query("appointments").withIndex("by_date", (q) => q.eq("date", args.date));
    const appointments = await q.collect();
    
    // Filter out CANCELLED appointments and match doctor if provided
    const bookedTimes = new Set<string>();
    for (const a of appointments) {
      if (!a.time || a.status === "CANCELLED") continue;
      if (args.doctor_name && a.doctor_name && a.doctor_name !== args.doctor_name) continue;
      
      const h12 = to12Hour(a.time);
      if (h12) {
        bookedTimes.add(h12);
        const parts = h12.split(":");
        if (parts[0].length === 1) {
          bookedTimes.add(`0${h12}`);
        }
      }
      const h24 = to24Hour(a.time);
      if (h24) bookedTimes.add(h24);
    }
    return Array.from(bookedTimes);
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
    const canonicalTime = to12Hour(args.time);
    const target24 = to24Hour(args.time);

    // Check for double booking against active appointments on the same date
    const existing = await ctx.db
      .query("appointments")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .collect();
    
    const isDoubleBooked = existing.some((a) => {
      if (a.status === "CANCELLED") return false;
      if (!a.time) return false;
      if (to24Hour(a.time) !== target24) return false;
      if (!args.doctor_name || !a.doctor_name || args.doctor_name === a.doctor_name) {
        return true;
      }
      return false;
    });

    if (isDoubleBooked) {
      throw new Error("This slot is already booked for this doctor.");
    }
    
    const now = Date.now();
    const appointmentId = await ctx.db.insert("appointments", {
      ...args,
      time: canonicalTime,
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
      
      if (newStatus !== "CANCELLED" && newDate && newTime) {
        const target24 = to24Hour(newTime);
        const existing = await ctx.db
          .query("appointments")
          .withIndex("by_date", (q) => q.eq("date", newDate))
          .collect();

        const isConflict = existing.some((a) => {
          if (a._id === id) return false;
          if (a.status === "CANCELLED") return false;
          if (!a.time) return false;
          if (to24Hour(a.time) !== target24) return false;
          if (!newDoctor || !a.doctor_name || newDoctor === a.doctor_name) {
            return true;
          }
          return false;
        });

        if (isConflict) {
          throw new Error("This slot is already booked for this doctor.");
        }
      }
    }
    
    const patchPayload: Record<string, any> = {
      ...updates,
      updated_at: Date.now(),
    };
    if (updates.time) {
      patchPayload.time = to12Hour(updates.time);
    }

    await ctx.db.patch(id, patchPayload);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("appointments") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
