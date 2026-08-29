// services/inventory.ts
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

export type InventorySubdivision = 'One-Time Material' | 'Consumable' | 'Non-Dental / Cleaning Consumable' | 'Record Maintenance Material';

export type Inventory = {
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  rate: number;
  company?: string;
  is_consumable?: boolean | number;
  subdivision?: InventorySubdivision;
  unit?: string;
  min_stock_level?: number;
  deduction_qty?: number;
  created_at?: string;
  updated_at?: string;
};

export const addInventory = async (inventory: Inventory) => {
  const data = await convex.mutation(api.inventory.create, {
    name: inventory.name,
    description: inventory.description,
    quantity: Number(inventory.quantity),
    rate: Number(inventory.rate),
    company: inventory.company,
    is_consumable: !!inventory.is_consumable,
    subdivision: inventory.subdivision,
    unit: inventory.unit,
    min_stock_level: inventory.min_stock_level ? Number(inventory.min_stock_level) : undefined,
    deduction_qty: inventory.deduction_qty ? Number(inventory.deduction_qty) : undefined,
  });
  return data;
};

export const getAllInventory = async () => {
  const data = await convex.query(api.inventory.list);
  return data.map((item: any) => ({
    ...item,
    id: item._id,
  })) as Inventory[];
};

export const updateInventory = async (id: string, updates: Partial<Inventory>) => {
  // Only pass fields accepted by the Convex inventory.update mutation
  const validUpdate: Record<string, any> = { id: id as any };
  if (updates.name !== undefined) validUpdate.name = updates.name;
  if (updates.description !== undefined) validUpdate.description = updates.description;
  if (updates.quantity !== undefined) validUpdate.quantity = Number(updates.quantity);
  if (updates.rate !== undefined) validUpdate.rate = Number(updates.rate);
  if (updates.company !== undefined) validUpdate.company = updates.company;
  if (updates.is_consumable !== undefined) validUpdate.is_consumable = !!updates.is_consumable;
  if (updates.subdivision !== undefined) validUpdate.subdivision = updates.subdivision;
  if (updates.unit !== undefined) validUpdate.unit = updates.unit;
  if (updates.min_stock_level !== undefined) validUpdate.min_stock_level = Number(updates.min_stock_level);
  if ((updates as any).enabled !== undefined) validUpdate.enabled = !!(updates as any).enabled;
  if (updates.deduction_qty !== undefined) validUpdate.deduction_qty = Number(updates.deduction_qty);

  const data = await convex.mutation(api.inventory.update, validUpdate as any);
  return data;
};

export const deleteInventory = async (id: string) => {
  await convex.mutation(api.inventory.remove, { id: id as any });
  return true;
};

export const getInventoryByName = async (name: string) => {
  const allInventory = await getAllInventory();
  const found = allInventory.find(i => i.name.toLowerCase().includes(name.toLowerCase()));
  if (!found) throw new Error('Inventory item not found');
  return found;
};

export const deductInventoryStock = async (inventoryItems: Array<{ name: string, quantity: number, id?: string }>) => {
  try {
    const results = [];
    const allInventory = await getAllInventory();

    for (const item of inventoryItems) {
      try {
        // Find all inventory items matching by name
        const nameMatches = allInventory.filter(i =>
          i.name.toLowerCase().includes(item.name.toLowerCase()) ||
          item.name.toLowerCase().includes(i.name.toLowerCase())
        );

        let inventory;
        if (item.id && nameMatches.length > 1) {
          // Multiple matches — exclude the consumable config item, pick highest stock
          const otherMatches = nameMatches.filter(i => i.id !== item.id);
          inventory = otherMatches.sort((a, b) => b.quantity - a.quantity)[0];
        } else {
          // Single match or no config ID — use the one with highest stock
          inventory = nameMatches.sort((a, b) => b.quantity - a.quantity)[0];
        }

        if (!inventory || !inventory.id) {
          results.push({
            name: item.name,
            status: 'error',
            message: `No stock item found in Inventory for "${item.name}". Please add it in Inventory Management.`
          });
          continue;
        }

        if (inventory.quantity < item.quantity) {
          results.push({
            name: item.name,
            status: 'warning',
            message: `Insufficient stock (${inventory.quantity} available, ${item.quantity} needed)`
          });
          continue;
        }

        const newQuantity = inventory.quantity - item.quantity;
        const updatedInventory = await updateInventory(inventory.id, { quantity: newQuantity });

        results.push({
          name: item.name,
          status: 'success',
          message: `Stock updated. Remaining: ${newQuantity}`,
          inventory: updatedInventory,
          rate: inventory.rate || 0,
        });
      } catch (error) {
        console.error(`Failed to process inventory: ${item.name}`, error);
        results.push({
          name: item.name,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Error in deductInventoryStock:', error);
    throw error;
  }
};

export const recordInventorySale = async (sale: {
  inventory_name: string;
  quantity: number;
  rate?: number;
  total_amount?: number;
  notes?: string;
  sale_date: string;
}) => {
  return await convex.mutation(api.inventory_sales.record, {
    inventory_name: sale.inventory_name,
    quantity: sale.quantity,
    rate: sale.rate ?? 0,
    total_amount: sale.total_amount ?? 0,
    notes: sale.notes,
    sale_date: sale.sale_date,
  });
};
