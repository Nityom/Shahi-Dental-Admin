"use client";
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Calendar, Package, IndianRupee, Percent, RefreshCw, PieChart, Users, Pill, Activity, Search } from 'lucide-react';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { useIsAdmin } from '@/hooks/use-is-admin';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

interface SalesReport {
  medicine_name: string;
  company: string;
  period: string;
  total_transactions: number;
  total_quantity: number;
  total_cost: number;
  total_revenue: number;
  total_profit: number;
}

interface PatientSalesReport {
  patient_id: string;
  patient_name: string;
  phone_number: string;
  total_bills: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: string;
}

interface InventorySalesReport {
  sale_date: string;
  total_transactions: number;
  total_quantity: number;
  total_amount: number;
}

interface InventorySalesResponse {
  success: boolean;
  report_type: string;
  start_date: string;
  end_date: string;
  summary: {
    total_amount: number;
    total_quantity: number;
    total_days: number;
    avg_daily_amount: number;
  };
  data: InventorySalesReport[];
}

interface ConsumableUsageReport {
  usage_date?: string;
  consumable_name?: string;
  period: string;
  total_transactions?: number;
  total_usage_count?: number;
  unique_items?: number;
  days_used?: number;
  total_quantity: number;
  total_cost: number;
  avg_cost_per_unit?: number;
  first_usage?: string;
  last_usage?: string;
}

interface ConsumableUsageResponse {
  success: boolean;
  report_type: string;
  group_by: string;
  start_date: string;
  end_date: string;
  period: string;
  summary: {
    total_cost: number;
    total_quantity: number;
    total_days: number;
    avg_daily_cost: number;
  };
  data: ConsumableUsageReport[];
}

export default function SalesReportPage() {
  const router = useRouter();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<'medicine' | 'patient' | 'inventory' | 'diagnostics'>('medicine');
  // Medicine Sales States
  const [reportType, setReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [groupBy, setGroupBy] = useState<'medicine' | 'company'>('medicine');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesData, setSalesData] = useState<SalesReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Patient Sales States
  const [patientReportType, setPatientReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [patientSalesData, setPatientSalesData] = useState<PatientSalesReport[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [patientError, setPatientError] = useState('');
  const [patientStartDate, setPatientStartDate] = useState('');
  const [patientEndDate, setPatientEndDate] = useState('');

  // Inventory Sales States
  const [inventoryReportType, setInventoryReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [inventorySalesData, setInventorySalesData] = useState<InventorySalesResponse | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [inventoryError, setInventoryError] = useState('');
  const [inventoryStartDate, setInventoryStartDate] = useState('');
  const [inventoryEndDate, setInventoryEndDate] = useState('');

  // Consumable Inventory States
  const [consumableReportType, setConsumableReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [consumableGroupBy, setConsumableGroupBy] = useState<'daily' | 'consumable'>('daily');
  const [consumableUsageData, setConsumableUsageData] = useState<ConsumableUsageResponse | null>(null);
  const [isLoadingConsumables, setIsLoadingConsumables] = useState(false);
  const [consumableError, setConsumableError] = useState('');
  const [consumableStartDate, setConsumableStartDate] = useState('');
  const [consumableEndDate, setConsumableEndDate] = useState('');

  // Diagnostic Tests States
  const [diagnosticReportType, setDiagnosticReportType] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
  const [diagnosticStartDate, setDiagnosticStartDate] = useState('');
  const [diagnosticEndDate, setDiagnosticEndDate] = useState('');
  const [diagnosticTypeFilter, setDiagnosticTypeFilter] = useState<string>('ALL');
  const [diagnosticSearch, setDiagnosticSearch] = useState('');
  const [diagnosticData, setDiagnosticData] = useState<{
    totalOpg: number;
    totalIopar: number;
    totalBlood: number;
    totalSugar: number;
    totalCount: number;
    totalIoparRevenue: number;
    totalBloodRevenue: number;
    totalSugarRevenue: number;
    totalRevenue: number;
    dateWiseBreakdown: any[];
    records: any[];
  } | null>(null);
  const [isLoadingDiagnostics, setIsLoadingDiagnostics] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState('');

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.replace('/admin/patients');
    }
  }, [isAdminLoading, isAdmin, router]);

  useEffect(() => {
    // Set default dates (last 30 days)
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    
    const dateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    setStartDate(dateStr);
    setEndDate(endDateStr);
    setPatientStartDate(dateStr);
    setPatientEndDate(endDateStr);
    setInventoryStartDate(dateStr);
    setInventoryEndDate(endDateStr);
    setConsumableStartDate(dateStr);
    setConsumableEndDate(endDateStr);
    setDiagnosticStartDate(dateStr);
    setDiagnosticEndDate(endDateStr);
  }, []);


  // Update dates when report type changes
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = today; // Always end at today to avoid future data

    switch (reportType) {
      case 'weekly':
        // Last 7 days: today - 6 days to today
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      case 'monthly':
        // Last 30 days: same day last month to today
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        break;
      case 'yearly':
        // Last 365 days: same day last year to today
        start = new Date(today);
        start.setDate(today.getDate() - 365);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, [reportType]);

  // Update patient dates when patient report type changes
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = today;

    switch (patientReportType) {
      case 'weekly':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      case 'monthly':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        break;
      case 'yearly':
        start = new Date(today);
        start.setDate(today.getDate() - 365);
        break;
    }

    setPatientStartDate(start.toISOString().split('T')[0]);
    setPatientEndDate(end.toISOString().split('T')[0]);
  }, [patientReportType]);

  const fetchSalesReport = useCallback(async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const sales = await convex.query(api.medicines.listSalesByDate, {
        start_date: startDate,
        end_date: endDate,
      });

      // Aggregate by medicine or company client-side
      const grouped: Record<string, SalesReport> = {};
      for (const sale of sales) {
        const key = groupBy === 'medicine' ? sale.medicine_name : (sale.company || 'Unknown');
        if (!grouped[key]) {
          grouped[key] = {
            medicine_name: sale.medicine_name,
            company: sale.company || '',
            period: `${startDate} to ${endDate}`,
            total_transactions: 0,
            total_quantity: 0,
            total_cost: 0,
            total_revenue: 0,
            total_profit: 0,
          };
        }
        grouped[key].total_transactions += 1;
        grouped[key].total_quantity += sale.quantity;
        const saleCost = ((sale as any).unit_cost || 0) * sale.quantity;
        grouped[key].total_cost += saleCost;
        grouped[key].total_revenue += sale.total_amount;
        grouped[key].total_profit += sale.total_amount - saleCost;
      }
      setSalesData(Object.values(grouped));
    } catch (err) {
      console.error('Error fetching sales report:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch sales report');
      setSalesData([]);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, groupBy, startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchSalesReport();
    }
  }, [startDate, endDate, fetchSalesReport]);

  // Fetch Patient Sales Report
  const fetchPatientSalesReport = useCallback(async () => {
    setIsLoadingPatients(true);
    setPatientError('');
    
    try {
      const allBills = await convex.query(api.bills.list, {});

      // Group by patient (reference_number) — bills have no bill_date field, show all
      const grouped: Record<string, PatientSalesReport> = {};
      for (const bill of (allBills as any[])) {
        const key = bill.reference_number || bill.patient_id;
        if (!grouped[key]) {
          grouped[key] = {
            patient_id: bill.patient_id,
            patient_name: bill.patient_name || 'Unknown',
            phone_number: bill.phone_number || '',
            total_bills: 0,
            total_amount: 0,
            paid_amount: 0,
            balance_amount: 0,
            payment_status: '',
          };
        }
        grouped[key].total_bills += 1;
        grouped[key].total_amount += bill.total_amount;
        grouped[key].paid_amount += bill.paid_amount;
        grouped[key].balance_amount += bill.balance_amount;
      }

      const result = Object.values(grouped).map((p) => ({
        ...p,
        payment_status:
          p.balance_amount === 0 ? 'PAID' : p.paid_amount > 0 ? 'PARTIAL' : 'PENDING',
      }));
      setPatientSalesData(result);
    } catch (err) {
      console.error('Error fetching patient sales report:', err);
      setPatientError(err instanceof Error ? err.message : 'Failed to fetch patient sales report');
      setPatientSalesData([]);
    } finally {
      setIsLoadingPatients(false);
    }
  }, [patientStartDate, patientEndDate]);

  useEffect(() => {
    if (patientStartDate && patientEndDate && activeTab === 'patient') {
      fetchPatientSalesReport();
    }
  }, [patientStartDate, patientEndDate, activeTab, fetchPatientSalesReport]);

  // Fetch Inventory Sales Report
  const fetchInventorySalesReport = useCallback(async () => {
    setIsLoadingInventory(true);
    setInventoryError('');
    
    try {
      const sales = await convex.query(api.inventory_sales.listByDateRange, {
        start_date: inventoryStartDate,
        end_date: inventoryEndDate,
      });

      // Group sales by date
      const groupedByDate: Record<string, { total_transactions: number; total_quantity: number; total_amount: number }> = {};
      for (const sale of sales) {
        const date = sale.sale_date;
        if (!groupedByDate[date]) {
          groupedByDate[date] = { total_transactions: 0, total_quantity: 0, total_amount: 0 };
        }
        groupedByDate[date].total_transactions += 1;
        groupedByDate[date].total_quantity += sale.quantity;
        groupedByDate[date].total_amount += sale.total_amount;
      }

      const data: InventorySalesReport[] = Object.entries(groupedByDate)
        .map(([date, vals]) => ({ sale_date: date, ...vals }))
        .sort((a, b) => b.sale_date.localeCompare(a.sale_date));

      const totalAmount = data.reduce((s, d) => s + d.total_amount, 0);
      const totalQty = data.reduce((s, d) => s + d.total_quantity, 0);
      const totalDays = data.length;

      setInventorySalesData({
        success: true,
        report_type: inventoryReportType,
        start_date: inventoryStartDate,
        end_date: inventoryEndDate,
        summary: {
          total_amount: totalAmount,
          total_quantity: totalQty,
          total_days: totalDays,
          avg_daily_amount: totalDays > 0 ? totalAmount / totalDays : 0,
        },
        data,
      });
    } catch (err) {
      console.error('Error fetching inventory sales report:', err);
      setInventoryError(err instanceof Error ? err.message : 'Failed to fetch inventory sales report');
      setInventorySalesData(null);
    } finally {
      setIsLoadingInventory(false);
    }
  }, [inventoryReportType, inventoryStartDate, inventoryEndDate]);

  useEffect(() => {
    if (inventoryStartDate && inventoryEndDate && activeTab === 'inventory') {
      fetchInventorySalesReport();
    }
  }, [inventoryStartDate, inventoryEndDate, activeTab, fetchInventorySalesReport]);

  // Update inventory dates when inventory report type changes
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = today;

    switch (inventoryReportType) {
      case 'weekly':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      case 'monthly':
        start = new Date(today);
        start.setDate(today.getDate() - 29);
        break;
      case 'yearly':
        start = new Date(today);
        start.setDate(today.getDate() - 364);
        break;
    }

    setInventoryStartDate(start.toISOString().split('T')[0]);
    setInventoryEndDate(end.toISOString().split('T')[0]);
  }, [inventoryReportType]);

  // Fetch Consumable Usage Report
  const fetchConsumableUsageReport = useCallback(async () => {
    setIsLoadingConsumables(true);
    setConsumableError('');
    
    try {
      // Consumable usage tracking is not available in Convex yet
      setConsumableUsageData({
        success: true,
        report_type: consumableReportType,
        group_by: consumableGroupBy,
        start_date: consumableStartDate,
        end_date: consumableEndDate,
        period: consumableReportType,
        summary: { total_cost: 0, total_quantity: 0, total_days: 0, avg_daily_cost: 0 },
        data: [],
      });
    } catch (err) {
      console.error('Error fetching consumable usage report:', err);
      setConsumableError(err instanceof Error ? err.message : 'Failed to fetch consumable usage report');
      setConsumableUsageData(null);
    } finally {
      setIsLoadingConsumables(false);
    }
  }, [consumableReportType, consumableGroupBy, consumableStartDate, consumableEndDate]);

  useEffect(() => {
    if (consumableStartDate && consumableEndDate && activeTab === 'inventory') {
      fetchConsumableUsageReport();
    }
  }, [consumableStartDate, consumableEndDate, activeTab, fetchConsumableUsageReport]);

  // Update consumable dates when consumable report type changes
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = today;

    switch (consumableReportType) {
      case 'weekly':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      case 'monthly':
        start = new Date(today);
        start.setDate(today.getDate() - 29);
        break;
      case 'yearly':
        start = new Date(today);
        start.setDate(today.getDate() - 364);
        break;
    }

    setConsumableStartDate(start.toISOString().split('T')[0]);
    setConsumableEndDate(end.toISOString().split('T')[0]);
  }, [consumableReportType]);

  // Update diagnostic dates when diagnostic report type changes
  useEffect(() => {
    const today = new Date();
    let start = new Date();
    let end = today;

    switch (diagnosticReportType) {
      case 'weekly':
        start = new Date(today);
        start.setDate(today.getDate() - 6);
        break;
      case 'monthly':
        start = new Date(today);
        start.setDate(today.getDate() - 30);
        break;
      case 'yearly':
        start = new Date(today);
        start.setDate(today.getDate() - 365);
        break;
    }

    setDiagnosticStartDate(start.toISOString().split('T')[0]);
    setDiagnosticEndDate(end.toISOString().split('T')[0]);
  }, [diagnosticReportType]);

  const fetchDiagnosticReport = useCallback(async () => {
    setIsLoadingDiagnostics(true);
    setDiagnosticError('');
    try {
      const res = await convex.query(api.investigations.getAutomaticInvestigationReport, {
        startDate: diagnosticStartDate || undefined,
        endDate: diagnosticEndDate || undefined,
        investigationType: diagnosticTypeFilter,
        search: diagnosticSearch || undefined,
      });
      setDiagnosticData(res);
    } catch (err: any) {
      console.error('Error fetching diagnostic report:', err);
      setDiagnosticError(err.message || 'Failed to fetch diagnostic report');
      setDiagnosticData(null);
    } finally {
      setIsLoadingDiagnostics(false);
    }
  }, [diagnosticStartDate, diagnosticEndDate, diagnosticTypeFilter, diagnosticSearch]);

  useEffect(() => {
    if (activeTab === 'diagnostics') {
      fetchDiagnosticReport();
    }
  }, [diagnosticStartDate, diagnosticEndDate, diagnosticTypeFilter, diagnosticSearch, activeTab, fetchDiagnosticReport]);

  const totalStats = (Array.isArray(salesData) ? salesData : []).reduce(
    (acc, item) => ({
      transactions: acc.transactions + Number(item.total_transactions),
      quantity: acc.quantity + Number(item.total_quantity),
      cost: acc.cost + Number(item.total_cost),
      revenue: acc.revenue + Number(item.total_revenue),
      profit: acc.profit + Number(item.total_profit),
    }),
    { transactions: 0, quantity: 0, cost: 0, revenue: 0, profit: 0 }
  );

  const profitMargin = totalStats.revenue > 0 
    ? ((totalStats.profit / totalStats.revenue) * 100).toFixed(2) 
    : '0.00';

  // Patient Sales Stats
  const patientTotalStats = (Array.isArray(patientSalesData) ? patientSalesData : []).reduce(
    (acc, item) => ({
      totalPatients: acc.totalPatients + 1,
      totalBills: acc.totalBills + Number(item.total_bills),
      totalAmount: acc.totalAmount + Number(item.total_amount),
      paidAmount: acc.paidAmount + Number(item.paid_amount),
      balanceAmount: acc.balanceAmount + Number(item.balance_amount),
    }),
    { totalPatients: 0, totalBills: 0, totalAmount: 0, paidAmount: 0, balanceAmount: 0 }
  );

  if (isAdminLoading || !isAdmin) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{isAdminLoading ? 'Loading...' : 'Redirecting...'}</p>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-6 pt-6 pb-6 overflow-x-hidden">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
          <TrendingUp className="mr-3 text-green-500" size={32} />
          Sales Report
        </h1>
        <p className="text-gray-600">
          Track medicine sales, patient billing, and direct inventory sales with detailed analytics
        </p>
      </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('medicine')}
              className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'medicine'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Pill className="mr-2" size={18} />
              Medicine Sales
            </button>
            <button
              onClick={() => setActiveTab('patient')}
              className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'patient'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Users className="mr-2" size={18} />
              Patient Sales
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'inventory'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Package className="mr-2" size={18} />
              Inventory Sales
            </button>
            <button
              onClick={() => setActiveTab('diagnostics')}
              className={`flex items-center px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'diagnostics'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Activity className="mr-2" size={18} />
              Diagnostic Tests & IOPAR
            </button>
          </div>
        </div>

        {/* Medicine Sales Report */}
        {activeTab === 'medicine' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Period
                  </label>
                  <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group By
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'medicine' | 'company')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="medicine">Medicine Name</option>
                <option value="company">Company</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mt-3">
            <strong>Auto Date Ranges:</strong> Weekly (Last 7 days) • Monthly (Last 30 days) • Yearly (Last 365 days)
          </p>

          <div className="mt-4">
            <button
              onClick={fetchSalesReport}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh Report
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6 overflow-hidden">
          <div className="bg-white rounded-lg shadow-md p-6 pb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 text-left">Total Transactions</p>
              <Calendar className="text-blue-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800 text-left">{totalStats.transactions}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 pb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 text-left">Total Quantity</p>
              <Package className="text-purple-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800 text-left">{totalStats.quantity}</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 pb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 text-left">Total <br/> Cost</p>
              <IndianRupee className="text-orange-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800 text-left">
              ₹{totalStats.cost.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 pb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 text-left">Total Revenue</p>
              <IndianRupee className="text-green-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-gray-800 text-left">
              ₹{totalStats.revenue.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 pb-8">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600 text-left">Total Profit</p>
              <Percent className="text-emerald-500" size={20} />
            </div>
            <p className="text-2xl font-bold text-emerald-600 text-left">
              ₹{totalStats.profit.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-1 text-left">Margin: {profitMargin}%</p>
          </div>
        </div>

        {/* Pie Chart Visualization */}
        {!isLoading && Array.isArray(salesData) && salesData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6 overflow-hidden">
            <div className="flex items-center mb-4">
              <PieChart className="mr-2 text-blue-600" size={24} />
              <h2 className="text-lg font-semibold text-gray-800">
                Sales Distribution by {groupBy === 'medicine' ? 'Medicine' : 'Company'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 overflow-hidden">
              {/* Revenue Pie Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Revenue Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={salesData.map(row => ({
                        name: groupBy === 'medicine' ? row.medicine_name : row.company,
                        value: Number(row.total_revenue),
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {salesData.map((entry, index) => {
                        const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value || 0).toFixed(2)}`} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>

              {/* Profit Pie Chart */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 text-center">Profit Distribution</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={salesData.map(row => ({
                        name: groupBy === 'medicine' ? row.medicine_name : row.company,
                        value: Number(row.total_profit),
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                      outerRadius={80}
                      fill="#82ca9d"
                      dataKey="value"
                    >
                      {salesData.map((entry, index) => {
                        const colors = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#0d9488', '#ea580c'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Pie>
                    <Tooltip formatter={(value) => `₹${Number(value || 0).toFixed(2)}`} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Sales Table */}
        <div className="bg-white rounded-lg shadow-md p-6 overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Sales by {groupBy === 'medicine' ? 'Medicine' : 'Company'}
          </h2>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw size={32} className="animate-spin text-blue-500" />
            </div>
          ) : !Array.isArray(salesData) || salesData.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
              <TrendingUp size={48} className="mx-auto text-gray-400 mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No sales data found</h3>
              <p className="text-gray-500">Try adjusting your filters or date range</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {groupBy === 'medicine' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Medicine Name
                      </th>
                    )}
                    {groupBy === 'company' && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Company
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quantity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cost (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Revenue (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Profit (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Margin %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesData.map((row, index) => {
                    const marginPercent = Number(row.total_revenue) > 0 
                      ? ((Number(row.total_profit) / Number(row.total_revenue)) * 100).toFixed(2) 
                      : '0.00';

                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        {groupBy === 'medicine' && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{row.medicine_name}</div>
                            {row.company && (
                              <div className="text-xs text-gray-500">{row.company}</div>
                            )}
                          </td>
                        )}
                        {groupBy === 'company' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.company || 'Unknown'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.period}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.total_transactions}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {row.total_quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          ₹{Number(row.total_cost).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{Number(row.total_revenue).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ₹{Number(row.total_profit).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            Number(marginPercent) > 30
                              ? 'bg-green-100 text-green-800'
                              : Number(marginPercent) > 10
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                          }`}>
                            {marginPercent}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {/* Patient Sales Report */}
        {activeTab === 'patient' && (
          <>
            {/* Patient Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Period
                  </label>
                  <select
                    value={patientReportType}
                    onChange={(e) => setPatientReportType(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={patientStartDate}
                    onChange={(e) => setPatientStartDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={patientEndDate}
                    onChange={(e) => setPatientEndDate(e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mt-3">
                <strong>Auto Date Ranges:</strong> Weekly (Last 7 days) • Monthly (Last 30 days) • Yearly (Last 365 days)
              </p>

              <div className="mt-4">
                <button
                  onClick={fetchPatientSalesReport}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
                >
                  <RefreshCw size={16} className="mr-2" />
                  Refresh Report
                </button>
              </div>
            </div>

            {/* Patient Summary Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 mb-6 overflow-hidden">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Patients</p>
                  <Users className="text-blue-500" size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-800">{patientTotalStats.totalPatients}</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Bills</p>
                  <Calendar className="text-purple-500" size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-800">{patientTotalStats.totalBills}</p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <IndianRupee className="text-indigo-500" size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  ₹{patientTotalStats.totalAmount.toFixed(2)}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <IndianRupee className="text-green-500" size={20} />
                </div>
                <p className="text-2xl font-bold text-gray-800">
                  ₹{patientTotalStats.paidAmount.toFixed(2)}
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-gray-600">Balance Amount</p>
                  <IndianRupee className="text-red-500" size={20} />
                </div>
                <p className="text-2xl font-bold text-red-600">
                  ₹{patientTotalStats.balanceAmount.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Patient Sales Table */}
            <div className="bg-white rounded-lg shadow-md p-6 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                Patient-wise Sales Summary
              </h2>

              {patientError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-red-700">{patientError}</p>
                </div>
              )}

              {isLoadingPatients ? (
                <div className="flex justify-center items-center h-64">
                  <RefreshCw size={32} className="animate-spin text-blue-500" />
                </div>
              ) : !Array.isArray(patientSalesData) || patientSalesData.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <Users size={48} className="mx-auto text-gray-400 mb-3" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No patient sales data found</h3>
                  <p className="text-gray-500">Try adjusting your date range</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Patient Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Phone Number
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Bills
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount (₹)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Paid Amount (₹)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Balance (₹)
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Payment Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patientSalesData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{row.patient_name || 'Unknown'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.phone_number || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.total_bills}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{Number(row.total_amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                            ₹{Number(row.paid_amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                            ₹{Number(row.balance_amount).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              Number(row.balance_amount) === 0
                                ? 'bg-green-100 text-green-800'
                                : Number(row.paid_amount) > 0
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                            }`}>
                              {Number(row.balance_amount) === 0 ? 'PAID' : Number(row.paid_amount) > 0 ? 'PARTIAL' : 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Inventory Sales Report */}
        {activeTab === 'inventory' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 overflow-hidden">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Period
                  </label>
                  <select
                    value={inventoryReportType}
                    onChange={(e) => setInventoryReportType(e.target.value as 'weekly' | 'monthly' | 'yearly')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="weekly">Weekly (Last 7 Days)</option>
                    <option value="monthly">Monthly (Last 30 Days)</option>
                    <option value="yearly">Yearly (Last 365 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={inventoryStartDate}
                    onChange={(e) => setInventoryStartDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={inventoryEndDate}
                    onChange={(e) => setInventoryEndDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                onClick={fetchInventorySalesReport}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <RefreshCw className="mr-2" size={16} />
                Refresh Report
              </button>
            </div>

            {/* Summary Cards */}
            {inventorySalesData && inventorySalesData.summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Package size={32} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Items Sold</p>
                      <p className="text-2xl font-bold text-gray-900">{inventorySalesData.summary.total_quantity || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Calendar size={32} className="text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Days with Sales</p>
                      <p className="text-2xl font-bold text-gray-900">{inventorySalesData.summary.total_days || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <TrendingUp size={32} className="text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Avg Daily Sales</p>
                      <p className="text-2xl font-bold text-gray-900">₹{inventorySalesData.summary.avg_daily_amount?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800">
                  Daily Sales Report
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {inventorySalesData?.start_date && inventorySalesData?.end_date 
                    ? `${new Date(inventorySalesData.start_date).toLocaleDateString('en-IN')} - ${new Date(inventorySalesData.end_date).toLocaleDateString('en-IN')}`
                    : 'Select a date range'}
                </p>
              </div>

              {isLoadingInventory ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Loading inventory sales data...</p>
                </div>
              ) : inventoryError ? (
                <div className="p-8 text-center text-red-600">
                  <p className="font-semibold mb-2">Error loading data</p>
                  <p className="text-sm">{inventoryError}</p>
                  <button
                    onClick={fetchInventorySalesReport}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Try Again
                  </button>
                </div>
              ) : !inventorySalesData || !Array.isArray(inventorySalesData.data) || inventorySalesData.data.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Package size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="font-semibold mb-2">No inventory sales data found</p>
                  <p className="text-sm">Record direct sales from Inventory Management to start tracking</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Transactions
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Array.isArray(inventorySalesData.data) && inventorySalesData.data.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.sale_date ? new Date(row.sale_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.total_transactions || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row.total_quantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-semibold">
                            ₹{Number(row.total_amount || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* Diagnostic Tests & IOPAR Report */}
        {activeTab === 'diagnostics' && (
          <>
            {/* Filters */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Diagnostic & Test Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Report Period
                  </label>
                  <select
                    value={diagnosticReportType}
                    onChange={(e) => setDiagnosticReportType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="weekly">Weekly (Last 7 Days)</option>
                    <option value="monthly">Monthly (Last 30 Days)</option>
                    <option value="yearly">Yearly (Last 365 Days)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={diagnosticStartDate}
                    onChange={(e) => setDiagnosticStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={diagnosticEndDate}
                    onChange={(e) => setDiagnosticEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Test Type Filter
                  </label>
                  <select
                    value={diagnosticTypeFilter}
                    onChange={(e) => setDiagnosticTypeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">All Diagnostic Tests</option>
                    <option value="IOPAR">IOPAR / X-Ray (₹200)</option>
                    <option value="BLOOD">Blood Test (₹50)</option>
                    <option value="SUGAR">Sugar Test (₹50)</option>
                    <option value="OPG">OPG</option>
                  </select>
                </div>
              </div>

              {/* Search Bar */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Patient or Test
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by patient name, phone, doctor, or test type..."
                    value={diagnosticSearch}
                    onChange={(e) => setDiagnosticSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {diagnosticError && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
                <p className="text-sm text-red-700">{diagnosticError}</p>
              </div>
            )}

            {/* Diagnostic Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">IOPAR / X-Rays (₹200)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{diagnosticData?.totalIopar || 0} Tests</p>
                    <p className="text-sm font-semibold text-blue-700 mt-1">₹{Number(diagnosticData?.totalIoparRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-full">
                    <Activity className="text-blue-500" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-rose-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Blood Tests (₹50)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{diagnosticData?.totalBlood || 0} Tests</p>
                    <p className="text-sm font-semibold text-rose-700 mt-1">₹{Number(diagnosticData?.totalBloodRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-rose-50 rounded-full">
                    <Activity className="text-rose-500" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-amber-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Sugar Tests (₹50)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{diagnosticData?.totalSugar || 0} Tests</p>
                    <p className="text-sm font-semibold text-amber-700 mt-1">₹{Number(diagnosticData?.totalSugarRevenue || 0).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-full">
                    <Activity className="text-amber-500" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-emerald-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Total Diagnostic Revenue</p>
                    <p className="text-2xl font-bold text-emerald-700 mt-1">₹{Number(diagnosticData?.totalRevenue || 0).toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-500 mt-1">{diagnosticData?.totalCount || 0} total tests performed</p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-full">
                    <IndianRupee className="text-emerald-500" size={24} />
                  </div>
                </div>
              </div>
            </div>

            {/* Diagnostic Records Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Diagnostic Tests & IOPAR Register</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Admin-only sales & test logs auto-detected from prescriptions</p>
                </div>
                <button
                  onClick={fetchDiagnosticReport}
                  className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  <RefreshCw className={`mr-1 ${isLoadingDiagnostics ? 'animate-spin' : ''}`} size={16} />
                  Refresh
                </button>
              </div>

              {isLoadingDiagnostics ? (
                <div className="p-8 text-center text-gray-500">
                  <RefreshCw className="animate-spin inline-block mr-2" size={20} />
                  Loading diagnostic sales records...
                </div>
              ) : !diagnosticData?.records || diagnosticData.records.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  No diagnostic tests found for the selected period and filters.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Patient Name</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tests Performed</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Billed Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {diagnosticData.records.map((row, idx) => (
                        <tr key={row.id || idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {row.prescription_date ? new Date(row.prescription_date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            }) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                            {row.patient_name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {row.phone_number}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            {row.doctor_name || 'Dr. Kautilya Swaroop'}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            <div className="flex flex-wrap gap-1.5">
                              {row.investigation_types?.map((type: string, tIdx: number) => (
                                <span
                                  key={tIdx}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                                >
                                  {type}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-emerald-600">
                            ₹{Number(row.total_amount || 0).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
    </div>
  );
}
