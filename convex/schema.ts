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
    low_stock_threshold: v.optional(v.number()),
    strips: v.optional(v.number()),
    quantity_per_strip: v.optional(v.number()),
  }).index("by_name", ["name"]),

  inventory: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    quantity: v.number(),
    rate: v.number(),
    company: v.optional(v.string()),
    is_consumable: v.boolean(),
    subdivision: v.optional(v.union(
      v.literal("One-Time Material"),
      v.literal("Consumable"),
      v.literal("Non-Dental / Cleaning Consumable"),
      v.literal("Record Maintenance Material")
    )),
    unit: v.optional(v.string()),
    min_stock_level: v.optional(v.number()),
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
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    date: v.optional(v.string()), // YYYY-MM-DD
    time: v.optional(v.string()), // HH:mm
    // legacy field – kept temporarily for migration
    dentalProblem: v.optional(v.string()),
    full_name: v.optional(v.string()),
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
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_date", ["date"])
    .index("by_phone", ["phone"])
    .index("by_doctor_date_time", ["doctor_name", "date", "time"]),

  reference_counter: defineTable({
    counter_id: v.number(), // Use 1 for the singleton
    current_number: v.number(),
  }).index("by_counter_id", ["counter_id"]),

  review_register: defineTable({
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    review_date: v.string(), // YYYY-MM-DD
    doctor_name: v.optional(v.string()),
    chief_complaint_or_treatment: v.optional(v.string()),
    findings_notes: v.optional(v.string()),
    status: v.union(v.literal("Scheduled"), v.literal("Visited"), v.literal("Completed"), v.literal("Missed"), v.literal("Rescheduled")),
    prescription_id: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_date", ["review_date"])
    .index("by_phone", ["phone_number"])
    .index("by_status", ["status"])
    .index("by_reference", ["reference_number"]),

  patient_recalls: defineTable({
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    recall_type: v.string(), // e.g. "6-Month Checkup", "Scaling/Cleaning Recall", "Post-RCT Review", "Crown Evaluation"
    due_date: v.string(), // YYYY-MM-DD
    last_visit_date: v.optional(v.string()),
    status: v.union(v.literal("Due"), v.literal("Contacted"), v.literal("Scheduled"), v.literal("Completed"), v.literal("Dismissed")),
    doctor_name: v.optional(v.string()),
    notes: v.optional(v.string()),
    contacted_date: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_due_date", ["due_date"])
    .index("by_phone", ["phone_number"])
    .index("by_status", ["status"]),

  patient_followups: defineTable({
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    followup_date: v.string(), // YYYY-MM-DD
    treatment_summary: v.optional(v.string()),
    doctor_name: v.optional(v.string()),
    status: v.union(v.literal("Pending"), v.literal("Called - Reached"), v.literal("Called - No Answer"), v.literal("Confirmed"), v.literal("Completed"), v.literal("Cancelled")),
    notes: v.optional(v.string()),
    next_followup_date: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_followup_date", ["followup_date"])
    .index("by_phone", ["phone_number"])
    .index("by_status", ["status"]),

  crown_cutting_register: defineTable({
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    tooth_numbers: v.string(), // e.g. "16, 17"
    crown_type: v.optional(v.string()), // "PFM", "Zirconia", "E-Max", "Full Metal", "Monolithic Zirconia", "Temporary", etc.
    shade: v.optional(v.string()), // "A2", "A3.5", etc.
    cutting_date: v.string(), // YYYY-MM-DD
    dentist_name: v.optional(v.string()),
    lab_name: v.optional(v.string()),
    impression_type: v.optional(v.string()),
    expected_delivery_date: v.optional(v.string()),
    lab_cost: v.optional(v.number()),
    patient_cost: v.optional(v.number()),
    treatment_reference: v.optional(v.string()),
    crown_status: v.optional(v.union(
      v.literal("Crown Not Required"),
      v.literal("Crown Cutting"),
      v.literal("Crown Received")
    )),
    status: v.union(
      v.literal("Sent to Lab"),
      v.literal("In Lab"),
      v.literal("Received"),
      v.literal("Trial Done"),
      v.literal("Cemented / Completed"),
      v.literal("Sent for Redo"),
      v.literal("Crown Not Required"),
      v.literal("Crown Cutting"),
      v.literal("Crown Received")
    ),
    notes: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_cutting_date", ["cutting_date"])
    .index("by_lab", ["lab_name"])
    .index("by_status", ["status"])
    .index("by_phone", ["phone_number"])
    .index("by_prescription", ["prescription_id"]),

  crown_received_register: defineTable({
    crown_cutting_id: v.optional(v.id("crown_cutting_register")),
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    tooth_numbers: v.string(),
    crown_type: v.optional(v.string()),
    shade: v.optional(v.string()),
    lab_name: v.optional(v.string()),
    cutting_date: v.optional(v.string()),
    received_date: v.string(), // YYYY-MM-DD
    received_by: v.optional(v.string()),
    fitting_date: v.optional(v.string()),
    status: v.union(
      v.literal("Received in Clinic"),
      v.literal("Trial Scheduled"),
      v.literal("Trial Done - Fit OK"),
      v.literal("Cemented / Delivered"),
      v.literal("Rejected / Redo Needed"),
      v.literal("Crown Not Required"),
      v.literal("Crown Cutting"),
      v.literal("Crown Received")
    ),
    lab_bill_no: v.optional(v.string()),
    lab_amount: v.optional(v.number()),
    remarks: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_received_date", ["received_date"])
    .index("by_lab", ["lab_name"])
    .index("by_status", ["status"])
    .index("by_crown_cutting", ["crown_cutting_id"]),

  material_transactions: defineTable({
    material_id: v.optional(v.id("inventory")),
    material_name: v.string(),
    subdivision: v.union(
      v.literal("One-Time Material"),
      v.literal("Consumable"),
      v.literal("Non-Dental / Cleaning Consumable"),
      v.literal("Record Maintenance Material")
    ),
    transaction_type: v.union(
      v.literal("PURCHASE"),
      v.literal("USAGE"),
      v.literal("INITIAL_STOCK"),
      v.literal("ADJUSTMENT"),
      v.literal("SCRAP")
    ),
    quantity: v.number(),
    unit: v.optional(v.string()),
    rate: v.number(),
    total_cost: v.number(),
    vendor_name: v.optional(v.string()),
    invoice_no: v.optional(v.string()),
    transaction_date: v.string(), // YYYY-MM-DD
    recorded_by: v.optional(v.string()),
    balance_after: v.optional(v.number()),
    notes: v.optional(v.string()),
    created_at: v.optional(v.number()),
  })
    .index("by_date", ["transaction_date"])
    .index("by_subdivision", ["subdivision"])
    .index("by_type", ["transaction_type"])
    .index("by_material", ["material_id"]),

  staff_payments: defineTable({
    staff_name: v.string(),
    staff_role: v.string(), // "Dental Assistant", "Receptionist", "Associate Dentist", "Clinic Staff", etc.
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
    created_at: v.optional(v.number()),
  })
    .index("by_staff_name", ["staff_name"])
    .index("by_payment_date", ["payment_date"])
    .index("by_month", ["salary_month"])
    .index("by_payment_type", ["payment_type"]),

  investigations: defineTable({
    patient_id: v.optional(v.string()),
    patient_name: v.string(),
    phone_number: v.string(),
    reference_number: v.optional(v.string()),
    prescription_id: v.optional(v.string()),
    investigation_type: v.string(), // "OPG", "IOPAR", "CBCT", "Lateral Ceph", "Blood Test", etc.
    investigation_date: v.string(), // YYYY-MM-DD
    doctor_name: v.optional(v.string()),
    technician_name: v.optional(v.string()),
    indication: v.optional(v.string()), // e.g. "Impaction", "Ortho Planning", "Pathology", "Full Mouth"
    findings: v.optional(v.string()),
    film_type: v.optional(v.union(v.literal("Digital"), v.literal("Printed Film"), v.literal("Both"))),
    cost: v.optional(v.number()),
    payment_status: v.optional(v.union(v.literal("PAID"), v.literal("PENDING"), v.literal("INCLUDED_IN_TREATMENT"))),
    notes: v.optional(v.string()),
    created_at: v.optional(v.number()),
  })
    .index("by_date", ["investigation_date"])
    .index("by_type_date", ["investigation_type", "investigation_date"])
    .index("by_phone", ["phone_number"])
    .index("by_reference", ["reference_number"]),

  doctors: defineTable({
    name: v.string(),
    doctor_type: v.union(v.literal("MAIN"), v.literal("ASSISTANT")),
    commission_percentage: v.optional(v.number()), // 2, 5, 7, 10
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    status: v.union(v.literal("ACTIVE"), v.literal("INACTIVE")),
    joining_date: v.optional(v.string()), // YYYY-MM-DD
    notes: v.optional(v.string()),
    signature_url: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_type", ["doctor_type"])
    .index("by_name", ["name"]),

  doctor_payouts: defineTable({
    doctor_id: v.id("doctors"),
    doctor_name: v.string(),
    month: v.string(), // YYYY-MM
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
    payment_date: v.optional(v.string()), // YYYY-MM-DD
    payment_mode: v.optional(v.union(v.literal("Cash"), v.literal("UPI"), v.literal("Bank Transfer"), v.literal("Cheque"), v.literal("Other"))),
    transaction_reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    created_at: v.optional(v.number()),
    updated_at: v.optional(v.number()),
  })
    .index("by_doctor", ["doctor_id"])
    .index("by_month", ["month"])
    .index("by_doctor_month", ["doctor_id", "month"]),
});
