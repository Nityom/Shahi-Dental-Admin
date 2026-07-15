import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    password_hash: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    is_active: v.optional(v.boolean()),
    last_login_at: v.optional(v.number()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  }).index("by_email", ["email"]),

  auth_otp_sessions: defineTable({
    user_id: v.id("users"),
    email: v.string(),
    otp_hash: v.string(),
    expires_at: v.number(),
    attempts: v.number(),
    max_attempts: v.number(),
    used: v.boolean(),
    purpose: v.union(v.literal("login")),
    created_at: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_expires", ["expires_at"]),

  password_reset_tokens: defineTable({
    user_id: v.id("users"),
    email: v.string(),
    token_hash: v.string(),
    expires_at: v.number(),
    used: v.boolean(),
    created_at: v.number(),
  })
    .index("by_token_hash", ["token_hash"])
    .index("by_email", ["email"])
    .index("by_expires", ["expires_at"]),

  auth_sessions: defineTable({
    user_id: v.id("users"),
    session_hash: v.string(),
    expires_at: v.number(),
    revoked: v.boolean(),
    created_at: v.number(),
  })
    .index("by_session_hash", ["session_hash"])
    .index("by_expires", ["expires_at"])
    .index("by_user", ["user_id"]),

  patients: defineTable({
    reference_number: v.string(),
    name: v.string(),
    age: v.string(),
    sex: v.union(v.literal("Male"), v.literal("Female"), v.literal("Other")),
    phone_number: v.string(),
    address: v.optional(v.string()),
  })
    .index("by_phone", ["phone_number"])
    .index("by_reference", ["reference_number"]),

  prescriptions: defineTable({
    patient_name: v.string(),
    phone_number: v.string(),
    age: v.string(),
    sex: v.union(v.literal("Male"), v.literal("Female"), v.literal("Other")),
    reference_number: v.optional(v.string()),
    prescription_date: v.string(), // YYYY-MM-DD
    chief_complaint: v.optional(v.string()),
    medical_history: v.optional(v.string()),
    investigation: v.optional(v.string()),
    diagnosis: v.optional(v.string()),
    treatment_plan: v.optional(v.any()), // JSON array
    oral_exam_notes: v.optional(v.string()),
    selected_teeth: v.optional(v.any()), // JSON
    medicines: v.optional(v.any()), // JSON
    treatment_done: v.optional(v.any()), // JSON array
    advice: v.optional(v.string()),
    followup_date: v.optional(v.string()), // YYYY-MM-DD
    doctor_name: v.optional(v.string()),
  })
    .index("by_phone", ["phone_number"])
    .index("by_date", ["prescription_date"])
    .index("by_patient_name", ["patient_name"]),

  bills: defineTable({
    prescription_id: v.string(),
    patient_id: v.string(),
    reference_number: v.string(),
    bill_number: v.optional(v.string()),
    total_amount: v.number(),
    paid_amount: v.number(),
    balance_amount: v.number(),
    payment_status: v.union(v.literal("PENDING"), v.literal("PARTIAL"), v.literal("PAID")),
    items: v.any(), // JSON
    notes: v.optional(v.string()),
    discount_percent: v.optional(v.number()),
    discount_amount: v.optional(v.number()),
  })
    .index("by_prescription", ["prescription_id"])
    .index("by_patient", ["patient_id"])
    .index("by_status", ["payment_status"]),

  medicines: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    quantity: v.number(),
    rate: v.number(),
    cost_price: v.optional(v.number()),
    selling_price: v.optional(v.number()),
    company: v.optional(v.string()),
  }).index("by_name", ["name"]),

  inventory: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    quantity: v.number(),
    rate: v.number(),
    company: v.optional(v.string()),
    is_consumable: v.boolean(),
    enabled: v.optional(v.boolean()),
    deduction_qty: v.optional(v.number()),
  }).index("by_name", ["name"]),

  medicine_sales: defineTable({
    medicine_id: v.optional(v.string()),
    medicine_name: v.string(),
    company: v.optional(v.string()),
    quantity: v.number(),
    unit_price: v.number(),
    unit_cost: v.optional(v.number()),
    total_amount: v.number(),
    sale_date: v.string(), // YYYY-MM-DD
    prescription_id: v.optional(v.string()),
  })
    .index("by_medicine_name", ["medicine_name"])
    .index("by_company", ["company"])
    .index("by_sale_date", ["sale_date"]),

  inventory_sales: defineTable({
    inventory_id: v.optional(v.string()),
    inventory_name: v.string(),
    quantity: v.number(),
    rate: v.number(),
    total_amount: v.number(),
    notes: v.optional(v.string()),
    sale_date: v.string(), // YYYY-MM-DD
  }).index("by_sale_date", ["sale_date"]),

  payment_transactions: defineTable({
    bill_id: v.string(),
    patient_id: v.string(),
    amount: v.number(),
    payment_method: v.optional(v.string()),
    payment_date: v.string(), // YYYY-MM-DD
    notes: v.optional(v.string()),
    created_by: v.optional(v.string()),
  })
    .index("by_bill", ["bill_id"])
    .index("by_patient", ["patient_id"])
    .index("by_date", ["payment_date"]),

  appointments: defineTable({
    full_name: v.string(),
    phone: v.string(),
    appointment_date: v.string(), // YYYY-MM-DD
    appointment_time: v.string(), // HH:mm
    doctor_name: v.optional(v.string()),
    duration_minutes: v.optional(v.number()),
    dental_problem: v.optional(v.string()),
    status: v.optional(v.union(v.literal("PENDING"), v.literal("CONFIRMED"), v.literal("CANCELLED"), v.literal("COMPLETED"))),
    notes: v.optional(v.string()),
    reminder_note: v.optional(v.string()),
    reminder_minutes_before: v.optional(v.number()),
    is_offline: v.optional(v.boolean()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_date", ["appointment_date"])
    .index("by_phone", ["phone"])
    .index("by_doctor_date_time", ["doctor_name", "appointment_date", "appointment_time"]),

  reference_counter: defineTable({
    counter_id: v.number(), // Use 1 for the singleton
    current_number: v.number(),
  }).index("by_counter_id", ["counter_id"]),
});
