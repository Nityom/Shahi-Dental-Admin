import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import {
  ReviewRecord,
  PatientRecall,
  PatientFollowup,
  CrownCuttingRecord,
  CrownReceivedRecord,
  StaffMember,
  StaffPaymentRecord,
  MaterialTransaction,
} from "@/types/registers";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

/* =========================================================================
   1. REVIEW REGISTER SERVICES
   ========================================================================= */

export const reviewService = {
  create: async (data: Omit<ReviewRecord, '_id' | 'id' | 'created_at' | 'updated_at'>) => {
    return await convex.mutation(api.registers.createReview, data);
  },
  update: async (id: string, updates: Partial<ReviewRecord>) => {
    const { _id, id: rawId, created_at, updated_at, ...cleanUpdates } = updates;
    return await convex.mutation(api.registers.updateReview, {
      id: id as any,
      ...cleanUpdates,
    });
  },
  delete: async (id: string) => {
    return await convex.mutation(api.registers.deleteReview, { id: id as any });
  },
  list: async (filters?: { startDate?: string; endDate?: string; status?: string; search?: string }) => {
    const data = await convex.query(api.registers.listReviews, filters || {});
    return data.map((item: any) => ({ ...item, id: item._id })) as ReviewRecord[];
  },
};

/* =========================================================================
   2. PATIENT RECALL REGISTER SERVICES
   ========================================================================= */

export const recallService = {
  create: async (data: Omit<PatientRecall, '_id' | 'id' | 'created_at' | 'updated_at'>) => {
    return await convex.mutation(api.registers.createRecall, data);
  },
  update: async (id: string, updates: Partial<PatientRecall>) => {
    const { _id, id: rawId, created_at, updated_at, ...cleanUpdates } = updates;
    return await convex.mutation(api.registers.updateRecall, {
      id: id as any,
      ...cleanUpdates,
    });
  },
  delete: async (id: string) => {
    return await convex.mutation(api.registers.deleteRecall, { id: id as any });
  },
  list: async (filters?: { startDate?: string; endDate?: string; status?: string; search?: string }) => {
    const data = await convex.query(api.registers.listRecalls, filters || {});
    return data.map((item: any) => ({ ...item, id: item._id })) as PatientRecall[];
  },
};

/* =========================================================================
   3. PATIENT FOLLOW-UP REGISTER SERVICES
   ========================================================================= */

export const followupService = {
  create: async (data: Omit<PatientFollowup, '_id' | 'id' | 'created_at' | 'updated_at'>) => {
    return await convex.mutation(api.registers.createFollowup, data);
  },
  update: async (id: string, updates: Partial<PatientFollowup>) => {
    const { _id, id: rawId, created_at, updated_at, ...cleanUpdates } = updates;
    return await convex.mutation(api.registers.updateFollowup, {
      id: id as any,
      ...cleanUpdates,
    });
  },
  delete: async (id: string) => {
    return await convex.mutation(api.registers.deleteFollowup, { id: id as any });
  },
  list: async (filters?: { startDate?: string; endDate?: string; status?: string; search?: string }) => {
    const data = await convex.query(api.registers.listFollowups, filters || {});
    return data.map((item: any) => ({ ...item, id: item._id })) as PatientFollowup[];
  },
};

/* =========================================================================
   4. CROWN CUTTING REGISTER SERVICES
   ========================================================================= */

export const crownCuttingService = {
  create: async (data: Omit<CrownCuttingRecord, '_id' | 'id' | 'created_at' | 'updated_at'>) => {
    return await convex.mutation(api.registers.createCrownCutting, data as any);
  },
  update: async (id: string, updates: Partial<CrownCuttingRecord>) => {
    const { _id, id: rawId, created_at, updated_at, ...cleanUpdates } = updates;
    return await convex.mutation(api.registers.updateCrownCutting, {
      id: id as any,
      ...cleanUpdates,
    } as any);
  },
  delete: async (id: string) => {
    return await convex.mutation(api.registers.deleteCrownCutting, { id: id as any });
  },
  list: async (filters?: {
    startDate?: string;
    endDate?: string;
    dateFilterType?: 'cutting_date' | 'fixed_date';
    status?: string;
    crownStatus?: string;
    labName?: string;
    search?: string;
  }) => {
    const data = await convex.query(api.registers.listCrownCutting, (filters || {}) as any);
    return data.map((item: any) => ({ ...item, id: item._id })) as CrownCuttingRecord[];
  },
  syncAllPrescriptions: async () => {
    try {
      const anyApi: any = api;
      return await convex.mutation(anyApi.prescriptions.syncAllPrescriptionsToCrownRegister, {});
    } catch (err) {
      console.error("Failed to auto-sync prescriptions to crown register:", err);
      return { success: false, syncedCount: 0 };
    }
  },
  cleanErronousRecords: async () => {
    try {
      const anyApi: any = api;
      return await convex.mutation(anyApi.prescriptions.cleanErronousCrownCuttingRecords, {});
    } catch (err) {
      console.error("Failed to clean erroneous crown records:", err);
      return { success: false, deletedCount: 0 };
    }
  },
};

/* =========================================================================
   5. CROWN RECEIVED REGISTER SERVICES
   ========================================================================= */

export const crownReceivedService = {
  create: async (data: Omit<CrownReceivedRecord, '_id' | 'id' | 'created_at' | 'updated_at'>) => {
    return await convex.mutation(api.registers.createCrownReceived, {
      ...data,
      status: data.status as any,
      crown_cutting_id: data.crown_cutting_id ? (data.crown_cutting_id as any) : undefined,
    } as any);
  },
  update: async (id: string, updates: Partial<CrownReceivedRecord>) => {
    const { _id, id: rawId, created_at, updated_at, crown_cutting_id, ...cleanUpdates } = updates;
    return await convex.mutation(api.registers.updateCrownReceived, {
      id: id as any,
      crown_cutting_id: crown_cutting_id ? (crown_cutting_id as any) : undefined,
      ...cleanUpdates,
    } as any);
  },
  delete: async (id: string) => {
    return await convex.mutation(api.registers.deleteCrownReceived, { id: id as any });
  },
  list: async (filters?: { startDate?: string; endDate?: string; status?: string; labName?: string; search?: string }) => {
    const data = await convex.query(api.registers.listCrownReceived, filters || {});
    return data.map((item: any) => ({ ...item, id: item._id })) as CrownReceivedRecord[];
  },
};

/* =========================================================================
   6. STAFF MEMBERS & PAYMENT LEDGER SERVICES
   ========================================================================= */

export const staffMemberService = {
  list: async (filters?: { month?: string; search?: string }) => {
    const anyApi: any = api;
    const data = await convex.query(anyApi.staff.list, filters || {});
    return data as StaffMember[];
  },
  getById: async (id: string) => {
    const anyApi: any = api;
    return await convex.query(anyApi.staff.getById, { id: id as any });
  },
  create: async (data: { name: string; role: string; phone?: string; fixed_salary: number; joining_date?: string; notes?: string }) => {
    const anyApi: any = api;
    return await convex.mutation(anyApi.staff.create, data);
  },
  update: async (id: string, updates: Partial<StaffMember>) => {
    const anyApi: any = api;
    const {
      _id,
      id: rawId,
      created_at,
      updated_at,
      advance_balance,
      total_advances_given,
      total_advances_settled,
      salary_paid_this_month,
      advance_paid_this_month,
      advance_deducted_this_month,
      total_paid_this_month,
      pending_salary_this_month,
      payments_count,
      ...cleanUpdates
    } = updates;
    return await convex.mutation(anyApi.staff.update, {
      id: id as any,
      ...cleanUpdates,
    });
  },
  delete: async (id: string) => {
    const anyApi: any = api;
    return await convex.mutation(anyApi.staff.remove, { id: id as any });
  },
  recordPayment: async (data: any) => {
    const anyApi: any = api;
    return await convex.mutation(anyApi.staff.recordPayment, data);
  },
  migrateExistingStaff: async () => {
    const anyApi: any = api;
    return await convex.mutation(anyApi.staff.migrateExistingStaff, {});
  },
};

export const staffPaymentService = {
  create: async (data: Omit<StaffPaymentRecord, '_id' | 'id' | 'created_at'>) => {
    return await convex.mutation(api.registers.createStaffPayment, data);
  },
  update: async (id: string, updates: Partial<StaffPaymentRecord>) => {
    const { _id, id: rawId, created_at, ...cleanUpdates } = updates;
    return await convex.mutation(api.registers.updateStaffPayment, {
      id: id as any,
      ...cleanUpdates,
    });
  },
  delete: async (id: string) => {
    return await convex.mutation(api.registers.deleteStaffPayment, { id: id as any });
  },
  list: async (filters?: { staffName?: string; salaryMonth?: string; paymentType?: string; startDate?: string; endDate?: string; search?: string }) => {
    const data = await convex.query(api.registers.listStaffPayments, filters || {});
    return data.map((item: any) => ({ ...item, id: item._id })) as StaffPaymentRecord[];
  },
  getLedgerSummary: async (staffName: string) => {
    return await convex.query(api.registers.getStaffLedgerSummary, { staffName });
  },
};

/* =========================================================================
   7. MATERIAL TRANSACTIONS SERVICES
   ========================================================================= */

export const materialTransactionService = {
  record: async (data: {
    material_id?: string;
    material_name: string;
    subdivision: 'One-Time Material' | 'Consumable' | 'Non-Dental / Cleaning Consumable' | 'Record Maintenance Material';
    transaction_type: 'PURCHASE' | 'USAGE' | 'INITIAL_STOCK' | 'ADJUSTMENT' | 'SCRAP';
    quantity: number;
    unit?: string;
    rate: number;
    vendor_name?: string;
    invoice_no?: string;
    transaction_date: string;
    recorded_by?: string;
    notes?: string;
  }) => {
    return await convex.mutation(api.material_transactions.recordTransaction, {
      ...data,
      material_id: data.material_id ? (data.material_id as any) : undefined,
    });
  },
  list: async (filters?: { subdivision?: string; transaction_type?: string; startDate?: string; endDate?: string; search?: string }) => {
    const data = await convex.query(api.material_transactions.list, filters || {});
    return data.map((item: any) => ({ ...item, id: item._id })) as MaterialTransaction[];
  },
  getSubdivisionSummary: async () => {
    return await convex.query(api.material_transactions.getSubdivisionSummary, {});
  },
};
