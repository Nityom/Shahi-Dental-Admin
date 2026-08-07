// services/medicine.ts
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

export type Medicine = {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  cost_price?: number;
  selling_price?: number;
  profit_margin?: number;
  company?: string;
  created_at?: string;
  updated_at?: string;
  price?: number;
  low_stock_threshold?: number;
  strips?: number;
  quantity_per_strip?: number;
};

export const addMedicine = async (medicine: Medicine) => {
  const data = await convex.mutation(api.medicines.create, {
    name: medicine.name,
    description: medicine.description,
    quantity: Number(medicine.quantity),
    rate: Number(medicine.rate),
    cost_price: medicine.cost_price ? Number(medicine.cost_price) : undefined,
    selling_price: medicine.selling_price ? Number(medicine.selling_price) : undefined,
    company: medicine.company,
    low_stock_threshold: medicine.low_stock_threshold ? Number(medicine.low_stock_threshold) : undefined,
    strips: medicine.strips ? Number(medicine.strips) : undefined,
    quantity_per_strip: medicine.quantity_per_strip ? Number(medicine.quantity_per_strip) : undefined,
  });
  return data;
};

export const getAllMedicines = async () => {
  const data = await convex.query(api.medicines.list);
  return data.map((item: any) => {
    const costPrice = item.cost_price ? Number(item.cost_price) : undefined;
    const sellingPrice = item.selling_price ? Number(item.selling_price) : undefined;
    let profitMargin: number | undefined;
    if (costPrice && sellingPrice && costPrice > 0) {
      profitMargin = ((sellingPrice - costPrice) / costPrice) * 100;
    }
    return {
      ...item,
      id: item._id,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      selling_price: sellingPrice,
      cost_price: costPrice,
      profit_margin: profitMargin,
      price: sellingPrice ? sellingPrice : Number(item.rate),
      low_stock_threshold: item.low_stock_threshold !== undefined ? Number(item.low_stock_threshold) : 10,
      strips: item.strips !== undefined ? Number(item.strips) : undefined,
      quantity_per_strip: item.quantity_per_strip !== undefined ? Number(item.quantity_per_strip) : undefined,
    };
  }) as Medicine[];
};

export const updateMedicine = async (id: string, updates: Partial<Medicine>) => {
  // Only pass fields accepted by the Convex medicines.update mutation
  const validUpdate: Record<string, any> = { id: id as any };
  if (updates.name !== undefined) validUpdate.name = updates.name;
  if (updates.description !== undefined) validUpdate.description = updates.description;
  if (updates.quantity !== undefined) validUpdate.quantity = Number(updates.quantity);
  if (updates.rate !== undefined) validUpdate.rate = Number(updates.rate);
  if (updates.cost_price !== undefined) validUpdate.cost_price = Number(updates.cost_price);
  if (updates.selling_price !== undefined) validUpdate.selling_price = Number(updates.selling_price);
  if (updates.company !== undefined) validUpdate.company = updates.company;
  if (updates.low_stock_threshold !== undefined) validUpdate.low_stock_threshold = Number(updates.low_stock_threshold);
  if (updates.strips !== undefined) validUpdate.strips = Number(updates.strips);
  if (updates.quantity_per_strip !== undefined) validUpdate.quantity_per_strip = Number(updates.quantity_per_strip);

  const data = await convex.mutation(api.medicines.update, validUpdate as any);
  return data;
};

export const deleteMedicine = async (id: string) => {
  await convex.mutation(api.medicines.remove, { id: id as any });
  return true;
};

export const getMedicineByName = async (name: string) => {
  const allMedicines = await getAllMedicines();
  const found = allMedicines.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
  if (!found) throw new Error('Medicine not found');
  return found;
};

export const deductMedicineStock = async (medicineItems: Array<{ name: string, quantity: number }>) => {
  try {
    const results = [];

    for (const item of medicineItems) {
      try {
        const medicine = await getMedicineByName(item.name);

        if (medicine.quantity < item.quantity) {
          results.push({
            name: item.name,
            status: 'warning',
            message: `Insufficient stock (${medicine.quantity} available, ${item.quantity} needed)`
          });
          continue;
        }

        const newQuantity = medicine.quantity - item.quantity;
        const updatedMedicine = await updateMedicine(medicine.id!, { quantity: newQuantity });

        // Record sale
        await convex.mutation(api.medicines.recordSale, {
          medicine_id: medicine.id as any,
          medicine_name: medicine.name,
          company: medicine.company,
          quantity: item.quantity,
          unit_price: medicine.price || medicine.rate,
          unit_cost: medicine.cost_price || undefined,
          total_amount: (medicine.price || medicine.rate) * item.quantity,
          sale_date: new Date().toISOString().split('T')[0],
        });

        results.push({
          name: item.name,
          status: 'success',
          message: `Stock updated. Remaining: ${newQuantity}`,
          medicine: updatedMedicine
        });
      } catch (error) {
        console.error(`Failed to process medicine: ${item.name}`, error);
        results.push({
          name: item.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in deductMedicineStock:', error);
    throw error;
  }
};
