import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import { InvestigationRecord } from "@/types/registers";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");
const anyApi: any = api;

export const investigationService = {
  create: async (data: Omit<InvestigationRecord, '_id' | 'id' | 'created_at'>) => {
    return await convex.mutation(anyApi.investigations.create, data);
  },
  update: async (id: string, updates: Partial<InvestigationRecord>) => {
    const { _id, id: rawId, created_at, ...cleanUpdates } = updates;
    return await convex.mutation(anyApi.investigations.update, {
      id: id as any,
      ...cleanUpdates,
    });
  },
  delete: async (id: string) => {
    return await convex.mutation(anyApi.investigations.remove, { id: id as any });
  },
  getById: async (id: string) => {
    const item = await convex.query(anyApi.investigations.getById, { id: id as any });
    return item ? ({ ...item, id: item._id } as InvestigationRecord) : null;
  },
  list: async (filters?: {
    investigationType?: string;
    startDate?: string;
    endDate?: string;
    doctorName?: string;
    search?: string;
  }) => {
    const data = await convex.query(anyApi.investigations.list, filters || {});
    return (data || []).map((item: any) => ({ ...item, id: item._id })) as InvestigationRecord[];
  },
  getOpgAnalytics: async (filters?: {
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const result = await convex.query(anyApi.investigations.getOpgAnalytics || anyApi.investigations.list, filters || {});
    if (!result || !result.records) {
      return { totalCount: 0, dateWiseCounts: [], records: [] };
    }
    return {
      totalCount: result.totalCount as number,
      dateWiseCounts: result.dateWiseCounts as Array<{ date: string; count: number }>,
      records: result.records.map((item: any) => ({ ...item, id: item._id })) as InvestigationRecord[],
    };
  },
  getAutomaticReport: async (filters?: {
    startDate?: string;
    endDate?: string;
    doctorName?: string;
    investigationType?: string;
    search?: string;
  }) => {
    const result = await convex.query(anyApi.investigations.getAutomaticInvestigationReport, filters || {});
    return (result || {
      totalOpg: 0,
      totalIopar: 0,
      totalCount: 0,
      dateWiseBreakdown: [],
      records: [],
    }) as {
      totalOpg: number;
      totalIopar: number;
      totalCount: number;
      dateWiseBreakdown: Array<{
        date: string;
        opgCount: number;
        ioparCount: number;
        totalCount: number;
      }>;
      records: Array<{
        id: string;
        prescription_id: string;
        patient_name: string;
        phone_number: string;
        reference_number?: string;
        prescription_date: string;
        doctor_name?: string;
        investigation_text: string;
        has_opg: boolean;
        has_iopar: boolean;
        investigation_types: string[];
      }>;
    };
  },
};
