// services/prescription.ts
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export interface MedicineEntry {
  name: string;
  dosage: string;
  duration: string;
  quantity?: number;
}

export interface ToothData {
  id: number;
  type: string;
  category: string;
  disease?: string;
}

export interface Bill {
  id: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
}

export interface TreatmentItem {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Prescription {
  id?: string;
  patient_name: string;
  phone_number: string;
  age: string;
  sex: string;
  prescription_date: string;
  reference_number?: string;
  chief_complaint?: string;
  medical_history?: string;
  investigation?: string;
  diagnosis?: string;
  treatment_plan?: any; // can be string[] (legacy) or TreatmentPlanItem[]
  oral_exam_notes?: string;
  selected_teeth?: ToothData[];
  medicines?: MedicineEntry[];
  treatment_done?: TreatmentItem[];
  advice?: string;
  followup_date?: string;
  doctor_name?: string;
  created_at?: string;
  updated_at?: string;
  bills?: Bill[];
}

export const addPrescription = async (prescription: Prescription) => {
  const data = await convex.mutation(api.prescriptions.create, prescription as any);
  return { ...prescription, id: data } as Prescription;
};

export const getAllPrescriptions = async (searchTerm?: string) => {
  try {
    const data = await convex.query(api.prescriptions.list);
    let results = data.map((item: any) => ({ ...item, id: item._id })) as Prescription[];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      results = results.filter(p => p.patient_name.toLowerCase().includes(term));
    }
    return results;
  } catch (err) {
    console.error('Error in getAllPrescriptions:', err);
    throw err;
  }
};

export const getPrescriptionById = async (id: string) => {
  if (!id || id === 'undefined' || id === 'null') return null;
  const data = await convex.query(api.prescriptions.getById, { id: id as any });
  return data ? { ...data, id: data._id } as any as Prescription : null;
};

export const updatePrescription = async (id: string, updates: Partial<Prescription>) => {
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('Cannot update prescription with invalid ID');
  }

  const cleanUpdates = Object.fromEntries(
    Object.entries(updates).filter(([_, value]) => value !== undefined)
  );

  const data = await convex.mutation(api.prescriptions.update, { id: id as any, ...cleanUpdates } as any);
  return { ...data, id: data?._id } as any as Prescription;
};

export const deletePrescription = async (id: string) => {
  // Temporary UI-generated IDs should not be sent to the database
  if (!id || id === 'undefined' || id === 'null' || id.toString().startsWith('TMP-')) {
    return true;
  }
  await convex.mutation(api.prescriptions.remove, { id: id as any });
  return true;
}

export const getPrescriptionWithBill = async (id: string) => {
  if (!id || id === 'undefined' || id === 'null') return null;
  const data = await convex.query(api.prescriptions.getById, { id: id as any });
  return data ? { ...data, id: data._id } as any as Prescription : null;
};

export const getPrescriptionsByPatient = async (patientId: string) => {
  const data = await convex.query(api.prescriptions.listByPatient, { reference_number: patientId });
  return data.map((item: any) => ({ ...item, id: item._id })) as Prescription[];
};

