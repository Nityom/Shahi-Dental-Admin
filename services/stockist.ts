import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import {
  Stockist,
  StockistBill,
  StockistPayment,
  StockistDashboardSummary,
} from "@/types/stockist";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export const stockistService = {
  /* ---------------- Stockists Directory ---------------- */
  listStockists: async (search?: string) => {
    const data = await convex.query(api.stockists.listStockists, { search });
    return data.map((item: any) => ({ ...item, id: item._id })) as Stockist[];
  },

  createStockist: async (data: Omit<Stockist, '_id' | 'id' | 'created_at' | 'updated_at'>) => {
    return await convex.mutation(api.stockists.createStockist, data);
  },

  updateStockist: async (id: string, updates: Partial<Stockist>) => {
    const { _id, id: rawId, created_at, updated_at, total_billed, total_paid, total_balance, bills_count, open_bills_count, ...cleanUpdates } = updates;
    return await convex.mutation(api.stockists.updateStockist, {
      id: id as any,
      ...cleanUpdates,
    });
  },

  deleteStockist: async (id: string) => {
    return await convex.mutation(api.stockists.deleteStockist, { id: id as any });
  },

  /* ---------------- Stockist Bills ---------------- */
  listBills: async (filters?: {
    stockist_name?: string;
    stockist_id?: string;
    payment_status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const data = await convex.query(api.stockists.listBills, {
      stockist_name: filters?.stockist_name,
      stockist_id: filters?.stockist_id as any,
      payment_status: filters?.payment_status,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      search: filters?.search,
    });
    return data.map((item: any) => ({ ...item, id: item._id })) as StockistBill[];
  },

  getBillById: async (id: string) => {
    const data = await convex.query(api.stockists.getBillById, { id: id as any });
    if (!data) return null;
    return {
      ...data,
      id: data._id,
      payments: (data.payments || []).map((p: any) => ({ ...p, id: p._id })),
    } as StockistBill;
  },

  createBill: async (data: {
    stockist_name: string;
    stockist_id?: string;
    bill_number: string;
    bill_date: string;
    due_date?: string;
    total_amount: number;
    items?: any[];
    has_physical_copy?: boolean;
    physical_copy_notes?: string;
    notes?: string;
    initial_paid_amount?: number;
    initial_payment_mode?: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
    initial_payment_ref?: string;
  }) => {
    return await convex.mutation(api.stockists.createBill, {
      ...data,
      stockist_id: data.stockist_id as any,
    });
  },

  updateBill: async (id: string, updates: Partial<StockistBill>) => {
    const { _id, id: rawId, created_at, updated_at, paid_amount, balance_amount, payment_status, payments, ...cleanUpdates } = updates;
    return await convex.mutation(api.stockists.updateBill, {
      id: id as any,
      ...cleanUpdates,
      stockist_id: cleanUpdates.stockist_id as any,
    });
  },

  deleteBill: async (id: string) => {
    return await convex.mutation(api.stockists.deleteBill, { id: id as any });
  },

  /* ---------------- Stockist Payments (Weekly Installments) ---------------- */
  recordPayment: async (data: {
    stockist_bill_id: string;
    payment_date: string;
    amount: number;
    payment_mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
    transaction_reference?: string;
    noted_on_physical_copy?: boolean;
    collected_by?: string;
    paid_by?: string;
    notes?: string;
  }) => {
    return await convex.mutation(api.stockists.recordPayment, {
      ...data,
      stockist_bill_id: data.stockist_bill_id as any,
    });
  },

  deletePayment: async (id: string) => {
    return await convex.mutation(api.stockists.deletePayment, { id: id as any });
  },

  listPayments: async (filters?: {
    stockist_bill_id?: string;
    stockist_name?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const data = await convex.query(api.stockists.listPayments, {
      stockist_bill_id: filters?.stockist_bill_id as any,
      stockist_name: filters?.stockist_name,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
    });
    return data.map((item: any) => ({ ...item, id: item._id })) as StockistPayment[];
  },

  /* ---------------- Dashboard Summary ---------------- */
  getDashboardSummary: async (): Promise<StockistDashboardSummary> => {
    return await convex.query(api.stockists.getDashboardSummary, {});
  },
};
