'use client';

import { useState, useEffect, useMemo } from 'react';
import { billService, Bill } from '@/services/bills';
import { paymentTransactionService, PaymentTransaction } from '@/services/payment-transactions';
import { BillHistoryWithPayments } from '@/components/BillHistoryWithPayments';
import AddPaymentDialog from '@/components/AddPaymentDialog';
import PaymentHistory from '@/components/PaymentHistory';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  X,
  Banknote,
  Smartphone,
  IndianRupee,
  AlertCircle,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Table as TableIcon,
  LayoutList,
  Plus,
  History,
  Printer,
} from 'lucide-react';

// Date & Format helpers (Asia/Kolkata timezone)
const getTodayStr = () => {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
};

const getYesterdayStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(d);
};

const getThisMonthStr = () => {
  return getTodayStr().slice(0, 7);
};

const formatDateDisplay = (dateStr: string) => {
  try {
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
};

const getTxDate = (tx: PaymentTransaction) => {
  if (tx.payment_date) return tx.payment_date;
  if ((tx as any)._creationTime) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date((tx as any)._creationTime));
  }
  return '';
};

const getBillDate = (bill: Bill) => {
  if (bill.bill_date) return bill.bill_date;
  if (bill.created_at) {
    if (bill.created_at.length >= 10 && bill.created_at.includes('-')) {
      return bill.created_at.slice(0, 10);
    }
  }
  if ((bill as any)._creationTime) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date((bill as any)._creationTime));
  }
  return '';
};

const isExtractionBill = (bill: Bill) => {
  if (!bill.items || !Array.isArray(bill.items)) return false;
  return bill.items.some((item: any) => {
    const desc = (item.description || '').toLowerCase();
    return (
      desc.includes('extraction') ||
      desc.includes('tooth removal') ||
      desc.includes('impaction') ||
      desc.includes('surgical') ||
      desc.includes('park')
    );
  });
};

const isCashMethod = (method?: string) => {
  return (method || '').trim().toLowerCase() === 'cash';
};

const isOnlineMethod = (method?: string) => {
  const m = (method || '').trim().toLowerCase();
  return (
    m === 'upi' ||
    m === 'card' ||
    m === 'online' ||
    m === 'net banking' ||
    m === 'netbanking' ||
    m === 'qr' ||
    m === 'gpay' ||
    m === 'phonepe' ||
    m === 'paytm'
  );
};

export default function InstallmentsPage() {
  const [allPendingBills, setAllPendingBills] = useState<Bill[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Date filtering
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'EXTRACTION' | 'OTHER'>('ALL');

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Quick Pay & History Modals for table rows
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [historyBill, setHistoryBill] = useState<Bill | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [allBills, allTxs] = await Promise.all([
        billService.getAll(),
        paymentTransactionService.getAll(),
      ]);

      // Filter bills with pending balance > ₹0.99 and total > 0 (filters out paid-off rounding errors)
      const pending = allBills.filter((bill: Bill) => {
        const total = Number(bill.total_amount) || 0;
        const balance = Number(bill.balance_amount) || 0;
        if (total <= 0) return false;
        if (balance <= 0.99) return false;
        return bill.payment_status === 'PARTIAL' || bill.payment_status === 'PENDING';
      });

      setAllPendingBills(pending);
      setTransactions(allTxs);
    } catch (err) {
      console.error('Error loading installments data:', err);
      setError('Failed to load pending bills or payment transactions. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter transactions based on active date filter
  const filteredTransactions = useMemo(() => {
    if (dateFilterMode === 'ALL') {
      return transactions;
    }
    if (dateFilterMode === 'TODAY') {
      const today = getTodayStr();
      return transactions.filter((t) => getTxDate(t) === today);
    }
    if (dateFilterMode === 'YESTERDAY') {
      const yesterday = getYesterdayStr();
      return transactions.filter((t) => getTxDate(t) === yesterday);
    }
    if (dateFilterMode === 'THIS_MONTH') {
      const month = getThisMonthStr();
      return transactions.filter((t) => getTxDate(t).startsWith(month));
    }
    if (dateFilterMode === 'CUSTOM' && selectedDate) {
      return transactions.filter((t) => getTxDate(t) === selectedDate);
    }
    return transactions;
  }, [transactions, dateFilterMode, selectedDate]);

  // Set of bill IDs associated with filtered transactions
  const billIdsInDateFilter = useMemo(() => {
    return new Set(filteredTransactions.map((t) => t.bill_id).filter(Boolean));
  }, [filteredTransactions]);

  // Financial Metrics
  const totalCashReceived = useMemo(() => {
    return filteredTransactions
      .filter((t) => isCashMethod(t.payment_method))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalOnlineReceived = useMemo(() => {
    return filteredTransactions
      .filter((t) => isOnlineMethod(t.payment_method) || (!isCashMethod(t.payment_method) && (t.payment_method || '').toLowerCase() !== 'cheque'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [filteredTransactions]);

  const totalCollected = useMemo(() => {
    return totalCashReceived + totalOnlineReceived;
  }, [totalCashReceived, totalOnlineReceived]);

  // Filter bills based on category, date, and search query
  const filteredBills = useMemo(() => {
    let list = allPendingBills;

    // 1. Category Filter
    if (categoryFilter === 'EXTRACTION') {
      list = list.filter(isExtractionBill);
    } else if (categoryFilter === 'OTHER') {
      list = list.filter((b) => !isExtractionBill(b));
    }

    // 2. Date Filter
    if (dateFilterMode === 'TODAY') {
      const today = getTodayStr();
      list = list.filter((b) => getBillDate(b) === today || billIdsInDateFilter.has(b.id || ''));
    } else if (dateFilterMode === 'YESTERDAY') {
      const yesterday = getYesterdayStr();
      list = list.filter((b) => getBillDate(b) === yesterday || billIdsInDateFilter.has(b.id || ''));
    } else if (dateFilterMode === 'THIS_MONTH') {
      const month = getThisMonthStr();
      list = list.filter((b) => getBillDate(b).startsWith(month) || billIdsInDateFilter.has(b.id || ''));
    } else if (dateFilterMode === 'CUSTOM' && selectedDate) {
      list = list.filter((b) => getBillDate(b) === selectedDate || billIdsInDateFilter.has(b.id || ''));
    }

    // 3. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((bill) => {
        const patientName = (bill.patient_name || '').toLowerCase();
        const phoneNumber = (bill.phone_number || '').toLowerCase();
        const billNumber = (bill.bill_number || '').toLowerCase();
        const referenceNumber = (bill.reference_number || '').toLowerCase();
        const billId = (bill.id || '').toLowerCase();

        return (
          patientName.includes(q) ||
          phoneNumber.includes(q) ||
          billNumber.includes(q) ||
          referenceNumber.includes(q) ||
          billId.includes(q)
        );
      });
    }

    return list;
  }, [allPendingBills, categoryFilter, dateFilterMode, selectedDate, billIdsInDateFilter, searchQuery]);

  // Outstanding dues for current bill view
  const totalPending = useMemo(() => {
    return filteredBills.reduce((sum, bill) => sum + (Number(bill.balance_amount) || 0), 0);
  }, [filteredBills]);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter, dateFilterMode, selectedDate, pageSize]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredBills.length / pageSize));
  const paginatedBills = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBills.slice(start, start + pageSize);
  }, [filteredBills, currentPage, pageSize]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading pending payments & transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 sm:px-6 pt-6 pb-12 bg-gray-50/40">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Payment Installments & Dues</h1>
            <p className="text-sm text-gray-600 mt-1">
              Track dues, record installment collections, filter by date, and view cash & online totals
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadData()}
              className="px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium transition shadow-sm flex items-center gap-1.5"
            >
              <RefreshCw size={15} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Date & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search patient name, phone, bill no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 text-xs sm:text-sm h-10 border-gray-300 focus:ring-2 focus:ring-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Calendar Date Picker */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
            <CalendarIcon size={16} className="text-blue-600 shrink-0" />
            <span className="text-xs font-semibold text-gray-700 whitespace-nowrap">Filter Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setDateFilterMode(e.target.value ? 'CUSTOM' : 'ALL');
              }}
              className="bg-transparent text-xs sm:text-sm font-medium text-gray-800 outline-none cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => {
                  setSelectedDate('');
                  setDateFilterMode('ALL');
                }}
                title="Clear date filter"
                className="text-gray-400 hover:text-gray-600 ml-1"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Date Quick Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100 text-xs">
          <span className="text-gray-500 font-medium mr-1 flex items-center gap-1">
            <Filter size={13} /> Quick Filter:
          </span>
          <button
            onClick={() => {
              setDateFilterMode('ALL');
              setSelectedDate('');
            }}
            className={`px-3 py-1 rounded-full font-medium transition ${
              dateFilterMode === 'ALL'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Time ({allPendingBills.length})
          </button>
          <button
            onClick={() => {
              setDateFilterMode('TODAY');
              setSelectedDate(getTodayStr());
            }}
            className={`px-3 py-1 rounded-full font-medium transition ${
              dateFilterMode === 'TODAY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => {
              setDateFilterMode('YESTERDAY');
              setSelectedDate(getYesterdayStr());
            }}
            className={`px-3 py-1 rounded-full font-medium transition ${
              dateFilterMode === 'YESTERDAY'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Yesterday
          </button>
          <button
            onClick={() => {
              setDateFilterMode('THIS_MONTH');
              setSelectedDate('');
            }}
            className={`px-3 py-1 rounded-full font-medium transition ${
              dateFilterMode === 'THIS_MONTH'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            This Month
          </button>

          {dateFilterMode !== 'ALL' && (
            <span className="ml-auto text-blue-700 bg-blue-50 border border-blue-200 px-3 py-0.5 rounded-full font-medium flex items-center gap-1.5">
              <span>
                Showing <b>{filteredBills.length}</b> bills
                {dateFilterMode === 'TODAY' && ' for Today'}
                {dateFilterMode === 'YESTERDAY' && ' for Yesterday'}
                {dateFilterMode === 'THIS_MONTH' && ' for This Month'}
                {dateFilterMode === 'CUSTOM' && selectedDate && ` on ${formatDateDisplay(selectedDate)}`}
              </span>
              <button
                onClick={() => {
                  setDateFilterMode('ALL');
                  setSelectedDate('');
                }}
                className="hover:text-blue-900 ml-1"
                title="Reset to all bills"
              >
                <X size={13} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Stats Cards: Cash, Online, Collected, Pending, Count */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Total Cash Received */}
        <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Total Cash Received</h4>
            <Banknote className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-700">₹{totalCashReceived.toLocaleString('en-IN')}</p>
          <p className="text-xs text-emerald-600/90 mt-1">
            {dateFilterMode === 'ALL' ? 'All-time cash' : 'Cash for selected period'}
          </p>
        </div>

        {/* Total Online Received */}
        <div className="bg-purple-50 p-4 rounded-xl border border-purple-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Total Online Received</h4>
            <Smartphone className="h-4 w-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700">₹{totalOnlineReceived.toLocaleString('en-IN')}</p>
          <p className="text-xs text-purple-600/90 mt-1">UPI, Card & Net Banking</p>
        </div>

        {/* Total Collected */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Total Collected</h4>
            <IndianRupee className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700">₹{totalCollected.toLocaleString('en-IN')}</p>
          <p className="text-xs text-blue-600/90 mt-1">Cash + Online total</p>
        </div>

        {/* Total Pending */}
        <div className="bg-rose-50 p-4 rounded-xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total Pending Dues</h4>
            <AlertCircle className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-700">₹{totalPending.toLocaleString('en-IN')}</p>
          <p className="text-xs text-rose-600/90 mt-1">Outstanding balance</p>
        </div>

        {/* Pending Bills */}
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Bills</h4>
            <Receipt className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-amber-700">{filteredBills.length}</p>
          <p className="text-xs text-amber-600/90 mt-1">Active bills with balance</p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Treatment Category Tabs & View Mode Toggle */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        {/* Category Tabs */}
        <div className="flex bg-gray-200/80 p-1 rounded-lg border border-gray-300">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              categoryFilter === 'ALL' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Pending ({allPendingBills.length})
          </button>
          <button
            onClick={() => setCategoryFilter('EXTRACTION')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              categoryFilter === 'EXTRACTION' ? 'bg-white text-red-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Extraction & Surgical ({allPendingBills.filter(isExtractionBill).length})
          </button>
          <button
            onClick={() => setCategoryFilter('OTHER')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              categoryFilter === 'OTHER' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Other Treatments ({allPendingBills.filter((b) => !isExtractionBill(b)).length})
          </button>
        </div>

        {/* View Mode & Page Size Selector */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="bg-white border border-gray-300 rounded px-2 py-1 text-xs font-medium text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex bg-gray-200/80 p-1 rounded-lg border border-gray-300">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                viewMode === 'table' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Quick Overview Table"
            >
              <TableIcon size={14} />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1 ${
                viewMode === 'cards' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
              title="Detailed Cards with Payment History"
            >
              <LayoutList size={14} />
              <span>Detailed Cards</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredBills.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-xs">
          <Receipt className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-lg font-semibold text-gray-800">
            {searchQuery || dateFilterMode !== 'ALL'
              ? 'No matching pending bills found'
              : 'No pending payments! 🎉'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {searchQuery
              ? `No bills match "${searchQuery}". Try clearing the search or date filter.`
              : dateFilterMode !== 'ALL'
              ? 'No pending bills for this selected date filter. Click "All Time" to see all outstanding bills.'
              : 'All bills are fully paid. Excellent job!'}
          </p>
          {(searchQuery || dateFilterMode !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setDateFilterMode('ALL');
                setSelectedDate('');
              }}
              className="mt-4 px-4 py-2 bg-blue-50 text-blue-700 font-medium text-xs rounded-lg hover:bg-blue-100 transition"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          {viewMode === 'table' ? (
            /* Compact Paginated Table View */
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden mb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-gray-600 font-semibold">
                      <th className="text-left p-3">Patient</th>
                      <th className="text-left p-3">Phone</th>
                      <th className="text-left p-3">Bill No / Date</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-right p-3">Paid</th>
                      <th className="text-right p-3">Balance</th>
                      <th className="text-center p-3">Status</th>
                      <th className="text-center p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {paginatedBills.map((bill) => (
                      <tr key={bill.id} className="hover:bg-blue-50/40 transition">
                        <td className="p-3 font-semibold text-gray-900">
                          {bill.patient_name || 'N/A'}
                        </td>
                        <td className="p-3 text-gray-600 whitespace-nowrap">
                          {bill.phone_number || 'N/A'}
                        </td>
                        <td className="p-3 text-gray-600 whitespace-nowrap">
                          <div className="font-medium text-gray-800">{bill.bill_number || 'N/A'}</div>
                          <div className="text-[11px] text-gray-400">
                            {bill.created_at ? formatDateDisplay(bill.created_at.slice(0, 10)) : ''}
                          </div>
                        </td>
                        <td className="p-3 text-right font-medium text-gray-900">
                          ₹{Number(bill.total_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-emerald-600 font-medium">
                          ₹{Number(bill.paid_amount).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right text-rose-600 font-bold whitespace-nowrap">
                          ₹{(Number(bill.balance_amount) || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              bill.payment_status === 'PAID'
                                ? 'bg-green-100 text-green-700'
                                : bill.payment_status === 'PARTIAL'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {bill.payment_status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setPayingBill(bill)}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition flex items-center gap-1"
                              title="Record installment payment"
                            >
                              <Plus size={13} />
                              <span>Pay</span>
                            </button>
                            <button
                              onClick={() => setHistoryBill(bill)}
                              className="px-2.5 py-1 text-xs font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition flex items-center gap-1"
                              title="View all transactions for this bill"
                            >
                              <History size={13} />
                              <span>History</span>
                            </button>
                            <button
                              onClick={() => window.open(`/print-dues?billId=${bill.id}`, '_blank')}
                              className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition flex items-center gap-1"
                              title="Print Dues Slip"
                            >
                              <Printer size={13} />
                              <span>Print</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Paginated Detailed Cards View */
            <div className="mb-4">
              <BillHistoryWithPayments
                bills={paginatedBills}
                allBills={filteredBills}
                onBillUpdated={loadData}
              />
            </div>
          )}

          {/* Pagination Controls */}
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <div>
              Showing{' '}
              <span className="font-semibold text-gray-900">
                {(currentPage - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-semibold text-gray-900">
                {Math.min(currentPage * pageSize, filteredBills.length)}
              </span>{' '}
              of <span className="font-semibold text-gray-900">{filteredBills.length}</span> bills
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                title="First Page"
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                title="Previous Page"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="px-3 py-1 font-semibold text-gray-800">
                Page {currentPage} of {totalPages}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                title="Next Page"
              >
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100 transition"
                title="Last Page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Add Payment Modal (from Table Row Action) */}
      {payingBill && payingBill.id && payingBill.patient_id && (
        <AddPaymentDialog
          open={!!payingBill}
          onOpenChange={(open) => {
            if (!open) setPayingBill(null);
          }}
          billId={payingBill.id}
          patientId={payingBill.patient_id}
          balanceAmount={Number(payingBill.balance_amount) || 0}
          onPaymentAdded={() => {
            setPayingBill(null);
            loadData();
          }}
        />
      )}

      {/* View Payment History Modal (from Table Row Action) */}
      {historyBill && historyBill.id && (
        <Dialog
          open={!!historyBill}
          onOpenChange={(open) => {
            if (!open) setHistoryBill(null);
          }}
        >
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-gray-900">
                Payment History — {historyBill.patient_name || 'Patient'} ({historyBill.bill_number || 'Bill'})
              </DialogTitle>
            </DialogHeader>
            <PaymentHistory
              billId={historyBill.id}
              totalAmount={historyBill.total_amount}
              paidAmount={historyBill.paid_amount}
              balanceAmount={Number(historyBill.balance_amount) || 0}
              onPaymentAdded={() => {
                loadData();
              }}
              onAddPaymentClick={() => {
                const target = historyBill;
                setHistoryBill(null);
                setPayingBill(target);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
