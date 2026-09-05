"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addInventory, getAllInventory, deleteInventory, updateInventory, Inventory, InventorySubdivision } from '@/services/inventory';
import { materialTransactionService } from '@/services/registers';
import { MaterialTransaction } from '@/types/registers';
import { PlusCircle, X, Trash2, Search, ArrowUp, ArrowDown, Package, Pill, RefreshCw, Edit, ArrowDownLeft, ArrowUpRight, History, Layers, ExternalLink } from 'lucide-react';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

const SUBDIVISIONS: InventorySubdivision[] = [
  'One-Time Material',
  'Consumable',
  'Non-Dental / Cleaning Consumable',
  'Record Maintenance Material',
];

interface DailySale {
  inventory_id: string;
  inventory_name: string;
  quantity: number;
  rate: number;
  notes?: string;
  sale_date?: string;
}

export default function AddInventoryPage() {
  const [formData, setFormData] = useState<Inventory>({
    name: '',
    description: '',
    quantity: 0,
    rate: 0,
    company: '',
    is_consumable: true,
    subdivision: 'Consumable',
    unit: 'pcs',
    min_stock_level: 5,
  });

  const [Inventorys, setInventorys] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isAdmin } = useIsAdmin();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedSubdivision, setSelectedSubdivision] = useState<string>('ALL');
  const [sortField, setSortField] = useState<keyof Inventory>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoadingInventorys, setIsLoadingInventorys] = useState<boolean>(true);
  
  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Material Register Logs Modal States
  const [showLogsModal, setShowLogsModal] = useState<boolean>(false);
  const [materialLogs, setMaterialLogs] = useState<MaterialTransaction[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);

  // Inward / Outward Modal States
  const [stockModalType, setStockModalType] = useState<'INWARD' | 'OUTWARD' | null>(null);
  const [selectedStockItem, setSelectedStockItem] = useState<Inventory | null>(null);
  const [stockQty, setStockQty] = useState<number>(1);
  const [stockRate, setStockRate] = useState<number>(0);
  const [stockVendor, setStockVendor] = useState<string>('');
  const [stockInvoice, setStockInvoice] = useState<string>('');
  const [stockNotes, setStockNotes] = useState<string>('');
  const [isStockSubmitting, setIsStockSubmitting] = useState<boolean>(false);

  // Daily Sales Form States
  const [showSalesForm, setShowSalesForm] = useState<boolean>(false);
  const [salesFormData, setSalesFormData] = useState<DailySale>({
    inventory_id: '',
    inventory_name: '',
    quantity: 0,
    rate: 0,
    notes: ''
  });
  const [salesLoading, setSalesLoading] = useState<boolean>(false);
  const [salesError, setSalesError] = useState<string>('');
  const [salesSuccess, setSalesSuccess] = useState<boolean>(false);
  const [selectedInventory, setSelectedInventory] = useState<Inventory | null>(null);

  // Today's Sales Data
  const [todaySales, setTodaySales] = useState<any[]>([]);
  const [todayTotal, setTodayTotal] = useState<number>(0);
  const [isLoadingSales, setIsLoadingSales] = useState<boolean>(false);

  const fetchInventorys = useCallback(async () => {
    setIsLoadingInventorys(true);
    try {
      const data = await getAllInventory();
      setInventorys(data);
    } catch (err) {
      console.error("Failed to fetch Inventorys:", err);
    } finally {
      setIsLoadingInventorys(false);
    }
  }, []);

  const fetchTodaySales = useCallback(async () => {
    setIsLoadingSales(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const sales = await convex.query(api.inventory_sales.listByDate, { sale_date: today });
      setTodaySales(sales.map((s: any) => ({ ...s, id: s._id })));
      const totalValue = sales.reduce((sum: number, s: any) => sum + (Number(s.total_amount) || 0), 0);
      setTodayTotal(totalValue);
    } catch (err) {
      console.error("Failed to fetch today's sales:", err);
    } finally {
      setIsLoadingSales(false);
    }
  }, []);

  useEffect(() => {
    fetchInventorys();
    fetchTodaySales();
  }, [fetchInventorys, fetchTodaySales]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'quantity' || name === 'rate' || name === 'min_stock_level') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : Number(value)
      });
    } else if (name === 'subdivision') {
      setFormData({
        ...formData,
        subdivision: value as InventorySubdivision,
        is_consumable: value === 'Consumable' || value === 'Non-Dental / Cleaning Consumable',
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess(false);

    try {
      if (isEditMode && editingId) {
        await updateInventory(editingId, formData);
        setSuccess(true);
      } else {
        await addInventory(formData);
        // Log initial stock in material transactions
        if (formData.quantity > 0) {
          try {
            await materialTransactionService.record({
              material_name: formData.name,
              subdivision: formData.subdivision || 'Consumable',
              transaction_type: 'INITIAL_STOCK',
              quantity: Number(formData.quantity),
              unit: formData.unit || 'pcs',
              rate: Number(formData.rate) || 0,
              vendor_name: formData.company,
              transaction_date: new Date().toISOString().split('T')[0],
              notes: 'Initial stock recorded on item creation',
            });
          } catch (mErr) {
            console.warn('Initial stock log skipped:', mErr);
          }
        }
        setSuccess(true);
      }
      resetForm();
      fetchInventorys();

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      setError(err.message || `Failed to ${isEditMode ? 'update' : 'add'} inventory`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (inventory: Inventory) => {
    setFormData({
      name: inventory.name,
      description: inventory.description || '',
      quantity: inventory.quantity,
      rate: inventory.rate,
      company: inventory.company || '',
      is_consumable: inventory.is_consumable || false,
      subdivision: inventory.subdivision || (inventory.is_consumable ? 'Consumable' : 'One-Time Material'),
      unit: inventory.unit || 'pcs',
      min_stock_level: inventory.min_stock_level ?? 5,
    });
    setIsEditMode(true);
    setEditingId(inventory.id || null);
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this material item?")) {
      setIsDeleting(true);
      try {
        await deleteInventory(id);
        setInventorys(Inventorys.filter(item => item.id !== id));
      } catch (err) {
        console.error("Failed to delete Inventory:", err);
      } finally {
        setIsDeleting(false);
      }
    }
  };
  
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      quantity: 0,
      rate: 0,
      company: '',
      is_consumable: true,
      subdivision: 'Consumable',
      unit: 'pcs',
      min_stock_level: 5,
    });
    setError('');
    setIsEditMode(false);
    setEditingId(null);
  };

  const openStockModal = (item: Inventory, type: 'INWARD' | 'OUTWARD') => {
    setSelectedStockItem(item);
    setStockModalType(type);
    setStockQty(1);
    setStockRate(item.rate || 0);
    setStockVendor(item.company || '');
    setStockInvoice('');
    setStockNotes('');
  };

  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStockItem || !selectedStockItem.id) return;
    setIsStockSubmitting(true);

    try {
      const today = new Date().toISOString().split('T')[0];
      const subdivision = selectedStockItem.subdivision || (selectedStockItem.is_consumable ? 'Consumable' : 'One-Time Material');
      
      await materialTransactionService.record({
        material_id: selectedStockItem.id,
        material_name: selectedStockItem.name,
        subdivision,
        transaction_type: stockModalType === 'INWARD' ? 'PURCHASE' : 'USAGE',
        quantity: Number(stockQty),
        unit: selectedStockItem.unit || 'pcs',
        rate: Number(stockRate),
        vendor_name: stockVendor || undefined,
        invoice_no: stockInvoice || undefined,
        transaction_date: today,
        notes: stockNotes || undefined,
      });

      setStockModalType(null);
      setSelectedStockItem(null);
      fetchInventorys();
    } catch (err: any) {
      alert(`Error updating stock: ${err.message || 'Failed'}`);
    } finally {
      setIsStockSubmitting(false);
    }
  };

  const openLogsModal = async () => {
    setShowLogsModal(true);
    setIsLoadingLogs(true);
    try {
      const logs = await materialTransactionService.list({});
      setMaterialLogs(logs);
    } catch (err) {
      console.error('Failed to load material logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleInventorySelect = (inventory: Inventory) => {
    setSelectedInventory(inventory);
    setSalesFormData({
      inventory_id: inventory.id || '',
      inventory_name: inventory.name,
      quantity: 1,
      rate: inventory.rate,
      notes: ''
    });
  };

  const handleSalesFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'quantity' || name === 'rate') {
      setSalesFormData({
        ...salesFormData,
        [name]: value === '' ? 0 : Number(value)
      });
    } else if (name === 'inventory_select') {
      const inv = Inventorys.find(i => i.id === value);
      if (inv) {
        handleInventorySelect(inv);
      }
    } else {
      setSalesFormData({
        ...salesFormData,
        [name]: value
      });
    }
  };

  const handleSalesSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSalesLoading(true);
    setSalesError('');

    try {
      const saleDate = new Date().toISOString().split('T')[0];
      const totalAmount = salesFormData.quantity * salesFormData.rate;

      await convex.mutation(api.inventory_sales.record, {
        inventory_id: salesFormData.inventory_id || undefined,
        inventory_name: salesFormData.inventory_name,
        quantity: Number(salesFormData.quantity),
        rate: Number(salesFormData.rate),
        total_amount: totalAmount,
        notes: salesFormData.notes || undefined,
        sale_date: saleDate,
      });

      setSalesSuccess(true);
      setSalesFormData({
        inventory_id: '',
        inventory_name: '',
        quantity: 0,
        rate: 0,
        notes: ''
      });
      setSelectedInventory(null);
      fetchTodaySales();
      fetchInventorys();

      setTimeout(() => {
        setSalesSuccess(false);
      }, 3000);
    } catch (err: any) {
      setSalesError(err.message || 'Failed to record sale');
    } finally {
      setSalesLoading(false);
    }
  };

  const resetSalesForm = () => {
    setSalesFormData({
      inventory_id: '',
      inventory_name: '',
      quantity: 0,
      rate: 0,
      notes: ''
    });
    setSelectedInventory(null);
    setSalesError('');
  };

  const handleSort = (field: keyof Inventory) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filtered by Search & Subdivision
  const filteredInventorys = useMemo(() => {
    return Inventorys.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.company && item.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const itemSub = item.subdivision || (item.is_consumable ? 'Consumable' : 'One-Time Material');
      const matchesSubdivision = selectedSubdivision === 'ALL' || itemSub === selectedSubdivision;

      return matchesSearch && matchesSubdivision;
    });
  }, [Inventorys, searchTerm, selectedSubdivision]);

  const sortedInventorys = useMemo(() => {
    return [...filteredInventorys].sort((a, b) => {
      if (sortField === 'name' || sortField === 'company') {
        const valueA = (a[sortField] || '').toLowerCase();
        const valueB = (b[sortField] || '').toLowerCase();
        return sortDirection === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
      }

      const numA = typeof a[sortField] === 'number' ? (a[sortField] as number) : 0;
      const numB = typeof b[sortField] === 'number' ? (b[sortField] as number) : 0;

      return sortDirection === 'asc' ? numA - numB : numB - numA;
    });
  }, [filteredInventorys, sortField, sortDirection]);

  // Subdivision statistics
  const subdivisionCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: Inventorys.length };
    for (const sub of SUBDIVISIONS) {
      counts[sub] = Inventorys.filter(i => (i.subdivision || (i.is_consumable ? 'Consumable' : 'One-Time Material')) === sub).length;
    }
    return counts;
  }, [Inventorys]);

  const renderSortIcon = (field: keyof Inventory) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 w-full overflow-auto">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="text-blue-600 h-8 w-8" />
              Inventory & Stock Management
            </h1>
            <p className="text-gray-600 mt-1">
              Organize clinic inventory across subdivisions with complete stock & usage tracking
            </p>
          </div>
        </header>

        {/* Subdivision Filter Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
          <button
            onClick={() => setSelectedSubdivision('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
              selectedSubdivision === 'ALL'
                ? 'bg-blue-600 text-white shadow'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All Materials ({subdivisionCounts['ALL'] || 0})
          </button>
          {SUBDIVISIONS.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubdivision(sub)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                selectedSubdivision === sub
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {sub} ({subdivisionCounts[sub] || 0})
            </button>
          ))}
        </div>

        {/* Subdivision Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUBDIVISIONS.map((sub) => {
            const items = Inventorys.filter(i => (i.subdivision || (i.is_consumable ? 'Consumable' : 'One-Time Material')) === sub);
            const totalStock = items.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
            const totalValue = items.reduce((sum, i) => sum + (Number(i.quantity) || 0) * (Number(i.rate) || 0), 0);
            const isSelected = selectedSubdivision === sub;

            return (
              <div
                key={sub}
                onClick={() => setSelectedSubdivision(sub)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
                }`}
              >
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wider truncate mb-1">
                  {sub}
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-gray-900">{items.length}</span>
                  <span className="text-xs text-gray-500">{totalStock} units</span>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600 flex justify-between">
                  <span>Stock Value:</span>
                  <strong className="text-gray-900">₹{totalValue.toLocaleString('en-IN')}</strong>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add / Edit Form Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Pill className="text-blue-600" size={20} />
                  {isEditMode ? 'Edit Material Item' : 'Add New Material Item'}
                </h2>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-xs text-gray-500 hover:text-gray-800 flex items-center"
                  >
                    <X size={14} className="mr-1" />
                    Cancel
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg mb-4 flex justify-between items-center border border-red-200">
                  <span>{error}</span>
                  <button onClick={() => setError('')}><X size={14} /></button>
                </div>
              )}

              {success && (
                <div className="bg-green-50 text-green-700 text-xs p-3 rounded-lg mb-4 flex items-center justify-between border border-green-200">
                  <span>Material {isEditMode ? 'updated' : 'saved'} successfully!</span>
                  <button onClick={() => setSuccess(false)}><X size={14} /></button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Material / Item Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. Composite Shade A2, Extraction Forceps"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Material Category / Subdivision *
                  </label>
                  <select
                    name="subdivision"
                    value={formData.subdivision || 'Consumable'}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    {SUBDIVISIONS.map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Current Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      required
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit (e.g. pcs, box)
                    </label>
                    <input
                      type="text"
                      name="unit"
                      value={formData.unit || 'pcs'}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="pcs, box, ml, pkts"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Unit Rate / Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="rate"
                      value={formData.rate}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Min Alert Stock
                    </label>
                    <input
                      type="number"
                      name="min_stock_level"
                      value={formData.min_stock_level || 5}
                      onChange={handleChange}
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Company / Supplier
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Manufacturer / Vendor name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Notes / Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    placeholder="Specification or storage notes"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-1/3 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                  >
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow transition flex items-center justify-center gap-1"
                  >
                    {isLoading ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : isEditMode ? (
                      <Edit size={14} />
                    ) : (
                      <PlusCircle size={14} />
                    )}
                    {isEditMode ? 'Update Item' : 'Add Material'}
                  </button>
                </div>
              </form>
            </div>

            {/* Daily Sales Form */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Package className="text-green-600" size={18} />
                  Record Daily Direct Sale
                </h3>
                <button
                  onClick={() => setShowSalesForm(!showSalesForm)}
                  className="text-xs px-2.5 py-1 bg-green-50 text-green-700 border border-green-200 rounded-md font-medium"
                >
                  {showSalesForm ? 'Hide' : 'Open'}
                </button>
              </div>

              {showSalesForm && (
                <form onSubmit={handleSalesSubmit} className="space-y-3 mt-3 text-sm">
                  {salesError && <div className="text-xs text-red-600 bg-red-50 p-2 rounded">{salesError}</div>}
                  {salesSuccess && <div className="text-xs text-green-600 bg-green-50 p-2 rounded">Sale recorded!</div>}

                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Item</label>
                    <select
                      name="inventory_select"
                      value={salesFormData.inventory_id}
                      onChange={handleSalesFormChange}
                      required
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                    >
                      <option value="">-- Choose Material --</option>
                      {Inventorys.filter(i => i.quantity > 0).map(i => (
                        <option key={i.id} value={i.id}>{i.name} (Stock: {i.quantity})</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Qty</label>
                      <input
                        type="number"
                        name="quantity"
                        value={salesFormData.quantity}
                        onChange={handleSalesFormChange}
                        min="1"
                        required
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Rate (₹)</label>
                      <input
                        type="number"
                        name="rate"
                        value={salesFormData.rate}
                        onChange={handleSalesFormChange}
                        required
                        className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={resetSalesForm}
                      className="w-1/3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                    >
                      Clear
                    </button>
                    <button
                      type="submit"
                      disabled={salesLoading || !salesFormData.inventory_id}
                      className="w-2/3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold shadow disabled:opacity-50"
                    >
                      {salesLoading ? 'Recording...' : 'Save Direct Sale'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Today's Sales Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Today's Direct Sales</h4>
                <button
                  onClick={fetchTodaySales}
                  className="text-[11px] text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <RefreshCw size={12} className={isLoadingSales ? 'animate-spin' : ''} />
                  Refresh
                </button>
              </div>

              {isLoadingSales ? (
                <div className="py-4 text-center text-xs text-gray-400">Loading sales...</div>
              ) : todaySales.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg text-center">
                  No direct inventory sales recorded today.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-green-50 border border-green-200 p-2.5 rounded-lg flex justify-between items-center text-xs">
                    <span className="font-medium text-green-800">Total Today ({todaySales.length} items):</span>
                    <strong className="text-sm font-bold text-green-900">₹{todayTotal.toFixed(2)}</strong>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                    {todaySales.map((s, idx) => (
                      <div key={idx} className="flex justify-between items-center p-1.5 bg-gray-50 rounded text-[11px]">
                        <span className="font-medium text-gray-800 truncate max-w-[140px]">{s.inventory_name}</span>
                        <span className="text-gray-600 font-semibold">₹{Number(s.total_amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Material Table Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    {selectedSubdivision === 'ALL' ? 'All Material Inventory' : selectedSubdivision}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Showing {sortedInventorys.length} items in current category
                  </p>
                </div>
                <div className="relative w-full sm:w-64">
                  <input
                    type="text"
                    placeholder="Search materials, vendor..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              {isLoadingInventorys ? (
                <div className="flex justify-center items-center py-20">
                  <RefreshCw size={28} className="animate-spin text-blue-600" />
                </div>
              ) : sortedInventorys.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Package size={40} className="mx-auto text-gray-400 mb-2" />
                  <h3 className="text-sm font-semibold text-gray-900">No materials found</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {searchTerm ? "Try adjusting your search filter" : "Add your first item using the form on the left"}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-y border-gray-200 text-gray-600 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 text-left cursor-pointer" onClick={() => handleSort('name')}>
                          <div className="flex items-center gap-1">Name {renderSortIcon('name')}</div>
                        </th>
                        <th className="py-2.5 px-3 text-left">Subdivision</th>
                        <th className="py-2.5 px-3 text-left cursor-pointer" onClick={() => handleSort('company')}>
                          <div className="flex items-center gap-1">Company {renderSortIcon('company')}</div>
                        </th>
                        <th className="py-2.5 px-3 text-center cursor-pointer" onClick={() => handleSort('quantity')}>
                          <div className="flex items-center justify-center gap-1">Stock {renderSortIcon('quantity')}</div>
                        </th>
                        <th className="py-2.5 px-3 text-right cursor-pointer" onClick={() => handleSort('rate')}>
                          <div className="flex items-center justify-end gap-1">Rate {renderSortIcon('rate')}</div>
                        </th>
                        <th className="py-2.5 px-3 text-center">Quick Stock</th>
                        <th className="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sortedInventorys.map((item) => {
                        const sub = item.subdivision || (item.is_consumable ? 'Consumable' : 'One-Time Material');
                        const isLow = Number(item.quantity) <= (item.min_stock_level ?? 5);

                        return (
                          <tr key={item.id} className="hover:bg-gray-50/80 transition">
                            <td className="py-3 px-3">
                              <div className="font-semibold text-gray-900">{item.name}</div>
                              {item.description && (
                                <div className="text-[11px] text-gray-500 truncate max-w-xs">{item.description}</div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                                sub === 'Consumable'
                                  ? 'bg-purple-100 text-purple-700'
                                  : sub === 'One-Time Material'
                                  ? 'bg-blue-100 text-blue-700'
                                  : sub === 'Non-Dental / Cleaning Consumable'
                                  ? 'bg-teal-100 text-teal-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {sub}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-gray-600">{item.company || '-'}</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-bold rounded-full ${
                                isLow ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-green-100 text-green-700'
                              }`}>
                                {item.quantity} {item.unit || 'pcs'}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right font-medium text-gray-900">
                              ₹{Number(item.rate).toFixed(2)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  onClick={() => openStockModal(item, 'INWARD')}
                                  className="p-1 text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 text-[11px] font-medium flex items-center gap-0.5"
                                  title="Record Inward / Purchase"
                                >
                                  <ArrowDownLeft className="w-3.5 h-3.5" />
                                  + In
                                </button>
                                <button
                                  onClick={() => openStockModal(item, 'OUTWARD')}
                                  className="p-1 text-orange-700 hover:bg-orange-50 rounded border border-orange-200 text-[11px] font-medium flex items-center gap-0.5"
                                  title="Record Outward / Usage"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  - Use
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleEdit(item)}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title="Edit Material"
                                >
                                  <Edit size={16} />
                                </button>
                                {isAdmin && (
                                  <button
                                    onClick={() => item.id && handleDelete(item.id)}
                                    disabled={isDeleting}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title="Delete Material"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inward / Outward Stock Transaction Modal */}
      {stockModalType && selectedStockItem && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl animate-scale-up border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                {stockModalType === 'INWARD' ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <ArrowDownLeft className="w-5 h-5" /> Record Inward / Purchase
                  </span>
                ) : (
                  <span className="text-orange-600 flex items-center gap-1">
                    <ArrowUpRight className="w-5 h-5" /> Record Outward / Consumption
                  </span>
                )}
              </h3>
              <button onClick={() => setStockModalType(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg mb-4 text-xs">
              <div className="font-bold text-gray-900">{selectedStockItem.name}</div>
              <div className="text-gray-500 mt-0.5">
                Current Stock: {selectedStockItem.quantity} {selectedStockItem.unit || 'pcs'} | Category: {selectedStockItem.subdivision || 'Consumable'}
              </div>
            </div>

            <form onSubmit={handleStockSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    {stockModalType === 'INWARD' ? 'Quantity Inward *' : 'Quantity Used *'}
                  </label>
                  <input
                    type="number"
                    value={stockQty}
                    onChange={(e) => setStockQty(Math.max(1, Number(e.target.value)))}
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Unit Rate (₹)</label>
                  <input
                    type="number"
                    value={stockRate}
                    onChange={(e) => setStockRate(Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>

              {stockModalType === 'INWARD' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Vendor / Supplier</label>
                    <input
                      type="text"
                      value={stockVendor}
                      onChange={(e) => setStockVendor(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                      placeholder="Vendor name"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Invoice / Bill #</label>
                    <input
                      type="text"
                      value={stockInvoice}
                      onChange={(e) => setStockInvoice(e.target.value)}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                      placeholder="Inv #1234"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes / Purpose</label>
                <input
                  type="text"
                  value={stockNotes}
                  onChange={(e) => setStockNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  placeholder={stockModalType === 'INWARD' ? 'Batch number or purchase info' : 'Used for patient treatment / cleaning'}
                />
              </div>

              <div className="bg-blue-50 p-2.5 rounded-lg text-blue-900 font-medium flex justify-between items-center mt-2">
                <span>Total Transaction Value:</span>
                <strong className="text-sm">₹{(stockQty * stockRate).toFixed(2)}</strong>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setStockModalType(null)}
                  className="w-1/2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isStockSubmitting}
                  className={`w-1/2 py-2 text-white rounded-lg font-semibold shadow transition ${
                    stockModalType === 'INWARD' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isStockSubmitting ? 'Saving...' : stockModalType === 'INWARD' ? 'Confirm Inward' : 'Confirm Outward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Register Logs Quick Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl animate-scale-up border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <History size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Material Register Inward / Outward Logs</h3>
                  <p className="text-xs text-gray-500">Complete audit trail of all purchases, usage, and adjustments</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/admin/registers?tab=MATERIAL"
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <ExternalLink size={13} />
                  Open Full Registers Hub
                </Link>
                <button
                  onClick={() => setShowLogsModal(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              {isLoadingLogs ? (
                <div className="py-16 flex flex-col justify-center items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="text-xs text-gray-500">Loading register logs...</span>
                </div>
              ) : materialLogs.length === 0 ? (
                <div className="py-16 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  No material transactions logged yet. Use the "+ In" or "- Use" buttons on materials to record transactions.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-gray-50 text-gray-600 uppercase font-semibold border-y border-gray-200">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Material Name</th>
                        <th className="py-2.5 px-3">Subdivision</th>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3 text-center">Quantity</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                        <th className="py-2.5 px-3">Vendor / Info</th>
                        <th className="py-2.5 px-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {materialLogs.map((m) => (
                        <tr key={m.id || m._id} className="hover:bg-gray-50/80">
                          <td className="py-2.5 px-3 font-semibold text-gray-800 whitespace-nowrap">
                            {m.transaction_date}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-gray-900">{m.material_name}</td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-medium">
                              {m.subdivision}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                m.transaction_type === 'PURCHASE' || m.transaction_type === 'INITIAL_STOCK'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-orange-100 text-orange-800'
                              }`}
                            >
                              {m.transaction_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold">
                            {m.quantity} {m.unit || 'pcs'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-gray-700">₹{m.rate}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-gray-900">
                            ₹{m.total_cost || m.quantity * m.rate}
                          </td>
                          <td className="py-2.5 px-3 text-gray-600">
                            {m.vendor_name || '-'} {m.invoice_no && `(${m.invoice_no})`}
                          </td>
                          <td className="py-2.5 px-3 text-gray-500 max-w-xs truncate">{m.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Total Logs: <strong>{materialLogs.length}</strong>
              </span>
              <button
                onClick={() => setShowLogsModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}