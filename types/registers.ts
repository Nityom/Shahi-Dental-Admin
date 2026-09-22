export type ReviewStatus = 'Scheduled' | 'Visited' | 'Completed' | 'Missed' | 'Rescheduled';

export interface ReviewRecord {
  _id?: string;
  id?: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  review_date: string; // YYYY-MM-DD
  doctor_name?: string;
  chief_complaint_or_treatment?: string;
  findings_notes?: string;
  status: ReviewStatus;
  prescription_id?: string;
  created_at?: number;
  updated_at?: number;
}

export type RecallStatus = 'Due' | 'Contacted' | 'Scheduled' | 'Completed' | 'Dismissed';

export interface PatientRecall {
  _id?: string;
  id?: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  recall_type: string;
  due_date: string; // YYYY-MM-DD
  last_visit_date?: string;
  status: RecallStatus;
  doctor_name?: string;
  notes?: string;
  contacted_date?: string;
  created_at?: number;
  updated_at?: number;
}

export type FollowupStatus = 'Pending' | 'Called - Reached' | 'Called - No Answer' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface PatientFollowup {
  _id?: string;
  id?: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  followup_date: string; // YYYY-MM-DD
  treatment_summary?: string;
  doctor_name?: string;
  status: FollowupStatus;
  notes?: string;
  next_followup_date?: string;
  prescription_id?: string;
  created_at?: number;
  updated_at?: number;
}

export type CrownStatusCategory = 'Crown Not Required' | 'Crown Cutting' | 'Crown Received' | 'Crown Fixed';

export type CrownCuttingStatus =
  | 'Crown Not Required'
  | 'Crown Cutting'
  | 'Crown Received'
  | 'Crown Fixed'
  | 'Sent to Lab'
  | 'In Lab'
  | 'Received'
  | 'Trial Done'
  | 'Cemented / Completed'
  | 'Sent for Redo';

export interface CrownCuttingRecord {
  _id?: string;
  id?: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  tooth_numbers: string;
  crown_type?: string;
  shade?: string;
  cutting_date: string; // YYYY-MM-DD (Treatment Done / Cutting Date)
  dentist_name?: string;
  lab_name?: string;
  impression_type?: string;
  expected_delivery_date?: string;
  fixed_date?: string; // YYYY-MM-DD (Crown Fixed Date)
  lab_cost?: number;
  patient_cost?: number;
  treatment_reference?: string;
  crown_status?: CrownStatusCategory;
  status: CrownCuttingStatus;
  notes?: string;
  prescription_id?: string;
  created_at?: number;
  updated_at?: number;
}

export type CrownReceivedStatus =
  | 'Crown Not Required'
  | 'Crown Cutting'
  | 'Crown Received'
  | 'Received in Clinic'
  | 'Trial Scheduled'
  | 'Trial Done - Fit OK'
  | 'Cemented / Delivered'
  | 'Rejected / Redo Needed';

export interface CrownReceivedRecord {
  _id?: string;
  id?: string;
  crown_cutting_id?: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  tooth_numbers: string;
  crown_type?: string;
  shade?: string;
  lab_name?: string;
  cutting_date?: string;
  received_date: string; // YYYY-MM-DD
  received_by?: string;
  fitting_date?: string;
  status: CrownReceivedStatus;
  lab_bill_no?: string;
  lab_amount?: number;
  remarks?: string;
  prescription_id?: string;
  created_at?: number;
  updated_at?: number;
}

export type MaterialSubdivision = 'One-Time Material' | 'Consumable' | 'Non-Dental / Cleaning Consumable' | 'Record Maintenance Material';

export type MaterialTransactionType = 'PURCHASE' | 'USAGE' | 'INITIAL_STOCK' | 'ADJUSTMENT' | 'SCRAP';

export interface MaterialTransaction {
  _id?: string;
  id?: string;
  material_id?: string;
  material_name: string;
  subdivision: MaterialSubdivision;
  transaction_type: MaterialTransactionType;
  quantity: number;
  unit?: string;
  rate: number;
  total_cost?: number;
  vendor_name?: string;
  invoice_no?: string;
  transaction_date: string; // YYYY-MM-DD
  recorded_by?: string;
  balance_after?: number;
  notes?: string;
  created_at?: number;
}

export type StaffPaymentType = 'Salary' | 'Advance' | 'Incentive / Bonus' | 'Reimbursement' | 'Deduction';
export type StaffPaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';

export interface StaffMember {
  _id?: string;
  id?: string;
  name: string;
  role: string;
  phone?: string;
  fixed_salary: number;
  advance_balance?: number;
  total_advances_given?: number;
  total_advances_settled?: number;
  salary_paid_this_month?: number;
  advance_paid_this_month?: number;
  advance_deducted_this_month?: number;
  total_paid_this_month?: number;
  pending_salary_this_month?: number;
  payments_count?: number;
  joining_date?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  notes?: string;
  created_at?: number;
  updated_at?: number;
}

export interface StaffPaymentRecord {
  _id?: string;
  id?: string;
  staff_id?: string;
  staff_name: string;
  staff_role: string;
  staff_phone?: string;
  salary_month: string; // YYYY-MM or Month Year
  payment_date: string; // YYYY-MM-DD
  payment_type: StaffPaymentType;
  base_salary?: number;
  amount_paid: number;
  advance_deducted?: number;
  previous_payments_total?: number;
  pending_balance?: number;
  payment_mode: StaffPaymentMode;
  transaction_reference?: string;
  paid_by?: string;
  notes?: string;
  created_at?: number;
}

export type InvestigationType = 'OPG' | 'IOPAR' | 'CBCT' | 'Lateral Ceph' | 'Blood Test' | 'Other';

export interface InvestigationRecord {
  _id?: string;
  id?: string;
  patient_id?: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  prescription_id?: string;
  investigation_type: string;
  investigation_date: string; // YYYY-MM-DD
  doctor_name?: string;
  technician_name?: string;
  indication?: string;
  findings?: string;
  film_type?: 'Digital' | 'Printed Film' | 'Both';
  cost?: number;
  payment_status?: 'PAID' | 'PENDING' | 'INCLUDED_IN_TREATMENT';
  notes?: string;
  created_at?: number;
}
