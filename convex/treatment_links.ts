import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * List all treatment inventory link rules.
 * Enriches linked items with the latest inventory details (current stock, rate, unit, etc.)
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const links = await ctx.db.query("treatment_inventory_links").collect();
    const inventory = await ctx.db.query("inventory").collect();

    // Map inventory by ID and lowercase name for fast lookup
    const invById = new Map(inventory.map((i) => [i._id.toString(), i]));
    const invByName = new Map(inventory.map((i) => [i.name.trim().toLowerCase(), i]));

    return links.map((link) => {
      const enrichedItems = link.items.map((item) => {
        let matchedInv = item.inventory_id ? invById.get(item.inventory_id) : undefined;
        if (!matchedInv && item.inventory_name) {
          matchedInv = invByName.get(item.inventory_name.trim().toLowerCase());
        }

        return {
          ...item,
          current_stock: matchedInv ? matchedInv.quantity : undefined,
          inventory_id: matchedInv ? matchedInv._id.toString() : item.inventory_id,
          unit: item.unit || matchedInv?.unit || "pcs",
          rate: matchedInv?.rate ?? 0,
          subdivision: matchedInv?.subdivision || (matchedInv?.is_consumable ? "Consumable" : "One-Time Material"),
        };
      });

      return {
        ...link,
        items: enrichedItems,
      };
    });
  },
});

/**
 * Save (create or update) a treatment link rule
 */
export const save = mutation({
  args: {
    id: v.optional(v.id("treatment_inventory_links")),
    treatment_name: v.string(),
    items: v.array(
      v.object({
        inventory_id: v.optional(v.string()),
        inventory_name: v.string(),
        quantity: v.number(),
        unit: v.optional(v.string()),
      })
    ),
    enabled: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const trimmedTreatment = args.treatment_name.trim();
    if (!trimmedTreatment) {
      throw new Error("Treatment name cannot be empty");
    }
    if (!args.items || args.items.length === 0) {
      throw new Error("At least one inventory item must be linked");
    }

    // Clean items
    const cleanItems = args.items.map((item) => ({
      inventory_id: item.inventory_id?.trim() || undefined,
      inventory_name: item.inventory_name.trim(),
      quantity: Math.max(1, Number(item.quantity) || 1),
      unit: item.unit?.trim() || "pcs",
    }));

    const now = Date.now();

    if (args.id) {
      await ctx.db.patch(args.id, {
        treatment_name: trimmedTreatment,
        items: cleanItems,
        enabled: args.enabled,
        notes: args.notes?.trim() || undefined,
        updated_at: now,
      });
      return args.id;
    } else {
      // Check if one with same treatment_name exists
      const existing = await ctx.db
        .query("treatment_inventory_links")
        .withIndex("by_treatment_name", (q) => q.eq("treatment_name", trimmedTreatment))
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          items: cleanItems,
          enabled: args.enabled,
          notes: args.notes?.trim() || undefined,
          updated_at: now,
        });
        return existing._id;
      }

      const newId = await ctx.db.insert("treatment_inventory_links", {
        treatment_name: trimmedTreatment,
        items: cleanItems,
        enabled: args.enabled,
        notes: args.notes?.trim() || undefined,
        created_at: now,
        updated_at: now,
      });
      return newId;
    }
  },
});

/**
 * Remove a treatment link rule
 */
export const remove = mutation({
  args: { id: v.id("treatment_inventory_links") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { success: true };
  },
});

/**
 * Toggle enable/disable a treatment link rule
 */
export const toggleEnabled = mutation({
  args: {
    id: v.id("treatment_inventory_links"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      enabled: args.enabled,
      updated_at: Date.now(),
    });
    return { success: true };
  },
});

/**
 * Deduct inventory stock for treatments done in a prescription.
 * Automatically records USAGE in material_transactions table with audit notes.
 */
export const deductForTreatments = mutation({
  args: {
    treatments: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
      })
    ),
    patientName: v.string(),
    prescriptionId: v.optional(v.string()),
    date: v.optional(v.string()), // YYYY-MM-DD
  },
  handler: async (ctx, args) => {
    if (!args.treatments || args.treatments.length === 0) {
      return { totalDeductedCount: 0, results: [] };
    }

    // Get today's date in IST if not provided
    const txDate =
      args.date ||
      new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

    // Fetch enabled treatment link rules
    const allLinks = await ctx.db.query("treatment_inventory_links").collect();
    const enabledLinks = allLinks.filter((l) => l.enabled);

    if (enabledLinks.length === 0) {
      return { totalDeductedCount: 0, results: [] };
    }

    // Fetch all inventory items
    const allInventory = await ctx.db.query("inventory").collect();
    const invById = new Map(allInventory.map((i) => [i._id.toString(), i]));
    const invByName = new Map(allInventory.map((i) => [i.name.trim().toLowerCase(), i]));

    const results: Array<{
      treatmentName: string;
      itemName: string;
      deductedQty: number;
      remainingStock: number;
      status: "success" | "warning" | "error";
      message: string;
    }> = [];

    let totalDeductedCount = 0;

    // Helper to test if a prescription treatment description matches a rule
    const matchesTreatment = (treatmentDesc: string, ruleTreatmentName: string) => {
      const a = treatmentDesc.trim().toLowerCase();
      const b = ruleTreatmentName.trim().toLowerCase();
      if (a === b) return true;
      // Word boundary or contains match
      if (a.includes(b) || b.includes(a)) return true;

      // Special common abbreviations:
      // "Extraction" <-> "Tooth Extraction"
      if (
        (a.includes("extraction") && b.includes("extraction")) ||
        (a.includes("rct") && (b.includes("rct") || b.includes("root canal"))) ||
        (a.includes("root canal") && (b.includes("rct") || b.includes("root canal"))) ||
        (a.includes("scaling") && (b.includes("scaling") || b.includes("cleaning"))) ||
        (a.includes("cleaning") && (b.includes("scaling") || b.includes("cleaning"))) ||
        (a.includes("filling") && b.includes("filling")) ||
        (a.includes("crown") && b.includes("crown"))
      ) {
        return true;
      }

      return false;
    };

    // Iterate through treatments done in this prescription
    for (const t of args.treatments) {
      const tName = t.name.trim();
      const tQty = Math.max(1, t.quantity || 1);

      // Find matching enabled rules
      const matchedRules = enabledLinks.filter((rule) =>
        matchesTreatment(tName, rule.treatment_name)
      );

      for (const rule of matchedRules) {
        for (const item of rule.items) {
          const requiredQty = item.quantity * tQty;

          // Find inventory item
          let invItem = item.inventory_id ? invById.get(item.inventory_id) : undefined;
          if (!invItem && item.inventory_name) {
            invItem = invByName.get(item.inventory_name.trim().toLowerCase());
          }

          if (!invItem) {
            results.push({
              treatmentName: tName,
              itemName: item.inventory_name,
              deductedQty: 0,
              remainingStock: 0,
              status: "error",
              message: `Inventory item "${item.inventory_name}" not found in database.`,
            });
            continue;
          }

          const currentStock = invItem.quantity || 0;
          const newStock = Math.max(0, currentStock - requiredQty);

          // Update inventory stock
          await ctx.db.patch(invItem._id, {
            quantity: newStock,
          });

          // Record usage in material_transactions for complete audit
          const itemSubdivision =
            invItem.subdivision || (invItem.is_consumable ? "Consumable" : "One-Time Material");

          await ctx.db.insert("material_transactions", {
            material_id: invItem._id,
            material_name: invItem.name,
            subdivision: itemSubdivision,
            transaction_type: "USAGE",
            quantity: requiredQty,
            unit: item.unit || invItem.unit || "pcs",
            rate: invItem.rate || 0,
            total_cost: requiredQty * (invItem.rate || 0),
            transaction_date: txDate,
            recorded_by: "System (Auto-Link)",
            balance_after: newStock,
            notes: `Auto-deducted for [${rule.treatment_name}] - Patient: ${args.patientName}${
              args.prescriptionId ? ` (Rx: ${args.prescriptionId})` : ""
            }`,
            created_at: Date.now(),
          });

          // Update memory maps so subsequent treatments in same prescription use updated stock
          invItem.quantity = newStock;

          totalDeductedCount += requiredQty;

          const isLowStock = newStock <= (invItem.min_stock_level ?? 5);

          results.push({
            treatmentName: tName,
            itemName: invItem.name,
            deductedQty: requiredQty,
            remainingStock: newStock,
            status: isLowStock ? "warning" : "success",
            message: isLowStock
              ? `Deducted ${requiredQty} ${item.unit || "pcs"}. Remaining stock is low: ${newStock}!`
              : `Deducted ${requiredQty} ${item.unit || "pcs"}. Current stock: ${newStock}.`,
          });
        }
      }
    }

    return {
      totalDeductedCount,
      results,
    };
  },
});
