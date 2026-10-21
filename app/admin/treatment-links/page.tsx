'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  getAllTreatmentLinks,
  saveTreatmentLink,
  deleteTreatmentLink,
  toggleTreatmentLink,
  TreatmentLink,
  TreatmentInventoryItem,
} from '@/services/treatmentLinks';
import { getAllInventory, Inventory } from '@/services/inventory';
import {
  Link2,
  Plus,
  Trash2,
  Edit,
  Save,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Layers,
  FlaskConical,
  Package,
  Check,
  Info,
  Crown,
  Stethoscope,
  RotateCcw,
} from 'lucide-react';

/**
 * Standard dental procedure definitions aligned with the Prescription module.
 * Includes Cap / Crown, Root Canal, Extraction, Cleaning, and all catalog items.
 */
interface PrescriptionTreatmentDef {
  name: string;
  category: 'Crown & Cap' | 'Surgery & Extraction' | 'Endodontics' | 'Restorative' | 'Hygiene' | 'Prosthodontics' | 'Implantology' | 'Cosmetic' | 'Diagnostics' | 'Orthodontics';
  isCrownOrCap: boolean;
  defaultPrice?: number;
  autoLinks: {
    label: string;
    type: 'crown' | 'inventory' | 'investigation';
    description: string;
  }[];
  defaultNotes: string;
  defaultItems: {
    keywords: string[];
    fallbackName: string;
    quantity: number;
    unit: string;
  }[];
}

const PRESCRIPTION_TREATMENTS: PrescriptionTreatmentDef[] = [
  {
    name: 'Crown Cutting Done',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 0,
    autoLinks: [
      {
        label: 'Crowns Register (Status: Cutting)',
        type: 'crown',
        description: 'Auto-syncs patient to Crowns & Revenue Register with tooth numbers and Crown Cutting status',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts crown tooth prep impression and clinic consumables',
      },
    ],
    defaultNotes: 'Auto-syncs patient to Crown Register as Crown Cutting & deducts prep consumables',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['syringe', 'dispovan', 'needle'], fallbackName: 'Disposable Syringe 2ml', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Cap Cutting Done',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 0,
    autoLinks: [
      {
        label: 'Crowns Register (Status: Cutting)',
        type: 'crown',
        description: 'Auto-syncs patient to Crowns & Revenue Register with tooth numbers and Crown Cutting status',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts cap prep impression and clinic consumables',
      },
    ],
    defaultNotes: 'Auto-syncs patient to Crown Register as Cap Cutting & deducts prep materials',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['syringe', 'dispovan', 'needle'], fallbackName: 'Disposable Syringe 2ml', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Crown Fixed',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 0,
    autoLinks: [
      {
        label: 'Crowns Register (Status: Fixed)',
        type: 'crown',
        description: 'Auto-marks crown as Fixed in Crown Register with fixed date & completion status',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts permanent cementation materials and articulating paper',
      },
    ],
    defaultNotes: 'Auto-updates patient to Crown Fixed in Crowns Register & deducts cementation items',
    defaultItems: [
      { keywords: ['cement', 'gic', 'luting', 'glass ionomer'], fallbackName: 'Luting Cement (GIC Type 1)', quantity: 1, unit: 'pcs' },
      { keywords: ['articulating', 'paper'], fallbackName: 'Articulating Paper', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'PFM Crown (Metal Ceramic) - ₹2500',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 2500,
    autoLinks: [
      {
        label: 'Crowns Register (PFM ₹2,500)',
        type: 'crown',
        description: 'Auto-classifies crown type as PFM and records ₹2,500 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts impression & cementation materials',
      },
    ],
    defaultNotes: 'PFM crown preparation, lab sync & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'gic', 'luting'], fallbackName: 'Luting Cement (GIC)', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'PFM Crown (Metal Ceramic) - ₹3500',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 3500,
    autoLinks: [
      {
        label: 'Crowns Register (PFM ₹3,500)',
        type: 'crown',
        description: 'Auto-classifies crown type as PFM and records ₹3,500 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts impression & cementation materials',
      },
    ],
    defaultNotes: 'PFM crown preparation, lab sync & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'gic', 'luting'], fallbackName: 'Luting Cement (GIC)', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'PFM Crown (Metal Ceramic) - ₹5000',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 5000,
    autoLinks: [
      {
        label: 'Crowns Register (PFM ₹5,000)',
        type: 'crown',
        description: 'Auto-classifies crown type as PFM and records ₹5,000 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts premium PFM impression & cementation consumables',
      },
    ],
    defaultNotes: 'Premium PFM crown preparation, lab sync & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'gic', 'luting'], fallbackName: 'Luting Cement (GIC)', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Zirconia Crown (Metal Free) - ₹8000',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 8000,
    autoLinks: [
      {
        label: 'Crowns Register (Zirconia ₹8,000)',
        type: 'crown',
        description: 'Auto-classifies crown type as Zirconia (Metal Free) and records ₹8,000 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts precision impression & resin luting consumables',
      },
    ],
    defaultNotes: 'Zirconia metal-free crown preparation & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'resin', 'gic'], fallbackName: 'Resin / Luting Cement', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Zirconia Crown (Metal Free) - ₹10000',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 10000,
    autoLinks: [
      {
        label: 'Crowns Register (Zirconia ₹10,000)',
        type: 'crown',
        description: 'Auto-classifies crown type as Zirconia (Metal Free) and records ₹10,000 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts precision impression & resin luting consumables',
      },
    ],
    defaultNotes: 'High translucency Zirconia crown preparation & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'resin', 'gic'], fallbackName: 'Resin / Luting Cement', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Zirconia Crown (Metal Free) - ₹15000',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 15000,
    autoLinks: [
      {
        label: 'Crowns Register (Zirconia ₹15,000)',
        type: 'crown',
        description: 'Auto-classifies crown type as Zirconia (Metal Free) and records ₹15,000 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts precision impression & resin luting consumables',
      },
    ],
    defaultNotes: 'Multi-layered Zirconia crown preparation & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'resin', 'gic'], fallbackName: 'Resin / Luting Cement', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Zirconia Crown (Metal Free) - ₹20000',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 20000,
    autoLinks: [
      {
        label: 'Crowns Register (Zirconia ₹20,000)',
        type: 'crown',
        description: 'Auto-classifies crown type as Zirconia (Metal Free) and records ₹20,000 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts precision aesthetic crown consumables',
      },
    ],
    defaultNotes: 'Premium 3D aesthetic Zirconia crown preparation & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'resin', 'gic'], fallbackName: 'Resin / Luting Cement', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Zirconia Crown (Metal Free) - ₹30000',
    category: 'Crown & Cap',
    isCrownOrCap: true,
    defaultPrice: 30000,
    autoLinks: [
      {
        label: 'Crowns Register (Zirconia ₹30,000)',
        type: 'crown',
        description: 'Auto-classifies crown type as Zirconia (Metal Free) and records ₹30,000 patient revenue',
      },
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts ultra-premium aesthetic consumables',
      },
    ],
    defaultNotes: 'Ultra-premium aesthetic Zirconia crown preparation & cementation',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'resin', 'gic'], fallbackName: 'Resin / Luting Cement', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Tooth Extraction',
    category: 'Surgery & Extraction',
    isCrownOrCap: false,
    defaultPrice: 1500,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts syringe, local anaesthetic cartridge, and gauze from inventory',
      },
    ],
    defaultNotes: 'Auto-deduct syringe, local anaesthetic and cotton for extraction',
    defaultItems: [
      { keywords: ['syringe', 'dispovan', 'needle'], fallbackName: 'Disposable Syringe 2ml', quantity: 1, unit: 'pcs' },
      { keywords: ['lignox', 'lignocaine', 'anaesthetic', 'la'], fallbackName: 'Lignox 2% Cartridge', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Root Canal / RCT',
    category: 'Endodontics',
    isCrownOrCap: false,
    defaultPrice: 5000,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts irrigation syringe and cotton rolls',
      },
    ],
    defaultNotes: 'Standard RCT irrigation syringe and cotton rolls',
    defaultItems: [
      { keywords: ['syringe', 'dispovan', 'needle'], fallbackName: 'Disposable Syringe 2ml', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Teeth Cleaning',
    category: 'Hygiene',
    isCrownOrCap: false,
    defaultPrice: 1000,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts saliva ejector and cotton swabs',
      },
    ],
    defaultNotes: 'Ultrasonic scaling suction & swabs',
    defaultItems: [
      { keywords: ['saliva', 'ejector', 'suction'], fallbackName: 'Saliva Ejector', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 1, unit: 'pcs' },
    ],
  },
  {
    name: 'Dental Filling',
    category: 'Restorative',
    isCrownOrCap: false,
    defaultPrice: 1200,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts composite bonding agent and cotton isolation',
      },
    ],
    defaultNotes: 'Composite filling bonding & isolation',
    defaultItems: [
      { keywords: ['composite', 'bonding', 'etchant'], fallbackName: 'Bonding Agent', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Dental Bridge',
    category: 'Prosthodontics',
    isCrownOrCap: false,
    defaultPrice: 15000,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts impression material and luting cement',
      },
    ],
    defaultNotes: 'Bridge impression material and cementation items',
    defaultItems: [
      { keywords: ['alginate', 'impression', 'putty'], fallbackName: 'Impression Material (Alginate)', quantity: 1, unit: 'pack' },
      { keywords: ['cement', 'gic', 'luting'], fallbackName: 'Luting Cement (GIC)', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
    ],
  },
  {
    name: 'Dental Implant',
    category: 'Implantology',
    isCrownOrCap: false,
    defaultPrice: 25000,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts surgical syringe, cotton rolls, and saliva ejector',
      },
    ],
    defaultNotes: 'Implant procedure surgical consumables',
    defaultItems: [
      { keywords: ['syringe', 'dispovan', 'needle'], fallbackName: 'Disposable Syringe 2ml', quantity: 1, unit: 'pcs' },
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
      { keywords: ['saliva', 'ejector', 'suction'], fallbackName: 'Saliva Ejector', quantity: 1, unit: 'pcs' },
    ],
  },
  {
    name: 'Teeth Whitening',
    category: 'Cosmetic',
    isCrownOrCap: false,
    defaultPrice: 4000,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts bleaching isolation and suction',
      },
    ],
    defaultNotes: 'Bleaching isolation and suction',
    defaultItems: [
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 2, unit: 'pcs' },
      { keywords: ['saliva', 'ejector', 'suction'], fallbackName: 'Saliva Ejector', quantity: 1, unit: 'pcs' },
    ],
  },
  {
    name: 'Dental Checkup',
    category: 'Diagnostics',
    isCrownOrCap: false,
    defaultPrice: 500,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts routine checkup swab consumables',
      },
    ],
    defaultNotes: 'Routine diagnostic checkup consumables',
    defaultItems: [
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 1, unit: 'pcs' },
    ],
  },
  {
    name: 'Braces Consultation',
    category: 'Orthodontics',
    isCrownOrCap: false,
    defaultPrice: 1000,
    autoLinks: [
      {
        label: 'Consumables Auto-Deduct',
        type: 'inventory',
        description: 'Auto-deducts orthodontic diagnostic consultation items',
      },
    ],
    defaultNotes: 'Orthodontic diagnostic consultation',
    defaultItems: [
      { keywords: ['cotton', 'gauze'], fallbackName: 'Cotton Rolls', quantity: 1, unit: 'pcs' },
    ],
  },
];

/**
 * Merged display representation of a treatment rule
 */
interface UnifiedTreatmentRule {
  treatmentName: string;
  category: string;
  isCrownOrCap: boolean;
  defaultPrice?: number;
  autoLinks: {
    label: string;
    type: 'crown' | 'inventory' | 'investigation';
    description: string;
  }[];
  isCustomized: boolean; // Saved in database
  dbId?: string;
  enabled: boolean;
  notes: string;
  items: TreatmentInventoryItem[];
}

export default function TreatmentLinksPage() {
  const [links, setLinks] = useState<TreatmentLink[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE' | 'CUSTOMIZED' | 'PRESET'>('ALL');

  // Form state
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTreatmentName, setFormTreatmentName] = useState('');
  const [formItems, setFormItems] = useState<TreatmentInventoryItem[]>([]);
  const [formEnabled, setFormEnabled] = useState(true);
  const [formNotes, setFormNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Simulator state
  const [simTreatment, setSimTreatment] = useState('');
  const [simQty, setSimQty] = useState<number>(1);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [linksData, invData] = await Promise.all([
        getAllTreatmentLinks(),
        getAllInventory(),
      ]);
      setLinks(linksData);
      setInventory(invData);
    } catch (err) {
      console.error('Failed to load treatment links data:', err);
      alert('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper to resolve an inventory item or default by keyword match
   */
  const resolveInventoryItem = (
    keywords: string[],
    fallbackName: string,
    quantity: number,
    unit: string
  ): TreatmentInventoryItem => {
    for (const kw of keywords) {
      const match = inventory.find((i) => i.name.toLowerCase().includes(kw.toLowerCase()));
      if (match) {
        return {
          inventory_id: match.id || (match as any)._id,
          inventory_name: match.name,
          quantity,
          unit: match.unit || unit,
          current_stock: match.quantity,
        };
      }
    }
    return {
      inventory_name: fallbackName,
      quantity,
      unit,
    };
  };

  /**
   * Combine database rules with all Prescription Treatments into a complete unified list.
   * Every treatment added in Prescription is guaranteed to appear!
   */
  const unifiedRules: UnifiedTreatmentRule[] = useMemo(() => {
    const list: UnifiedTreatmentRule[] = [];
    const dbMap = new Map<string, TreatmentLink>();

    links.forEach((l) => {
      dbMap.set(l.treatment_name.trim().toLowerCase(), l);
    });

    // 1. Process all standard Prescription Treatments
    PRESCRIPTION_TREATMENTS.forEach((pDef) => {
      const dbMatch = dbMap.get(pDef.name.toLowerCase());
      if (dbMatch) {
        // Enriched with live inventory details
        const enrichedItems: TreatmentInventoryItem[] = dbMatch.items.map((i) => {
          const inv = inventory.find(
            (invItem) =>
              (i.inventory_id && (invItem.id === i.inventory_id || (invItem as any)._id === i.inventory_id)) ||
              invItem.name.trim().toLowerCase() === i.inventory_name.trim().toLowerCase()
          );
          return {
            ...i,
            inventory_id: inv ? (inv.id || (inv as any)._id) : i.inventory_id,
            inventory_name: inv ? inv.name : i.inventory_name,
            current_stock: inv ? inv.quantity : i.current_stock,
            unit: i.unit || inv?.unit || 'pcs',
          };
        });

        list.push({
          treatmentName: pDef.name,
          category: pDef.category,
          isCrownOrCap: pDef.isCrownOrCap,
          defaultPrice: pDef.defaultPrice,
          autoLinks: pDef.autoLinks,
          isCustomized: true,
          dbId: dbMatch._id || dbMatch.id,
          enabled: dbMatch.enabled,
          notes: dbMatch.notes || pDef.defaultNotes,
          items: enrichedItems,
        });

        dbMap.delete(pDef.name.toLowerCase());
      } else {
        // Fallback default preset with matched clinic inventory
        const defaultItems = pDef.defaultItems.map((item) =>
          resolveInventoryItem(item.keywords, item.fallbackName, item.quantity, item.unit)
        );

        list.push({
          treatmentName: pDef.name,
          category: pDef.category,
          isCrownOrCap: pDef.isCrownOrCap,
          defaultPrice: pDef.defaultPrice,
          autoLinks: pDef.autoLinks,
          isCustomized: false,
          dbId: undefined,
          enabled: true,
          notes: pDef.defaultNotes,
          items: defaultItems,
        });
      }
    });

    // 2. Add any other custom treatment rules that the user might have saved in the database
    dbMap.forEach((customLink) => {
      const isCrown =
        customLink.treatment_name.toLowerCase().includes('crown') ||
        customLink.treatment_name.toLowerCase().includes('cap');

      const enrichedItems: TreatmentInventoryItem[] = customLink.items.map((i) => {
        const inv = inventory.find(
          (invItem) =>
            (i.inventory_id && (invItem.id === i.inventory_id || (invItem as any)._id === i.inventory_id)) ||
            invItem.name.trim().toLowerCase() === i.inventory_name.trim().toLowerCase()
        );
        return {
          ...i,
          inventory_id: inv ? (inv.id || (inv as any)._id) : i.inventory_id,
          inventory_name: inv ? inv.name : i.inventory_name,
          current_stock: inv ? inv.quantity : i.current_stock,
          unit: i.unit || inv?.unit || 'pcs',
        };
      });

      list.push({
        treatmentName: customLink.treatment_name,
        category: isCrown ? 'Crown & Cap' : 'Restorative',
        isCrownOrCap: isCrown,
        autoLinks: isCrown
          ? [
              {
                label: 'Crowns Register Auto-Link',
                type: 'crown',
                description: 'Auto-syncs patient to Crowns Register',
              },
              {
                label: 'Consumables Auto-Deduct',
                type: 'inventory',
                description: 'Auto-deducts linked materials from inventory',
              },
            ]
          : [
              {
                label: 'Consumables Auto-Deduct',
                type: 'inventory',
                description: 'Auto-deducts linked materials from inventory',
              },
            ],
        isCustomized: true,
        dbId: customLink._id || customLink.id,
        enabled: customLink.enabled,
        notes: customLink.notes || '',
        items: enrichedItems,
      });
    });

    return list;
  }, [links, inventory]);

  // Open modal for new rule
  const handleAddNew = () => {
    setEditingId(null);
    setFormTreatmentName('');
    setFormItems([{ inventory_id: '', inventory_name: '', quantity: 1, unit: 'pcs' }]);
    setFormEnabled(true);
    setFormNotes('');
    setShowModal(true);
  };

  // Open modal for editing ANY treatment (customized or preset)
  const handleEdit = (rule: UnifiedTreatmentRule) => {
    setEditingId(rule.dbId || null);
    setFormTreatmentName(rule.treatmentName);
    setFormItems(
      rule.items.map((i) => ({
        inventory_id: i.inventory_id || '',
        inventory_name: i.inventory_name,
        quantity: i.quantity || 1,
        unit: i.unit || 'pcs',
      }))
    );
    setFormEnabled(rule.enabled);
    setFormNotes(rule.notes || '');
    setShowModal(true);
  };

  // Add material item row in form
  const handleAddItemRow = () => {
    setFormItems((prev) => [
      ...prev,
      { inventory_id: '', inventory_name: '', quantity: 1, unit: 'pcs' },
    ]);
  };

  // Remove material item row in form
  const handleRemoveItemRow = (index: number) => {
    if (formItems.length === 1) {
      alert('A rule must have at least one inventory item.');
      return;
    }
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Update item in row
  const handleUpdateItemRow = (index: number, updates: Partial<TreatmentInventoryItem>) => {
    setFormItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...updates };

        if (updates.inventory_name !== undefined) {
          const matchedInv = inventory.find(
            (inv) => inv.name.toLowerCase() === updates.inventory_name?.toLowerCase()
          );
          if (matchedInv) {
            next.inventory_id = matchedInv.id || (matchedInv as any)._id;
            next.unit = matchedInv.unit || next.unit || 'pcs';
          }
        }
        return next;
      })
    );
  };

  // Save Rule to Convex
  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTreatmentName.trim()) {
      alert('Please enter or select a treatment name.');
      return;
    }

    const validItems = formItems.filter((i) => i.inventory_name.trim());
    if (validItems.length === 0) {
      alert('Please specify at least one valid inventory item.');
      return;
    }

    try {
      setIsSaving(true);
      await saveTreatmentLink({
        id: editingId || undefined,
        treatment_name: formTreatmentName.trim(),
        items: validItems.map((item) => {
          const matchedInv = inventory.find(
            (inv) =>
              (item.inventory_id && (inv.id === item.inventory_id || (inv as any)._id === item.inventory_id)) ||
              inv.name.toLowerCase() === item.inventory_name.trim().toLowerCase()
          );
          return {
            inventory_id: matchedInv?.id || (matchedInv as any)?._id || item.inventory_id,
            inventory_name: matchedInv?.name || item.inventory_name.trim(),
            quantity: Math.max(1, Number(item.quantity) || 1),
            unit: item.unit || matchedInv?.unit || 'pcs',
          };
        }),
        enabled: formEnabled,
        notes: formNotes.trim() || undefined,
      });

      setShowModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to save treatment link rule:', err);
      alert(err.message || 'Failed to save treatment rule');
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle enabled/disabled
  const handleToggle = async (rule: UnifiedTreatmentRule) => {
    if (!rule.dbId) {
      // If it's a preset not yet saved in DB, save it with toggled status
      try {
        await saveTreatmentLink({
          treatment_name: rule.treatmentName,
          items: rule.items,
          enabled: !rule.enabled,
          notes: rule.notes,
        });
        await loadData();
      } catch (err) {
        console.error('Failed to toggle preset status:', err);
      }
      return;
    }

    try {
      await toggleTreatmentLink(rule.dbId, !rule.enabled);
      setLinks((prev) =>
        prev.map((l) => ((l._id || l.id) === rule.dbId ? { ...l, enabled: !rule.enabled } : l))
      );
    } catch (err) {
      console.error('Failed to toggle status:', err);
      alert('Failed to update status.');
    }
  };

  // Delete / Reset rule
  const handleDeleteOrReset = async (rule: UnifiedTreatmentRule) => {
    if (!rule.dbId) return;
    if (
      !confirm(
        `Are you sure you want to ${
          PRESCRIPTION_TREATMENTS.some((p) => p.name === rule.treatmentName)
            ? 'reset custom settings for "' + rule.treatmentName + '" back to default?'
            : 'delete auto-link rule for "' + rule.treatmentName + '"?'
        }`
      )
    ) {
      return;
    }

    try {
      await deleteTreatmentLink(rule.dbId);
      await loadData();
    } catch (err) {
      console.error('Failed to delete/reset rule:', err);
      alert('Failed to update rule.');
    }
  };

  // 1-Click: Sync / Save All Prescription Treatments to Database
  const handleSyncAllPrescriptionTreatments = async () => {
    if (
      !confirm(
        'Save all 20 standard Prescription treatments (including Cap/Crown cutting, Crown fixed, RCT, Extractions, PFM & Zirconia variations) to the database? Existing custom rules will be preserved.'
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      for (const pDef of PRESCRIPTION_TREATMENTS) {
        // If not already in DB, save it
        const alreadyInDb = links.some(
          (l) => l.treatment_name.toLowerCase() === pDef.name.toLowerCase()
        );
        if (!alreadyInDb) {
          const defaultItems = pDef.defaultItems.map((item) =>
            resolveInventoryItem(item.keywords, item.fallbackName, item.quantity, item.unit)
          );

          await saveTreatmentLink({
            treatment_name: pDef.name,
            items: defaultItems,
            enabled: true,
            notes: pDef.defaultNotes,
          });
        }
      }

      await loadData();
      alert('All Prescription treatments have been synchronized into Treatment Auto-Link! You can customize materials and quantities anytime.');
    } catch (err: any) {
      console.error('Failed to sync all prescription treatments:', err);
      alert('Error syncing treatments: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Filtered rules
  const filteredRules = useMemo(() => {
    return unifiedRules.filter((rule) => {
      const matchesSearch =
        rule.treatmentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.items.some((i) => i.inventory_name.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        categoryFilter === 'ALL'
          ? true
          : categoryFilter === 'CROWN_CAP'
          ? rule.isCrownOrCap
          : rule.category === categoryFilter;

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ACTIVE'
          ? rule.enabled
          : statusFilter === 'INACTIVE'
          ? !rule.enabled
          : statusFilter === 'CUSTOMIZED'
          ? rule.isCustomized
          : !rule.isCustomized;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [unifiedRules, searchTerm, categoryFilter, statusFilter]);

  // KPI Metrics
  const activeCount = unifiedRules.filter((l) => l.enabled).length;
  const crownCapCount = unifiedRules.filter((l) => l.isCrownOrCap).length;
  const customizedCount = unifiedRules.filter((l) => l.isCustomized).length;
  const lowStockCount = unifiedRules.reduce((count, l) => {
    const hasLow = l.items.some(
      (item) => item.current_stock !== undefined && item.current_stock < 10
    );
    return count + (hasLow ? 1 : 0);
  }, 0);

  // Simulation calculation
  const simulationResults = useMemo(() => {
    if (!simTreatment) return null;
    const simLower = simTreatment.toLowerCase();

    const match = unifiedRules.find((l) => {
      if (!l.enabled) return false;
      const tLower = l.treatmentName.toLowerCase();
      if (tLower === simLower) return true;
      if (simLower.includes(tLower) || tLower.includes(simLower)) return true;

      // Special Cap/Crown check
      const simCrownOrCap = simLower.includes('crown') || simLower.includes('cap');
      const ruleCrownOrCap = tLower.includes('crown') || tLower.includes('cap');
      if (simCrownOrCap && ruleCrownOrCap) {
        if (
          (simLower.includes('cutting') && tLower.includes('cutting')) ||
          (simLower.includes('fixed') && tLower.includes('fixed')) ||
          (simLower.includes('pfm') && tLower.includes('pfm')) ||
          (simLower.includes('zirconia') && tLower.includes('zirconia'))
        ) {
          return true;
        }
      }

      return false;
    });

    if (!match) return { matched: false, rule: null, items: [] };

    const items = match.items.map((item) => {
      const needed = item.quantity * Math.max(1, simQty);
      const current = item.current_stock ?? 0;
      const after = Math.max(0, current - needed);
      return {
        name: item.inventory_name,
        perProcedure: item.quantity,
        totalDeduct: needed,
        unit: item.unit || 'pcs',
        currentStock: current,
        afterStock: after,
        isLow: after < 10,
      };
    });

    return { matched: true, rule: match, items };
  }, [simTreatment, simQty, unifiedRules]);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/inventory" className="hover:text-blue-600 transition flex items-center gap-1">
              <Layers size={14} /> Inventory Management
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-semibold">Treatment Auto-Link</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <span className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
              <Link2 size={24} />
            </span>
            Treatment Auto-Link & Registers
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Manage auto-links for all treatments added in Prescription. Crown & Cap treatments auto-sync to the Crowns & Revenue Register, while linked clinic materials (syringes, local anaesthetics, impression materials, luting cements) auto-deduct from Inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            onClick={handleSyncAllPrescriptionTreatments}
            className="border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl h-10 shadow-sm transition"
          >
            <Sparkles size={15} className="mr-1.5 text-blue-600" />
            Sync All Prescription Treatments
          </Button>

          <Button
            onClick={handleAddNew}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl h-10 px-4 shadow-md shadow-blue-600/20 transition flex items-center gap-1.5"
          >
            <Plus size={16} />
            Add Custom Rule
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Prescription Treatments
            </span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Stethoscope size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-900">{unifiedRules.length}</span>
            <span className="text-xs text-slate-500">in catalog</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {customizedCount} customized in DB · {unifiedRules.length - customizedCount} ready presets
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
              Crown & Cap Auto-Links
            </span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Crown size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-amber-600">{crownCapCount}</span>
            <span className="text-xs text-slate-500">procedures</span>
          </div>
          <p className="text-[11px] text-amber-600/80 mt-1 font-medium">
            Auto-syncs to Crowns & Revenue Register
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Active Auto-Deductions
            </span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-600">{activeCount}</span>
            <span className="text-xs text-slate-500">of {unifiedRules.length} enabled</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Trigger on prescription completion
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Low Stock Alerts
            </span>
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <AlertTriangle size={18} />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-rose-600">{lowStockCount}</span>
            <span className="text-xs text-slate-500">procedures affected</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Materials with stock below 10 units
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Search by treatment (e.g. Crown, Cap, Extraction, RCT) or material..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 bg-slate-50/50 border-slate-200 rounded-xl text-sm h-10 focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-medium">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({unifiedRules.length})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-white text-emerald-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('CUSTOMIZED')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  statusFilter === 'CUSTOMIZED'
                    ? 'bg-white text-blue-700 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Customized ({customizedCount})
              </button>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={loadData}
              className="text-slate-500 hover:text-slate-900 rounded-xl h-9"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Category:
          </span>
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Treatments
          </button>
          <button
            onClick={() => setCategoryFilter('CROWN_CAP')}
            className={`px-3 py-1 rounded-lg font-semibold transition shrink-0 flex items-center gap-1.5 ${
              categoryFilter === 'CROWN_CAP'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <Crown size={13} />
            Crown & Cap ({crownCapCount})
          </button>
          <button
            onClick={() => setCategoryFilter('Surgery & Extraction')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 ${
              categoryFilter === 'Surgery & Extraction'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Extraction & Surgery
          </button>
          <button
            onClick={() => setCategoryFilter('Endodontics')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 ${
              categoryFilter === 'Endodontics'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Root Canal / RCT
          </button>
          <button
            onClick={() => setCategoryFilter('Restorative')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 ${
              categoryFilter === 'Restorative'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Filling & Restorative
          </button>
          <button
            onClick={() => setCategoryFilter('Hygiene')}
            className={`px-3 py-1 rounded-lg font-medium transition shrink-0 ${
              categoryFilter === 'Hygiene'
                ? 'bg-slate-900 text-white font-semibold'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Teeth Cleaning
          </button>
        </div>
      </div>

      {/* Rules List / Cards */}
      {loading ? (
        <div className="py-20 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">Loading prescription auto-link treatments...</p>
        </div>
      ) : filteredRules.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Link2 size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Matching Treatments Found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            {searchTerm
              ? `No treatments matching "${searchTerm}". Try searching by procedure name like Crown, Cap, RCT, or Extraction.`
              : 'Sync prescription treatments or add a custom treatment rule.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={handleSyncAllPrescriptionTreatments}
              className="text-xs rounded-xl border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100"
            >
              <Sparkles size={14} className="mr-1.5" />
              Sync All Prescription Treatments
            </Button>
            <Button
              onClick={handleAddNew}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl"
            >
              <Plus size={14} className="mr-1.5" />
              Add Custom Rule
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => {
            return (
              <div
                key={rule.treatmentName}
                className={`bg-white rounded-2xl border transition-all duration-200 p-5 flex flex-col justify-between shadow-sm hover:shadow-md ${
                  rule.isCrownOrCap
                    ? 'border-amber-200/90 bg-gradient-to-b from-amber-50/20 to-white'
                    : rule.enabled
                    ? 'border-slate-200/90'
                    : 'border-slate-200/50 bg-slate-50/60 opacity-75'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="text-base font-bold text-slate-900 truncate flex items-center gap-1.5">
                          {rule.isCrownOrCap && (
                            <span className="p-1 bg-amber-100 text-amber-700 rounded-lg inline-flex">
                              <Crown size={14} />
                            </span>
                          )}
                          {rule.treatmentName}
                        </h3>

                        {rule.defaultPrice !== undefined && rule.defaultPrice > 0 && (
                          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                            ₹{rule.defaultPrice.toLocaleString()}
                          </span>
                        )}

                        {rule.isCustomized ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Customized in DB
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Prescription Default
                          </span>
                        )}
                      </div>

                      {/* Auto-Link Targets / Destinations */}
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {rule.autoLinks.map((al, idx) => (
                          <span
                            key={idx}
                            title={al.description}
                            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                              al.type === 'crown'
                                ? 'bg-amber-100/80 text-amber-800 border border-amber-200'
                                : 'bg-blue-50 text-blue-700 border border-blue-200'
                            }`}
                          >
                            {al.type === 'crown' ? <Crown size={11} /> : <Package size={11} />}
                            {al.label}
                          </span>
                        ))}
                      </div>

                      {rule.notes && (
                        <p className="text-xs text-slate-500 mt-2 line-clamp-2">{rule.notes}</p>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggle(rule)}
                        title={rule.enabled ? 'Click to Pause Rule' : 'Click to Enable Rule'}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition ${
                          rule.enabled
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {rule.enabled ? 'Enabled' : 'Paused'}
                      </button>

                      <button
                        onClick={() => handleEdit(rule)}
                        className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                        title="Customize / Edit Rule"
                      >
                        <Edit size={16} />
                      </button>

                      {rule.isCustomized && (
                        <button
                          onClick={() => handleDeleteOrReset(rule)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Reset to Default Preset"
                        >
                          <RotateCcw size={15} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Linked Inventory Items */}
                  <div className="mt-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Consumables Auto-Deducted:
                      </span>
                      <button
                        onClick={() => handleEdit(rule)}
                        className="text-[11px] font-semibold text-blue-600 hover:underline"
                      >
                        Customize Materials
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {rule.items.map((item, idx) => {
                        const stock = item.current_stock;
                        const isStockLow = stock !== undefined && stock < 10;
                        const isOutOfStock = stock === 0;

                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-5 h-5 rounded-lg bg-blue-100/70 text-blue-700 font-bold flex items-center justify-center shrink-0 text-[10px]">
                                {item.quantity}x
                              </span>
                              <span className="font-semibold text-slate-800 truncate">
                                {item.inventory_name}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-slate-500 font-medium text-[11px]">
                                -{item.quantity} {item.unit || 'pcs'}
                              </span>

                              {stock !== undefined ? (
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[11px] flex items-center gap-1 ${
                                    isOutOfStock
                                      ? 'bg-rose-100 text-rose-700'
                                      : isStockLow
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-emerald-100 text-emerald-800'
                                  }`}
                                  title={`Current stock in inventory: ${stock} ${item.unit || 'pcs'}`}
                                >
                                  {isOutOfStock ? (
                                    'Out of stock'
                                  ) : isStockLow ? (
                                    <>
                                      <AlertTriangle size={11} /> Stock: {stock}
                                    </>
                                  ) : (
                                    <>
                                      <Check size={11} /> Stock: {stock}
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Unlinked Stock</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-emerald-600" />
                    Triggers on prescription completion
                  </span>
                  <button
                    onClick={() => handleEdit(rule)}
                    className="font-semibold text-blue-600 hover:text-blue-700"
                  >
                    Edit & Customize →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live Test / Simulator Section */}
      <Card className="rounded-3xl border-slate-200/90 shadow-sm overflow-hidden bg-gradient-to-br from-white to-slate-50">
        <CardHeader className="p-6 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <FlaskConical size={20} />
              </span>
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Treatment Auto-Link Simulator
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Test any treatment from Prescription (e.g. Crown Cutting, Cap Cutting, PFM Crown, RCT, Extraction) to preview the exact materials deducted and the registers updated.
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Treatment Name / Description
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="e.g. Crown Cutting Done, Cap Cutting Done, PFM Crown, RCT, Extraction..."
                  value={simTreatment}
                  onChange={(e) => setSimTreatment(e.target.value)}
                  className="rounded-xl bg-white border-slate-200"
                />
                <select
                  onChange={(e) => setSimTreatment(e.target.value)}
                  value={simTreatment}
                  className="border border-slate-200 rounded-xl px-3 text-xs bg-white font-medium text-slate-700 max-w-[200px]"
                >
                  <option value="">Quick Pick</option>
                  {unifiedRules.map((l) => (
                    <option key={l.treatmentName} value={l.treatmentName}>
                      {l.treatmentName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Procedure Qty (e.g. number of teeth)
              </label>
              <Input
                type="number"
                min="1"
                value={simQty}
                onChange={(e) => setSimQty(Math.max(1, parseInt(e.target.value) || 1))}
                className="rounded-xl bg-white border-slate-200"
              />
            </div>
          </div>

          {/* Simulator Output */}
          {simTreatment && (
            <div className="mt-4 p-4 rounded-2xl border bg-white space-y-3">
              {simulationResults?.matched ? (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={16} />
                      Matched Rule: &ldquo;{simulationResults.rule?.treatmentName}&rdquo;
                    </div>

                    <div className="flex items-center gap-2">
                      {simulationResults.rule?.isCrownOrCap && (
                        <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200">
                          <Crown size={11} /> Auto-Syncs to Crowns & Revenue Register
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                          <th className="pb-2">Material</th>
                          <th className="pb-2">Deduct Qty</th>
                          <th className="pb-2">Current Stock</th>
                          <th className="pb-2">Remaining After</th>
                          <th className="pb-2">Stock Health</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {simulationResults.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 font-bold text-slate-800">{item.name}</td>
                            <td className="py-2.5 font-bold text-rose-600">
                              -{item.totalDeduct} {item.unit}
                            </td>
                            <td className="py-2.5 text-slate-600">
                              {item.currentStock} {item.unit}
                            </td>
                            <td className="py-2.5 font-bold text-slate-900">
                              {item.afterStock} {item.unit}
                            </td>
                            <td className="py-2.5">
                              {item.isLow ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <AlertTriangle size={11} /> Restock Recommended
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <Check size={11} /> Healthy Stock
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-amber-700">
                  <Info size={16} />
                  No active auto-link rule matches &ldquo;{simTreatment}&rdquo;. No inventory would be deducted.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal for Add / Edit Rule */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Link2 size={18} />
                </span>
                <h3 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Treatment Auto-Link Rule' : 'Customize Treatment Auto-Link'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              {/* Treatment Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Treatment / Procedure Name <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2">
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Crown Cutting Done, Cap Cutting Done, Root Canal, Tooth Extraction..."
                    value={formTreatmentName}
                    onChange={(e) => setFormTreatmentName(e.target.value)}
                    className="rounded-xl border-slate-200 text-sm font-medium"
                  />
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-400">
                      Pick from Prescription catalog:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-100">
                      {PRESCRIPTION_TREATMENTS.map((p) => (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => {
                            setFormTreatmentName(p.name);
                            if (formNotes === '' || formNotes === p.defaultNotes) {
                              setFormNotes(p.defaultNotes);
                            }
                          }}
                          className={`text-[11px] px-2 py-0.5 rounded-md transition flex items-center gap-1 ${
                            formTreatmentName === p.name
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-white hover:bg-blue-50 hover:text-blue-600 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {p.isCrownOrCap && <Crown size={10} />}
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Linked Inventory Items Builder */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Materials to Deduct from Inventory <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus size={13} /> Add Another Material
                  </button>
                </div>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-500 text-[11px]">Material #{idx + 1}</span>
                        {formItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-slate-400 hover:text-rose-600 transition p-1"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                        {/* Select from Inventory */}
                        <div className="sm:col-span-7">
                          <select
                            value={item.inventory_name}
                            onChange={(e) =>
                              handleUpdateItemRow(idx, { inventory_name: e.target.value })
                            }
                            className="w-full h-9 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-800"
                          >
                            <option value="">Select Inventory Material...</option>
                            {inventory.map((inv) => (
                              <option key={inv.id || (inv as any)._id} value={inv.name}>
                                {inv.name} (Stock: {inv.quantity} {inv.unit || 'pcs'})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Deduct Quantity */}
                        <div className="sm:col-span-3">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItemRow(idx, {
                                  quantity: Math.max(1, parseInt(e.target.value) || 1),
                                })
                              }
                              className="h-9 rounded-xl text-center font-bold text-xs"
                              placeholder="Qty"
                            />
                            <span className="text-slate-400 text-[11px] shrink-0">qty</span>
                          </div>
                        </div>

                        {/* Unit */}
                        <div className="sm:col-span-2">
                          <Input
                            type="text"
                            value={item.unit || 'pcs'}
                            onChange={(e) => handleUpdateItemRow(idx, { unit: e.target.value })}
                            className="h-9 rounded-xl text-center text-xs"
                            placeholder="Unit"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="block text-xs font-bold text-slate-800">Rule Status</span>
                  <span className="text-[11px] text-slate-500">
                    {formEnabled
                      ? 'Actively deducts stock when prescription is saved'
                      : 'Paused (will not deduct stock)'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormEnabled(!formEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notes / Description (Optional)
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Auto-syncs to Crown Register and deducts syringe, alginate, and cotton"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="rounded-xl border-slate-200 text-xs"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl text-xs h-10 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs h-10 px-5 font-semibold shadow-md shadow-blue-600/20"
                >
                  {isSaving ? (
                    <RefreshCw size={14} className="animate-spin mr-1.5" />
                  ) : (
                    <Save size={14} className="mr-1.5" />
                  )}
                  {editingId ? 'Update Rule' : 'Save Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
