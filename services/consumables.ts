// services/consumables.ts
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export interface Consumable {
  id?: string;
  name: string;
  quantity: number;
  deduction_qty?: number;
  description?: string;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  is_consumable?: boolean;
}

export const getAllConsumables = async (): Promise<Consumable[]> => {
  const data = await convex.query(api.consumables.list);
  return data.map((item: any) => ({
    ...item,
    id: item._id,
  })) as Consumable[];
};

export const getConsumableById = async (id: string): Promise<Consumable> => {
  const data = await convex.query(api.inventory.getById, { id: id as any });
  return { ...data, id: data?._id } as any as Consumable;
};

export const addConsumable = async (consumable: Omit<Consumable, 'id' | 'created_at' | 'updated_at'>): Promise<Consumable> => {
  const data = await convex.mutation(api.inventory.create, {
    name: consumable.name,
    description: consumable.description,
    quantity: 0,
    rate: 0,
    is_consumable: true,
    deduction_qty: Number(consumable.deduction_qty ?? consumable.quantity ?? 1),
  });
  return { ...consumable, id: data } as Consumable;
};

export const updateConsumable = async (id: string, updates: Partial<Consumable>): Promise<Consumable> => {
  // Only pass fields accepted by the Convex inventory.update mutation
  const validUpdate: Record<string, any> = { id: id as any };
  if (updates.name !== undefined) validUpdate.name = updates.name;
  if (updates.description !== undefined) validUpdate.description = updates.description;
  if (updates.deduction_qty !== undefined) validUpdate.deduction_qty = Number(updates.deduction_qty);
  if (updates.enabled !== undefined) validUpdate.enabled = !!updates.enabled;

  const data = await convex.mutation(api.inventory.update, validUpdate as any);
  return { ...data, id: (data as any)?._id } as any as Consumable;
};

export const deleteConsumable = async (id: string): Promise<void> => {
  await convex.mutation(api.inventory.remove, { id: id as any });
};

export const getEnabledConsumablesForDeduction = async (): Promise<Array<{ id: string, name: string, quantity: number }>> => {
  const allConsumables = await getAllConsumables();
  return allConsumables
    .filter(item => item.enabled === true && item.id !== undefined)
    .map(item => ({
      id: item.id!,
      name: item.name,
      quantity: item.deduction_qty ?? 1
    }));
};


