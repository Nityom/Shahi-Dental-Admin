export type StockistPaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
export type StockistPaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export interface Stockist {
  _id?: string;
  id?: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  gst_number?: string;
  drug_license_no?: string;
  notes?: string;
  total_billed?: number;
  total_paid?: number;
  total_balance?: number;
  bills_count?: number;
  open_bills_count?: number;
  created_at?: number;
  updated_at?: number;
}

export interface StockistBillItem {
  medicine_name: string;
  quantity: number;
  pack_type?: string; // e.g. "Strips", "Box", "Vial", "Bottle"
  batch_no?: string;
  expiry_date?: string; // YYYY-MM
  rate: number;
  amount: number;
}

export interface StockistBill {
  _id?: string;
  id?: string;
  stockist_id?: string;
  stockist_name: string;
  bill_number: string;
  bill_date: string; // YYYY-MM-DD
  due_date?: string; // YYYY-MM-DD
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: StockistPaymentStatus;
  items?: StockistBillItem[];
  has_physical_copy?: boolean;
  physical_copy_notes?: string;
  notes?: string;
  payments?: StockistPayment[];
  created_at?: number;
  updated_at?: number;
}

export interface StockistPayment {
  _id?: string;
  id?: string;
  stockist_bill_id: string;
  stockist_id?: string;
  stockist_name: string;
  bill_number: string;
  payment_date: string; // YYYY-MM-DD
  amount: number;
  payment_mode: StockistPaymentMode;
  transaction_reference?: string;
  noted_on_physical_copy?: boolean;
  collected_by?: string;
  paid_by?: string;
  notes?: string;
  created_at?: number;
}

export interface StockistDashboardSummary {
  stockists_count: number;
  total_bills_count: number;
  total_billed: number;
  total_paid: number;
  total_balance: number;
  pending_bills_count: number;
  partial_bills_count: number;
  fully_paid_bills_count: number;
  total_payments_count: number;
}
