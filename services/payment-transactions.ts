// services/payment-transactions.ts
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export interface PaymentTransaction {
  id: string;
  bill_id: string;
  patient_id: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  notes?: string;
  created_by?: string;
  patient_name?: string;
  phone_number?: string;
  bill_number?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePaymentData {
  bill_id: string;
  patient_id: string;
  amount: number;
  payment_method?: string;
  payment_date: string;
  notes?: string;
  created_by?: string;
}

export interface UpdatePaymentData {
  amount?: number;
  payment_method?: string;
  payment_date?: string;
  notes?: string;
  created_by?: string;
}

export const paymentTransactionService = {
  getAll: async (startDate?: string, endDate?: string): Promise<PaymentTransaction[]> => {
    try {
      const data = await convex.query(api.payment_transactions.list, { startDate, endDate });
      return data.map((item: any) => ({ ...item, id: item._id })) as PaymentTransaction[];
    } catch (e) {
      console.error("Error fetching payment transactions:", e);
      return [];
    }
  },

  getById: async (id: string): Promise<PaymentTransaction> => {
    // Return mock or implement if needed
    throw new Error("Not implemented");
  },

  getByBillId: async (billId: string): Promise<PaymentTransaction[]> => {
    const data = await convex.query(api.payment_transactions.listByBill, { bill_id: billId });
    return data.map((item: any) => ({ ...item, id: item._id })) as PaymentTransaction[];
  },

  getByPatientId: async (patientId: string): Promise<PaymentTransaction[]> => {
    // This could also be added to convex/payment_transactions.ts if required
    return [];
  },

  create: async (data: CreatePaymentData): Promise<PaymentTransaction> => {
    const transactionId = await convex.mutation(api.payment_transactions.create, data);
    return { ...data, id: transactionId } as any as PaymentTransaction;
  },

  update: async (id: string, data: UpdatePaymentData): Promise<PaymentTransaction> => {
    throw new Error("Not implemented"); // or implement convex update
  },

  delete: async (id: string): Promise<void> => {
    await convex.mutation(api.payment_transactions.remove, { id: id as any });
  },
};

