import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";
import { InvestigationRecord } from "@/types/registers";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export const investigationService = {
  create: async (data: Omit<InvestigationRecord, '_id' | 'id' | 'created_at'>) => {
    return await convex.mutation(api.investigations.create, data);
  },
  update: async (id: string, updates: Partial<InvestigationRecord>) => {
    const { _id, id: rawId, created_at, ...cleanUpdates } = updates;
    return await convex.mutation(api.investigations.update, {
      id: id as any,
      ...cleanUpdates,
    });
  },
  delete: async (id: string) => {
    return await convex.mutation(api.investigations.remove, { id: id as any });
  },
  getById: async (id: string) => {
    const item = await convex.query(api.investigations.getById, { id: id as any });
    return item ? ({ ...item, id: item._id } as InvestigationRecord) : null;
  },
  list: async (filters?: {
    investigationType?: string;
    startDate?: string;
    endDate?: string;
    doctorName?: string;
    search?: string;
  }) => {
    const data = await convex.query(api.investigations.list, filters || {});
    return data.map((item: any) => ({ ...item, id: item._id })) as InvestigationRecord[];
  },
  getOpgAnalytics: async (filters?: {
    startDate?: string;
    endDate?: string;
    search?: string;
  }) => {
    const result = await convex.query(api.investigations.getOpgAnalytics, filters || {});
    return {
      totalCount: result.totalCount as number,
      dateWiseCounts: result.dateWiseCounts as Array<{ date: string; count: number }>,
      records: result.records.map((item: any) => ({ ...item, id: item._id })) as InvestigationRecord[],
    };
  },
};
