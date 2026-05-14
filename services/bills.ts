import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export type Bill = {
  id?: string;
  prescription_id: string;
  patient_id: string;
  reference_number: string;
  bill_number?: string;
  bill_date?: string;
  total_amount: number;
  paid_amount: number;
  balance_amount?: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  payment_method?: string;
  discount_percent?: number;
  discount_amount?: number;
  items: any[];
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient_name?: string;
  phone_number?: string;
};

const validateBillData = (bill: Bill) => {
  const errors: string[] = [];

  if (!bill.prescription_id) errors.push('Prescription ID is required');
  if (!bill.patient_id) errors.push('Patient ID is required');
  if (!bill.reference_number) errors.push('Reference number is required');
  if (typeof bill.total_amount !== 'number' || bill.total_amount < 0) {
    errors.push('Total amount must be a non-negative number');
  }
  if (typeof bill.paid_amount !== 'number' || bill.paid_amount < 0) {
    errors.push('Paid amount must be a non-negative number');
  }
  if (!Array.isArray(bill.items)) {
    errors.push('Bill items must be an array');
  }
  if (bill.paid_amount > bill.total_amount) {
    errors.push('Paid amount cannot exceed total amount');
  }

  return errors;
};

export const createBill = async (bill: Bill) => {
  try {
    const validationErrors = validateBillData(bill);
    if (validationErrors.length > 0) {
      throw new Error(`Invalid bill data: ${validationErrors.join(', ')}`);
    }

    const billData = {
      prescription_id: String(bill.prescription_id),
      patient_id: String(bill.patient_id),
      reference_number: String(bill.reference_number),
      total_amount: Number(bill.total_amount),
      paid_amount: Number(bill.paid_amount),
      items: bill.items,
      notes: bill.notes,
    };

    const result = await convex.mutation(api.bills.create, billData);
    const newBillId = result.id;
    const bill_number = result.bill_number;
    return { ...bill, id: newBillId, bill_number } as Bill;
  } catch (e) {
    console.error('Exception in createBill:', e);
    throw e;
  }
};

export const updateBill = async (id: string, bill: Partial<Bill>) => {
  try {
    // Only pass fields accepted by the Convex bills.update mutation
    const validUpdate: Record<string, any> = { id: id as any };
    if (bill.total_amount !== undefined) validUpdate.total_amount = bill.total_amount;
    if (bill.paid_amount !== undefined) validUpdate.paid_amount = bill.paid_amount;
    if (bill.balance_amount !== undefined) validUpdate.balance_amount = bill.balance_amount;
    if (bill.items !== undefined) validUpdate.items = bill.items;
    if (bill.notes !== undefined) validUpdate.notes = bill.notes;
    if (bill.payment_status !== undefined) validUpdate.payment_status = bill.payment_status;
    if (bill.discount_percent !== undefined) validUpdate.discount_percent = bill.discount_percent;
    if (bill.discount_amount !== undefined) validUpdate.discount_amount = bill.discount_amount;

    const data = await convex.mutation(api.bills.update, validUpdate as any);
    return { ...data, id: data?._id } as any as Bill;
  } catch (e) {
    console.error('Exception in updateBill:', e);
    throw e;
  }
};

export const getBillByPrescriptionId = async (prescriptionId: string) => {
  try {
    if (!prescriptionId || typeof prescriptionId !== 'string') {
      throw new Error('Invalid prescription ID provided');
    }

    const data = await convex.query(api.bills.getByPrescriptionId, { prescription_id: prescriptionId });
    return data ? { ...data, id: data._id } as any as Bill : null;
  } catch (e) {
    console.error('Exception in getBillByPrescriptionId:', e);
    throw e;
  }
};

export const getPatientByReferenceNumber = async (referenceNumber: string) => {
  if (!referenceNumber || typeof referenceNumber !== 'string' || !referenceNumber.trim()) {
    throw new Error('Valid reference number is required');
  }

  try {
    const data = await convex.query(api.patients.getByReference, { reference_number: referenceNumber.trim() });

    if (!data || !data._id) {
      throw new Error(`No patient found with reference number "${referenceNumber}"`);
    }

    return { ...data, id: data._id };
  } catch (error) {
    console.error('Error fetching patient:', error);
    throw new Error('Failed to fetch patient data');
  }
};

export const getAll = async () => {
  try {
    const data = await convex.query(api.bills.list);
    return data.map((b: any) => ({ ...b, id: b._id })) as any as Bill[];
  } catch (e) {
    console.error('Exception in getAll bills:', e);
    throw e;
  }
};

export const billService = {
  create: createBill,
  update: updateBill,
  getByPrescriptionId: getBillByPrescriptionId,
  getAll: getAll,
};

