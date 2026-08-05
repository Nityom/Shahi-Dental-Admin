"use client";
import { useState, useEffect, useCallback } from 'react';
import { addInventory, getAllInventory, deleteInventory, updateInventory, Inventory } from '@/services/inventory';
import { PlusCircle, X, Trash2, Search, ArrowUp, ArrowDown, Package, Pill, RefreshCw, Edit } from 'lucide-react';
import { useIsAdmin } from '@/hooks/use-is-admin';
import { ConvexHttpClient } from "convex/browser";
// @ts-ignore
import { api } from "@/convex/_generated/api";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
}
const convex = new ConvexHttpClient(convexUrl);

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
    is_consumable: false
  });

  const [Inventorys, setInventorys] = useState<Inventory[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { isAdmin } = useIsAdmin();
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<keyof Inventory>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isLoadingInventorys, setIsLoadingInventorys] = useState<boolean>(true);
  
  // Edit Mode States
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

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
  }, [fetchInventorys, fetchTodaySales, sortField, sortDirection]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === 'quantity' || name === 'rate') {
      setFormData({
        ...formData,
        [name]: value === '' ? 0 : Number(value)
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
        // Update existing inventory
        await updateInventory(editingId, formData);
        setSuccess(true);
      } else {
        // Add new inventory
        await addInventory(formData);
        setSuccess(true);
      }
      resetForm();
      fetchInventorys();

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || `Failed to ${isEditMode ? 'update' : 'add'} inventory`);
      } else {
        setError(`Failed to ${isEditMode ? 'update' : 'add'} inventory`);
      }
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
      is_consumable: inventory.is_consumable || false
    });
    setIsEditMode(true);
    setEditingId(inventory.id || null);
    setError('');
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this Inventory?")) {
      setIsDeleting(true);
      try {
        await deleteInventory(id);
        setInventorys(Inventorys.filter(Inventory => Inventory.id !== id));
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
      is_consumable: false
    });
    setError('');
    setIsEditMode(false);
    setEditingId(null);
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

      // Refresh inventory and today's sales to show updated data
      fetchInventorys();
      fetchTodaySales();

      setTimeout(() => {
        setSalesSuccess(false);
      }, 3000);

      alert(`Sale recorded successfully! Total: ₹${totalAmount.toFixed(2)}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record sale';
      setSalesError(errorMsg);
      alert(errorMsg);
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

  const filteredInventorys = Inventorys.filter(Inventory =>
    Inventory.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (Inventory.company && Inventory.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const sortedInventorys = [...filteredInventorys].sort((a: Inventory, b: Inventory) => {
    if (sortField === 'created_at') {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return sortDirection === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime();
    }

    if (sortField === 'name' || sortField === 'company') {
      const valueA = (a[sortField] || '').toLowerCase();
      const valueB = (b[sortField] || '').toLowerCase();
      return sortDirection === 'asc'
        ? valueA.localeCompare(valueB)
        : valueB.localeCompare(valueA);
    }

    const numA = typeof a[sortField] === 'number' ? a[sortField] as number : 0;
    const numB = typeof b[sortField] === 'number' ? b[sortField] as number : 0;

    return sortDirection === 'asc'
      ? numA - numB
      : numB - numA;
  });

  const renderSortIcon = (field: keyof Inventory) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  };

  return (
    <div className="min-h-screen bg-white w-full overflow-auto scrollbar-none">
      <div className="w-full">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Inventory Management</h1>
          <p className="text-gray-600 mt-1">Add and manage inventory for your dental clinic</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Inventory Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Pill className="mr-2 text-blue-500" size={20} />
                  {isEditMode ? 'Edit Inventory' : 'Add New Inventory'}
                </h2>
                {isEditMode && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
                  >
                    <X size={16} className="mr-1" />
                    Cancel Edit
                  </button>
                )}
              </div>

              {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded-md mb-6 flex justify-between items-center">
                  <span>{error}</span>
                  <button onClick={() => setError('')}>
                    <X size={18} />
                  </button>
                </div>
              )}

              {success && (
                <div className="bg-green-100 text-green-800 px-4 py-3 rounded-md mb-6 flex items-center justify-between">
                  <span>Inventory {isEditMode ? 'updated' : 'added'} successfully!</span>
                  <button onClick={() => setSuccess(false)}>
                    <X size={18} />
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Inventory Name*
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Inventory name"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter company name"
                  />
                </div>

                <div>
                  <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity*
                  </label>
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter quantity"
                  />
                </div>

                <div>
                  <label htmlFor="rate" className="block text-sm font-medium text-gray-700 mb-1">
                    Rate (₹)
                  </label>
                  <div className="relative">

                    <input
                      type="number"
                      id="rate"
                      name="rate"
                      value={formData.rate}
                      onChange={handleChange}
                      required
                      className="w-full pl-3 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 
             [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="Enter rate"
                    />

                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter Inventory description"
                  ></textarea>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_consumable"
                    name="is_consumable"
                    checked={!!formData.is_consumable}
                    onChange={(e) => setFormData({ ...formData, is_consumable: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="is_consumable" className="ml-2 block text-sm text-gray-700">
                    Mark as consumable item
                  </label>
                </div>

                <div className="flex justify-between">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center"
                  >
                    <X size={16} className="mr-1" />
                    Clear
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={16} className="mr-2 animate-spin" />
                        <span>{isEditMode ? 'Updating...' : 'Adding...'}</span>
                      </>
                    ) : (
                      <>
                        {isEditMode ? (
                          <Edit size={16} className="mr-2" />
                        ) : (
                          <PlusCircle size={16} className="mr-2" />
                        )}
                        <span>{isEditMode ? 'Update Inventory' : 'Add Inventory'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Daily Sales Form */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Package className="mr-2 text-green-500" size={20} />
                  Record Daily Sales
                </h2>
                <button
                  onClick={() => setShowSalesForm(!showSalesForm)}
                  className="text-sm px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                >
                  {showSalesForm ? 'Hide' : 'Show'} Form
                </button>
              </div>

              {showSalesForm && (
                <>
                  {salesError && (
                    <div className="bg-red-100 text-red-800 p-4 rounded-md mb-4 flex justify-between items-center">
                      <span>{salesError}</span>
                      <button onClick={() => setSalesError('')}>
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  {salesSuccess && (
                    <div className="bg-green-100 text-green-800 px-4 py-3 rounded-md mb-4 flex items-center justify-between">
                      <span>Sale recorded successfully!</span>
                      <button onClick={() => setSalesSuccess(false)}>
                        <X size={18} />
                      </button>
                    </div>
                  )}

                  <form onSubmit={handleSalesSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="inventory_select" className="block text-sm font-medium text-gray-700 mb-1">
                        Select Inventory Item*
                      </label>
                      <select
                        id="inventory_select"
                        name="inventory_select"
                        value={salesFormData.inventory_id}
                        onChange={handleSalesFormChange}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="">-- Select Item --</option>
                        {Inventorys
                          .filter(inv => inv.quantity > 0)
                          .map(inv => (
                            <option key={inv.id} value={inv.id}>
                              {inv.name} (Stock: {inv.quantity}, Rate: ₹{inv.rate})
                            </option>
                          ))}
                      </select>
                    </div>

                    {selectedInventory && (
                      <div className="bg-blue-50 p-3 rounded-md">
                        <p className="text-sm text-blue-700">
                          <strong>{selectedInventory.name}</strong>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Available: {selectedInventory.quantity} units | Rate: ₹{selectedInventory.rate}
                        </p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="sales_quantity" className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity Sold*
                      </label>
                      <input
                        type="number"
                        id="sales_quantity"
                        name="quantity"
                        value={salesFormData.quantity}
                        onChange={handleSalesFormChange}
                        min="1"
                        max={selectedInventory?.quantity || 999}
                        required
                        disabled={!selectedInventory}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                        placeholder="Enter quantity sold"
                      />
                    </div>

                    <div>
                      <label htmlFor="sales_rate" className="block text-sm font-medium text-gray-700 mb-1">
                        Selling Rate (₹)*
                      </label>
                      <input
                        type="number"
                        id="sales_rate"
                        name="rate"
                        value={salesFormData.rate}
                        onChange={handleSalesFormChange}
                        min="0"
                        step="0.01"
                        required
                        disabled={!selectedInventory}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                        placeholder="Enter selling rate"
                      />
                    </div>

                    {selectedInventory && salesFormData.quantity > 0 && salesFormData.rate > 0 && (
                      <div className="bg-green-50 p-3 rounded-md border border-green-200">
                        <p className="text-sm font-semibold text-green-800">
                          Total Amount: ₹{(salesFormData.quantity * salesFormData.rate).toFixed(2)}
                        </p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="sales_notes" className="block text-sm font-medium text-gray-700 mb-1">
                        Notes (Optional)
                      </label>
                      <textarea
                        id="sales_notes"
                        name="notes"
                        value={salesFormData.notes}
                        onChange={handleSalesFormChange}
                        rows={2}
                        disabled={!selectedInventory}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                        placeholder="Add any notes about this sale"
                      ></textarea>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        type="button"
                        onClick={resetSalesForm}
                        disabled={salesLoading}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center disabled:opacity-50"
                      >
                        <X size={16} className="mr-1" />
                        Clear
                      </button>
                      <button
                        type="submit"
                        disabled={salesLoading || !selectedInventory}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {salesLoading ? (
                          <>
                            <RefreshCw size={16} className="mr-2 animate-spin" />
                            <span>Recording...</span>
                          </>
                        ) : (
                          <>
                            <Package size={16} className="mr-2" />
                            <span>Record Sale</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}

              {!showSalesForm && (
                <p className="text-sm text-gray-600">
                  Click "Show Form" to record direct sales from inventory at the end of the day.
                </p>
              )}
            </div>

            {/* Quick Stats Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Inventory Stats</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700">Total Inventorys</p>
                  <p className="text-2xl font-bold text-blue-800">{sortedInventorys.length}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-700">Total Value</p>
                  <p className="text-2xl font-bold text-green-800">
                    ₹{sortedInventorys.reduce((total, med) => total + (med.quantity * med.rate), 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm text-yellow-700">Low Stock</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {sortedInventorys.filter(med => med.quantity < 10).length}
                  </p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-700">Companies</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {new Set(sortedInventorys.map(med => med.company).filter(Boolean)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Inventorys List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <Package className="mr-2 text-blue-500" size={20} />
                  Inventory 
                </h2>
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search Inventorys..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>

              {isLoadingInventorys ? (
                <div className="flex justify-center items-center h-64">
                  <RefreshCw size={32} className="animate-spin text-blue-500" />
                </div>
              ) : sortedInventorys.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <Package size={48} className="mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No Inventorys found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? "Try a different search term" : "Add your first Inventory using the form"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                            <div className="flex items-center space-x-1">
                              <span>Name</span>
                              {renderSortIcon('name')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('company')}>
                            <div className="flex items-center space-x-1">
                              <span>Company</span>
                              {renderSortIcon('company')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('quantity')}>
                            <div className="flex items-center space-x-1">
                              <span>Quantity</span>
                              {renderSortIcon('quantity')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('rate')}>
                            <div className="flex items-center space-x-1">
                              <span>Rate</span>
                              {renderSortIcon('rate')}
                            </div>
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {sortedInventorys.map((Inventory) => (
                          <tr key={Inventory.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-900">{Inventory.name}</div>
                                {Inventory.is_consumable && (
                                  <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                                    Consumable
                                  </span>
                                )}
                              </div>
                              {Inventory.description && (
                                <div className="text-xs text-gray-500 truncate max-w-xs" title={Inventory.description}>
                                  {Inventory.description}
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {Inventory.company || "-"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                Number(Inventory.quantity) < 10
                                  ? 'bg-red-100 text-red-800'
                                  : Number(Inventory.quantity) <= 20
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                {Inventory.quantity}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              ₹{Number(Inventory.rate).toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => handleEdit(Inventory)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit inventory item"
                              >
                                <Edit size={18} />
                              </button>
                              {isAdmin && (
                                <button
                                  onClick={() => Inventory.id && handleDelete(Inventory.id)}
                                  disabled={isDeleting}
                                  className="text-red-600 hover:text-red-900 ml-3"
                                  title="Delete inventory item"
                                >
                                  <Trash2 size={18} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 text-right text-sm text-gray-500">
                    Showing {sortedInventorys.length} of {Inventorys.length} Inventorys
                  </div>
                </>
              )}
            </div>

            {/* Today's Sales Report */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">Today's Sales</h3>
                <button 
                  onClick={fetchTodaySales}
                  className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-1"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
              
              {isLoadingSales ? (
                <div className="flex justify-center items-center py-8">
                  <RefreshCw size={24} className="animate-spin text-blue-500" />
                </div>
              ) : todaySales.length === 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg text-center">
                  <p className="text-sm text-gray-600">No sales recorded today yet.</p>
                  <p className="text-xs text-gray-500 mt-1">Use the form above to record your first sale!</p>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg mb-4 border border-green-200">
                    <p className="text-sm text-green-700 mb-1">Total Sales Today</p>
                    <p className="text-3xl font-bold text-green-800">₹{(typeof todayTotal === 'number' ? todayTotal : parseFloat(todayTotal) || 0).toFixed(2)}</p>
                    <p className="text-xs text-green-600 mt-1">{todaySales.length} transaction(s)</p>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {todaySales.map((sale, index) => (
                      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-gray-100">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-800">{sale.inventory_name}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              Qty: {sale.quantity} × ₹{Number(sale.rate).toFixed(2)} = ₹{Number(sale.total_amount).toFixed(2)}
                            </p>
                            {sale.notes && (
                              <p className="text-xs text-gray-500 mt-1 italic">"{sale.notes}"</p>
                            )}
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-sm font-semibold text-green-700">₹{Number(sale.total_amount).toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{new Date(sale._creationTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button 
                      onClick={() => window.open('/admin/medicines/sales', '_blank')}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
                    >
                      View Full Sales Report →
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Tips and Help Card */}
            <div className="bg-white rounded-lg shadow-md p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-3">Quick Tips</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-700 mb-2">Managing Inventory</h4>
                  <ul className="text-sm text-blue-600 space-y-1">
                    <li>• Items with less than 5 units are highlighted in red</li>
                    <li>• Click column headers to sort your inventory</li>
                    <li>• Use search to quickly find Inventorys</li>
                  </ul>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-700 mb-2">Adding New Inventorys</h4>
                  <ul className="text-sm text-purple-600 space-y-1">
                    <li>• Required fields are marked with *</li>
                    <li>• Include detailed descriptions for better organization</li>
                    <li>• Company names help track suppliers</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}