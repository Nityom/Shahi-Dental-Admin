import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import { Doctor, DoctorMonthlyRevenue, AssistantDoctorSummary, DoctorPayout } from "@/types/doctor";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");
const anyApi: any = api;

export const doctorService = {
  list: async (filters?: {
    doctorType?: 'MAIN' | 'ASSISTANT' | 'ALL';
    status?: 'ACTIVE' | 'INACTIVE' | 'ALL';
    search?: string;
  }): Promise<Doctor[]> => {
    try {
      const data = await convex.query(anyApi.doctors.list, filters || {});
      return (data || []).map((d: any) => ({
        ...d,
        id: d._id,
      })) as Doctor[];
    } catch (err) {
      console.error("Failed to list doctors:", err);
      return [];
    }
  },

  getById: async (id: string): Promise<Doctor | null> => {
    try {
      const data = await convex.query(anyApi.doctors.getById, { id: id as any });
      return data ? ({ ...data, id: data._id } as Doctor) : null;
    } catch (err) {
      console.error("Failed to get doctor by id:", err);
      return null;
    }
  },

  seedDefaults: async (): Promise<boolean> => {
    try {
      return await convex.mutation(anyApi.doctors.seedDefaults, {});
    } catch (err) {
      console.error("Failed to seed default doctors:", err);
      return false;
    }
  },

  create: async (data: Omit<Doctor, '_id' | 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    return await convex.mutation(anyApi.doctors.create, data as any);
  },

  update: async (id: string, updates: Partial<Doctor>): Promise<Doctor> => {
    const { _id, id: rawId, created_at, updated_at, ...cleanUpdates } = updates;
    return await convex.mutation(anyApi.doctors.update, {
      id: id as any,
      ...cleanUpdates,
    } as any);
  },

  delete: async (id: string): Promise<boolean> => {
    return await convex.mutation(anyApi.doctors.remove, { id: id as any });
  },

  getMonthlyRevenue: async (params: {
    doctorId?: string;
    doctorName?: string;
    month: string;
  }): Promise<DoctorMonthlyRevenue> => {
    return await convex.query(anyApi.doctors.getDoctorMonthlyRevenue, {
      doctorId: params.doctorId as any,
      doctorName: params.doctorName,
      month: params.month,
    });
  },

  getAssistantDoctorsMonthlySummary: async (month: string): Promise<AssistantDoctorSummary[]> => {
    return await convex.query(anyApi.doctors.getAssistantDoctorsMonthlySummary, { month });
  },

  recordPayout: async (data: Omit<DoctorPayout, '_id' | 'id' | 'created_at' | 'updated_at'>): Promise<string> => {
    return await convex.mutation(anyApi.doctors.recordDoctorPayout, data as any);
  },

  listPayouts: async (filters?: {
    doctorId?: string;
    month?: string;
  }): Promise<DoctorPayout[]> => {
    const list = await convex.query(anyApi.doctors.listDoctorPayouts, {
      doctorId: filters?.doctorId as any,
      month: filters?.month,
    });
    return (list || []).map((p: any) => ({ ...p, id: p._id })) as DoctorPayout[];
  },
};
