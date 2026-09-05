export type DoctorType = 'MAIN' | 'ASSISTANT';
export type DoctorStatus = 'ACTIVE' | 'INACTIVE';
export type CommissionPercentage = 2 | 5 | 7 | 10;

export interface Doctor {
  _id?: string;
  id?: string;
  name: string;
  doctor_type: DoctorType;
  commission_percentage?: number;
  phone?: string;
  email?: string;
  status: DoctorStatus;
  joining_date?: string;
  notes?: string;
  signature_url?: string;
  created_at?: number;
  updated_at?: number;
}

export interface PrescriptionRevenueBreakdown {
  prescription_id: string;
  prescription_date: string;
  patient_name: string;
  phone_number: string;
  reference_number?: string;
  total_revenue: number;
  medicine_cost: number;
  crown_cap_cost: number;
  xray_cost: number;
  consultation_cost: number;
  braces_cost: number;
  prostho_implant_cost?: number;
  total_excluded: number;
  eligible_revenue: number;
  payable_commission: number;
}

export interface DoctorMonthlyRevenue {
  doctorId?: string;
  doctorName: string;
  doctorType: DoctorType;
  isAssistant: boolean;
  commissionPercentage: number;
  month: string;
  totalPrescriptionsCount: number;
  totalRevenue: number;
  medicineCost: number;
  crownCapCost: number;
  xrayCost: number;
  consultationCost: number;
  bracesCost: number;
  prosthoImplantCost?: number;
  totalExcluded: number;
  eligibleRevenue: number;
  amountPayable: number;
  payoutRecord?: DoctorPayout | null;
  prescriptions: PrescriptionRevenueBreakdown[];
}

export interface AssistantDoctorSummary {
  doctorId: string;
  doctorName: string;
  phone?: string;
  commissionPercentage: number;
  totalPrescriptions: number;
  totalRevenue: number;
  medicineCost: number;
  crownCapCost: number;
  xrayCost: number;
  consultationCost: number;
  bracesCost: number;
  prosthoImplantCost?: number;
  totalExcluded: number;
  eligibleRevenue: number;
  amountPayable: number;
  payoutStatus: 'PENDING' | 'PARTIAL' | 'PAID';
  paidAmount: number;
}

export interface DoctorPayout {
  _id?: string;
  id?: string;
  doctor_id: string;
  doctor_name: string;
  month: string;
  total_revenue: number;
  medicine_cost: number;
  crown_cap_cost: number;
  xray_cost: number;
  consultation_cost: number;
  braces_cost: number;
  prostho_implant_cost?: number;
  total_excluded: number;
  eligible_revenue: number;
  commission_percentage: number;
  payout_amount: number;
  paid_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  payment_date?: string;
  payment_mode?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
  transaction_reference?: string;
  notes?: string;
  created_at?: number;
  updated_at?: number;
}
