'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { stockistService } from '@/services/stockist';
import { getAllMedicines, Medicine } from '@/services/medicine';
import {
  Stockist,
  StockistBill,
  StockistPayment,
  StockistBillItem,
  StockistDashboardSummary,
  StockistPaymentMode,
} from '@/types/stockist';
import {
  ReceiptText,
  Building2,
  Calendar,
  IndianRupee,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  Printer,
  ChevronRight,
  History,
  Phone,
  User,
  BadgeAlert,
} from 'lucide-react';

export default function StockistBillsPage() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'BILLS' | 'STOCKISTS' | 'PAYMENTS'>('BILLS');

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Main Data States
  const [bills, setBills] = useState<StockistBill[]>([]);
  const [stockists, setStockists] = useState<Stockist[]>([]);
  const [payments, setPayments] = useState<StockistPayment[]>([]);
  const [summary, setSummary] = useState<StockistDashboardSummary | null>(null);
  const [clinicMedicines, setClinicMedicines] = useState<Medicine[]>([]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [stockistFilter, setStockistFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [isBillModalOpen, setIsBillModalOpen] = useState(false);
  const [isStockistModalOpen, setIsStockistModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // Active items for modals
  const [editingBill, setEditingBill] = useState<StockistBill | null>(null);
  const [activeBillForPayment, setActiveBillForPayment] = useState<StockistBill | null>(null);
  const [activeBillForLedger, setActiveBillForLedger] = useState<StockistBill | null>(null);
  const [editingStockist, setEditingStockist] = useState<Stockist | null>(null);

  // Printable ref
  const printRef = useRef<HTMLDivElement>(null);

  // Today's Date String
  const todayStr = new Date().toISOString().split('T')[0];

  /* ---------------- Form States ---------------- */
  // Bill Form
  const [billForm, setBillForm] = useState<{
    stockist_name: string;
    stockist_id: string;
    bill_number: string;
    bill_date: string;
    due_date: string;
    total_amount: number;
    has_physical_copy: boolean;
    physical_copy_notes: string;
    notes: string;
    initial_paid_amount: number;
    initial_payment_mode: StockistPaymentMode;
    initial_payment_ref: string;
    items: StockistBillItem[];
  }>({
    stockist_name: '',
    stockist_id: '',
    bill_number: '',
    bill_date: todayStr,
    due_date: '',
    total_amount: 0,
    has_physical_copy: true,
    physical_copy_notes: 'Two copies received on delivery (1 retained by clinic, 1 by stockist)',
    notes: '',
    initial_paid_amount: 0,
    initial_payment_mode: 'Cash',
    initial_payment_ref: '',
    items: [],
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState<{
    payment_date: string;
    amount: number;
    payment_mode: StockistPaymentMode;
    transaction_reference: string;
    noted_on_physical_copy: boolean;
    collected_by: string;
    paid_by: string;
    notes: string;
  }>({
    payment_date: todayStr,
    amount: 0,
    payment_mode: 'Cash',
    transaction_reference: '',
    noted_on_physical_copy: true,
    collected_by: '',
    paid_by: '',
    notes: '',
  });

  // Stockist Form
  const [stockistForm, setStockistForm] = useState<Omit<Stockist, '_id' | 'id' | 'created_at' | 'updated_at'>>({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: '',
    drug_license_no: '',
    notes: '',
  });

  // Fetch all initial data
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [fetchedBills, fetchedStockists, fetchedPayments, fetchedSummary, fetchedMedicines] = await Promise.all([
        stockistService.listBills(),
        stockistService.listStockists(),
        stockistService.listPayments(),
        stockistService.getDashboardSummary(),
        getAllMedicines().catch(() => []),
      ]);

      setBills(fetchedBills);
      setStockists(fetchedStockists);
      setPayments(fetchedPayments);
      setSummary(fetchedSummary);
      setClinicMedicines(fetchedMedicines);
    } catch (err: any) {
      console.error('Error loading stockist data:', err);
      setError('Failed to load stockist bills data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show temporary toast/flash message
  const triggerSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 4000);
  };

  /* ---------------- Computed Filtered Bills ---------------- */
  const filteredBills = useMemo(() => {
    return bills.filter((bill) => {
      if (stockistFilter !== 'ALL' && bill.stockist_name.toLowerCase() !== stockistFilter.toLowerCase()) {
        return false;
      }
      if (statusFilter !== 'ALL' && bill.payment_status !== statusFilter) {
        return false;
      }
      if (startDateFilter && bill.bill_date < startDateFilter) {
        return false;
      }
      if (endDateFilter && bill.bill_date > endDateFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = bill.bill_number.toLowerCase().includes(q);
        const matchesStockist = bill.stockist_name.toLowerCase().includes(q);
        const matchesNotes = bill.notes?.toLowerCase().includes(q);
        const matchesItems = bill.items?.some((i) => i.medicine_name.toLowerCase().includes(q));
        return matchesNo || matchesStockist || matchesNotes || matchesItems;
      }
      return true;
    });
  }, [bills, stockistFilter, statusFilter, startDateFilter, endDateFilter, searchQuery]);

  /* ---------------- Computed Filtered Payments ---------------- */
  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      if (stockistFilter !== 'ALL' && payment.stockist_name.toLowerCase() !== stockistFilter.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = payment.bill_number.toLowerCase().includes(q);
        const matchesStockist = payment.stockist_name.toLowerCase().includes(q);
        const matchesRef = payment.transaction_reference?.toLowerCase().includes(q);
        const matchesCollector = payment.collected_by?.toLowerCase().includes(q);
        return matchesNo || matchesStockist || matchesRef || matchesCollector;
      }
      return true;
    });
  }, [payments, stockistFilter, searchQuery]);

  /* ---------------- Actions: Stockists ---------------- */
  const handleOpenNewStockist = () => {
    setEditingStockist(null);
    setStockistForm({
      name: '',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      gst_number: '',
      drug_license_no: '',
      notes: '',
    });
    setIsStockistModalOpen(true);
  };

  const handleEditStockist = (s: Stockist) => {
    setEditingStockist(s);
    setStockistForm({
      name: s.name,
      contact_person: s.contact_person || '',
      phone: s.phone || '',
      email: s.email || '',
      address: s.address || '',
      gst_number: s.gst_number || '',
      drug_license_no: s.drug_license_no || '',
      notes: s.notes || '',
    });
    setIsStockistModalOpen(true);
  };

  const handleSubmitStockist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockistForm.name.trim()) {
      alert('Stockist / Supplier name is required');
      return;
    }
    setSubmitting(true);
    try {
      if (editingStockist?.id) {
        await stockistService.updateStockist(editingStockist.id, stockistForm);
        triggerSuccess(`Stockist "${stockistForm.name}" updated successfully!`);
      } else {
        await stockistService.createStockist(stockistForm);
        triggerSuccess(`Stockist "${stockistForm.name}" added to directory!`);
      }
      setIsStockistModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error saving stockist: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStockist = async (s: Stockist) => {
    if (s.bills_count && s.bills_count > 0) {
      alert(`Cannot delete "${s.name}" because they have ${s.bills_count} bills associated. Please delete or reassign bills first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete stockist "${s.name}"?`)) return;
    try {
      if (s.id) {
        await stockistService.deleteStockist(s.id);
        triggerSuccess(`Stockist "${s.name}" deleted.`);
        await loadData();
      }
    } catch (err: any) {
      alert('Error deleting stockist: ' + err.message);
    }
  };

  /* ---------------- Actions: Bills ---------------- */
  const handleOpenNewBill = () => {
    setEditingBill(null);
    setBillForm({
      stockist_name: stockistFilter !== 'ALL' ? stockistFilter : '',
      stockist_id: '',
      bill_number: '',
      bill_date: todayStr,
      due_date: '',
      total_amount: 0,
      has_physical_copy: true,
      physical_copy_notes: 'Two copies received on delivery (1 retained by clinic, 1 by stockist)',
      notes: '',
      initial_paid_amount: 0,
      initial_payment_mode: 'Cash',
      initial_payment_ref: '',
      items: [
        { medicine_name: '', quantity: 1, pack_type: 'Box', rate: 0, amount: 0 },
      ],
    });
    setIsBillModalOpen(true);
  };

  const handleEditBill = (bill: StockistBill) => {
    setEditingBill(bill);
    setBillForm({
      stockist_name: bill.stockist_name,
      stockist_id: bill.stockist_id || '',
      bill_number: bill.bill_number,
      bill_date: bill.bill_date,
      due_date: bill.due_date || '',
      total_amount: bill.total_amount,
      has_physical_copy: bill.has_physical_copy ?? true,
      physical_copy_notes: bill.physical_copy_notes || '',
      notes: bill.notes || '',
      initial_paid_amount: 0,
      initial_payment_mode: 'Cash',
      initial_payment_ref: '',
      items: bill.items && bill.items.length > 0
        ? [...bill.items]
        : [{ medicine_name: '', quantity: 1, pack_type: 'Box', rate: 0, amount: 0 }],
    });
    setIsBillModalOpen(true);
  };

  const handleAddItemRow = () => {
    setBillForm((prev) => ({
      ...prev,
      items: [...prev.items, { medicine_name: '', quantity: 1, pack_type: 'Box', rate: 0, amount: 0 }],
    }));
  };

  const handleRemoveItemRow = (index: number) => {
    setBillForm((prev) => {
      const updated = prev.items.filter((_, i) => i !== index);
      const computedTotal = updated.reduce((sum, it) => sum + (it.amount || 0), 0);
      return {
        ...prev,
        items: updated,
        total_amount: computedTotal > 0 ? computedTotal : prev.total_amount,
      };
    });
  };

  const handleItemChange = (index: number, field: keyof StockistBillItem, value: any) => {
    setBillForm((prev) => {
      const updated = [...prev.items];
      const item = { ...updated[index], [field]: value };

      if (field === 'quantity' || field === 'rate') {
        const q = field === 'quantity' ? Number(value) : item.quantity;
        const r = field === 'rate' ? Number(value) : item.rate;
        item.amount = (q || 0) * (r || 0);
      }

      updated[index] = item;
      const computedTotal = updated.reduce((sum, it) => sum + (it.amount || 0), 0);
      return {
        ...prev,
        items: updated,
        total_amount: computedTotal > 0 ? computedTotal : prev.total_amount,
      };
    });
  };

  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.stockist_name.trim()) {
      alert('Please select or enter the Stockist name');
      return;
    }
    if (!billForm.bill_number.trim()) {
      alert('Please enter the Bill / Invoice Number from the paper copy');
      return;
    }
    if (billForm.total_amount <= 0) {
      alert('Total bill amount must be greater than zero');
      return;
    }

    setSubmitting(true);
    try {
      // Filter out empty items
      const cleanItems = billForm.items.filter((it) => it.medicine_name.trim());

      if (editingBill?.id) {
        await stockistService.updateBill(editingBill.id, {
          stockist_name: billForm.stockist_name.trim(),
          stockist_id: billForm.stockist_id || undefined,
          bill_number: billForm.bill_number.trim(),
          bill_date: billForm.bill_date,
          due_date: billForm.due_date || undefined,
          total_amount: Number(billForm.total_amount),
          items: cleanItems,
          has_physical_copy: billForm.has_physical_copy,
          physical_copy_notes: billForm.physical_copy_notes,
          notes: billForm.notes,
        });
        triggerSuccess(`Bill #${billForm.bill_number} updated successfully!`);
      } else {
        await stockistService.createBill({
          stockist_name: billForm.stockist_name.trim(),
          stockist_id: billForm.stockist_id || undefined,
          bill_number: billForm.bill_number.trim(),
          bill_date: billForm.bill_date,
          due_date: billForm.due_date || undefined,
          total_amount: Number(billForm.total_amount),
          items: cleanItems,
          has_physical_copy: billForm.has_physical_copy,
          physical_copy_notes: billForm.physical_copy_notes,
          notes: billForm.notes,
          initial_paid_amount: billForm.initial_paid_amount ? Number(billForm.initial_paid_amount) : 0,
          initial_payment_mode: billForm.initial_payment_mode,
          initial_payment_ref: billForm.initial_payment_ref,
        });
        triggerSuccess(`Bill #${billForm.bill_number} from ${billForm.stockist_name} recorded!`);
      }
      setIsBillModalOpen(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert('Error saving bill: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBill = async (bill: StockistBill) => {
    if (!confirm(`Are you sure you want to delete Bill #${bill.bill_number} from ${bill.stockist_name}? This will also delete any recorded payment installments against this bill.`)) {
      return;
    }
    try {
      if (bill.id) {
        await stockistService.deleteBill(bill.id);
        triggerSuccess(`Bill #${bill.bill_number} deleted.`);
        await loadData();
      }
    } catch (err: any) {
      alert('Error deleting bill: ' + err.message);
    }
  };

  /* ---------------- Actions: Record Weekly Payment ---------------- */
  const handleOpenPaymentModal = (bill: StockistBill) => {
    setActiveBillForPayment(bill);
    setPaymentForm({
      payment_date: todayStr,
      amount: bill.balance_amount || 0,
      payment_mode: 'Cash',
      transaction_reference: '',
      noted_on_physical_copy: true,
      collected_by: '',
      paid_by: 'Clinic Admin',
      notes: '',
    });
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBillForPayment?.id) return;
    if (paymentForm.amount <= 0) {
      alert('Payment amount must be greater than zero');
      return;
    }
    if (paymentForm.amount > (activeBillForPayment.balance_amount || 0)) {
      if (!confirm(`The entered payment amount (₹${paymentForm.amount}) is greater than the remaining balance (₹${activeBillForPayment.balance_amount}). Do you want to proceed?`)) {
        return;
      }
    }

    setSubmitting(true);
    try {
      await stockistService.recordPayment({
        stockist_bill_id: activeBillForPayment.id,
        payment_date: paymentForm.payment_date,
        amount: Number(paymentForm.amount),
        payment_mode: paymentForm.payment_mode,
        transaction_reference: paymentForm.transaction_reference,
        noted_on_physical_copy: paymentForm.noted_on_physical_copy,
        collected_by: paymentForm.collected_by,
        paid_by: paymentForm.paid_by,
        notes: paymentForm.notes,
      });

      triggerSuccess(`Payment of ₹${paymentForm.amount.toLocaleString('en-IN')} recorded for Bill #${activeBillForPayment.bill_number}!`);
      setIsPaymentModalOpen(false);
      await loadData();

      // If user had ledger open for this bill, refresh it
      if (activeBillForLedger?.id === activeBillForPayment.id) {
        const updated = await stockistService.getBillById(activeBillForPayment.id);
        setActiveBillForLedger(updated);
      }
    } catch (err: any) {
      console.error(err);
      alert('Error recording payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!confirm('Are you sure you want to delete this payment record? The bill balance will be restored automatically.')) {
      return;
    }
    try {
      await stockistService.deletePayment(paymentId);
      triggerSuccess('Payment record deleted. Bill balance restored.');
      await loadData();

      if (activeBillForLedger?.id) {
        const updated = await stockistService.getBillById(activeBillForLedger.id);
        setActiveBillForLedger(updated);
      }
    } catch (err: any) {
      alert('Error deleting payment: ' + err.message);
    }
  };

  /* ---------------- Actions: Open Ledger & Reconcile ---------------- */
  const handleOpenLedger = async (bill: StockistBill) => {
    if (!bill.id) return;
    try {
      const detailedBill = await stockistService.getBillById(bill.id);
      setActiveBillForLedger(detailedBill || bill);
      setIsLedgerModalOpen(true);
    } catch (err) {
      console.error(err);
      setActiveBillForLedger(bill);
      setIsLedgerModalOpen(true);
    }
  };

  const handlePrintLedger = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner / Toast Message */}
      {successMessage && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between transition-all animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-rose-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center justify-between transition-all">
          <div className="flex items-center space-x-2">
            <BadgeAlert className="w-5 h-5 shrink-0" />
            <span className="font-medium text-sm">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="p-1 hover:bg-rose-700 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <ReceiptText className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Stockist Medicine Bills & Dues</h1>
              <p className="text-sm text-gray-500">
                Track supplier purchase bills, 2-copy paper invoices, and weekly installment payments.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenNewStockist}
            className="flex items-center space-x-1.5 px-3.5 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors"
          >
            <Building2 className="w-4 h-4" />
            <span>+ New Stockist</span>
          </button>

          <button
            onClick={handleOpenNewBill}
            className="flex items-center space-x-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Outstanding Dues */}
        <div className="bg-gradient-to-br from-rose-50 to-white p-5 rounded-2xl border border-rose-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">Total Pending Dues</span>
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <BadgeAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{(summary?.total_balance || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-rose-600 font-medium mt-1">
            Across {(summary?.pending_bills_count || 0) + (summary?.partial_bills_count || 0)} open bills
          </p>
        </div>

        {/* Total Billed */}
        <div className="bg-gradient-to-br from-blue-50 to-white p-5 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Purchases</span>
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{(summary?.total_billed || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-blue-600 font-medium mt-1">
            {summary?.total_bills_count || 0} total invoices recorded
          </p>
        </div>

        {/* Total Paid Out */}
        <div className="bg-gradient-to-br from-emerald-50 to-white p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Total Paid Out</span>
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            ₹{(summary?.total_paid || 0).toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-emerald-600 font-medium mt-1">
            {summary?.total_payments_count || 0} installments paid
          </p>
        </div>

        {/* Stockists Registered */}
        <div className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">Suppliers / Stockists</span>
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {summary?.stockists_count || 0}
          </div>
          <p className="text-xs text-indigo-600 font-medium mt-1">
            {summary?.fully_paid_bills_count || 0} bills fully settled
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-gray-200 bg-white rounded-t-2xl px-6 pt-3 shadow-sm">
        <button
          onClick={() => setActiveTab('BILLS')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'BILLS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <ReceiptText className="w-4 h-4" />
          <span>Purchase Bills ({filteredBills.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('STOCKISTS')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'STOCKISTS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Stockists & Ledgers ({stockists.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYMENTS')}
          className={`pb-3 px-4 font-semibold text-sm border-b-2 flex items-center space-x-2 transition-colors ${
            activeTab === 'PAYMENTS'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Payment Timeline ({filteredPayments.length})</span>
        </button>
      </div>

      {/* Filters Strip */}
      <div className="bg-white p-4 rounded-b-2xl border border-t-0 border-gray-100 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search bill no, stockist, medicine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Stockist select filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-gray-500 font-medium">Stockist:</span>
            <select
              value={stockistFilter}
              onChange={(e) => setStockistFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Stockists</option>
              {stockists.map((s) => (
                <option key={s.id || s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter (only for Bills tab) */}
          {activeTab === 'BILLS' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-xs text-gray-500 font-medium">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending (Unpaid)</option>
                <option value="PARTIAL">Partial (In-Progress)</option>
                <option value="PAID">Paid in Full</option>
              </select>
            </div>
          )}

          {/* Clear filters */}
          {(stockistFilter !== 'ALL' || statusFilter !== 'ALL' || searchQuery || startDateFilter || endDateFilter) && (
            <button
              onClick={() => {
                setStockistFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium underline px-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: ALL BILLS VIEW */}
      {activeTab === 'BILLS' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-3" />
              <p className="text-gray-500 text-sm font-medium">Loading stockist bills...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center">
              <ReceiptText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-gray-800 mb-1">No bills found</h3>
              <p className="text-gray-500 text-sm max-w-md mx-auto mb-4">
                {searchQuery || stockistFilter !== 'ALL' || statusFilter !== 'ALL'
                  ? 'No bills match your current filter criteria. Try resetting filters.'
                  : 'Start recording your stockist medicine bills with the two-copy workflow.'}
              </p>
              <button
                onClick={handleOpenNewBill}
                className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add First Purchase Bill</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs uppercase border-b border-gray-100">
                    <tr>
                      <th className="py-3.5 px-4 font-semibold">Bill Details</th>
                      <th className="py-3.5 px-4 font-semibold">Stockist / Supplier</th>
                      <th className="py-3.5 px-4 font-semibold">Medicines / Items</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Total Amount</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Paid Amount</th>
                      <th className="py-3.5 px-4 font-semibold text-right">Balance Due</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                      <th className="py-3.5 px-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredBills.map((bill) => {
                      const total = bill.total_amount || 0;
                      const paid = bill.paid_amount || 0;
                      const balance = bill.balance_amount || 0;
                      const pctPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                      return (
                        <tr key={bill.id} className="hover:bg-blue-50/30 transition-colors">
                          {/* Bill details */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-900 flex items-center space-x-1.5">
                              <span>#{bill.bill_number}</span>
                              {bill.has_physical_copy && (
                                <span title="Two copies verified (one for us, one for stockist)" className="inline-flex items-center text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-medium border border-emerald-200">
                                  2 Copies
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>{bill.bill_date}</span>
                            </div>
                          </td>

                          {/* Stockist Name */}
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-gray-900 flex items-center space-x-1.5">
                              <Building2 className="w-3.5 h-3.5 text-gray-400" />
                              <span>{bill.stockist_name}</span>
                            </div>
                            {bill.physical_copy_notes && (
                              <div className="text-[11px] text-gray-400 truncate max-w-[180px]" title={bill.physical_copy_notes}>
                                {bill.physical_copy_notes}
                              </div>
                            )}
                          </td>

                          {/* Medicines / Items Preview */}
                          <td className="py-3.5 px-4 max-w-xs">
                            {bill.items && bill.items.length > 0 ? (
                              <div className="text-xs text-gray-700 truncate" title={bill.items.map((i) => `${i.medicine_name} (${i.quantity} ${i.pack_type || ''})`).join(', ')}>
                                <span className="font-medium text-gray-900">{bill.items[0].medicine_name}</span>
                                {bill.items.length > 1 && (
                                  <span className="text-gray-500 ml-1">+{bill.items.length - 1} more items</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No itemized list</span>
                            )}
                            {bill.notes && (
                              <div className="text-[11px] text-gray-400 truncate mt-0.5" title={bill.notes}>
                                Note: {bill.notes}
                              </div>
                            )}
                          </td>

                          {/* Total Amount */}
                          <td className="py-3.5 px-4 text-right font-semibold text-gray-900">
                            ₹{total.toLocaleString('en-IN')}
                          </td>

                          {/* Paid Amount & progress */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="font-medium text-emerald-700">
                              ₹{paid.toLocaleString('en-IN')}
                            </div>
                            <div className="w-20 bg-gray-100 rounded-full h-1.5 ml-auto mt-1 overflow-hidden">
                              <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${pctPaid}%` }}
                              />
                            </div>
                          </td>

                          {/* Balance Due */}
                          <td className="py-3.5 px-4 text-right">
                            <div className={`font-bold ${balance > 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                              ₹{balance.toLocaleString('en-IN')}
                            </div>
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {bill.payment_status === 'PAID' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                Paid Full
                              </span>
                            ) : bill.payment_status === 'PARTIAL' ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                                Partial ({pctPaid}%)
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                                Unpaid
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              {/* Quick Record Payment (only if balance > 0) */}
                              {balance > 0 && (
                                <button
                                  onClick={() => handleOpenPaymentModal(bill)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                  title="Record Weekly Payment"
                                >
                                  <IndianRupee className="w-4 h-4" />
                                </button>
                              )}

                              {/* View Ledger & Reconcile */}
                              <button
                                onClick={() => handleOpenLedger(bill)}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View Bill Ledger & Reconcile"
                              >
                                <History className="w-4 h-4" />
                              </button>

                              {/* Edit Bill */}
                              <button
                                onClick={() => handleEditBill(bill)}
                                className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Edit Bill Details"
                              >
                                <Edit className="w-4 h-4" />
                              </button>

                              {/* Delete Bill */}
                              <button
                                onClick={() => handleDeleteBill(bill)}
                                className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Delete Bill"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STOCKISTS DIRECTORY & LEDGERS */}
      {activeTab === 'STOCKISTS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockists.map((s) => (
              <div
                key={s.id || s.name}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg flex items-center space-x-1.5">
                        <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                        <span>{s.name}</span>
                      </h3>
                      {s.contact_person && (
                        <p className="text-xs text-gray-500 flex items-center space-x-1 mt-1">
                          <User className="w-3.5 h-3.5" />
                          <span>Contact: {s.contact_person}</span>
                        </p>
                      )}
                      {s.phone && (
                        <p className="text-xs text-gray-500 flex items-center space-x-1 mt-0.5">
                          <Phone className="w-3.5 h-3.5" />
                          <span>{s.phone}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleEditStockist(s)}
                        className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                        title="Edit Stockist"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteStockist(s)}
                        className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Delete Stockist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Stats for this Stockist */}
                  <div className="grid grid-cols-3 gap-2 mt-4 p-3 bg-gray-50 rounded-xl text-center">
                    <div>
                      <span className="text-[10px] text-gray-500 uppercase font-semibold block">Total Billed</span>
                      <span className="text-sm font-bold text-gray-900">₹{(s.total_billed || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-600 uppercase font-semibold block">Total Paid</span>
                      <span className="text-sm font-bold text-emerald-700">₹{(s.total_paid || 0).toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-rose-600 uppercase font-semibold block">Balance Due</span>
                      <span className="text-sm font-bold text-rose-600">₹{(s.total_balance || 0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* Open Bills Badge */}
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="text-gray-500">{s.bills_count || 0} total invoices</span>
                    {(s.open_bills_count || 0) > 0 ? (
                      <span className="font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                        {s.open_bills_count} bills pending payment
                      </span>
                    ) : (
                      <span className="font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                        All bills cleared
                      </span>
                    )}
                  </div>
                </div>

                {/* Drilldown button */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => {
                      setStockistFilter(s.name);
                      setActiveTab('BILLS');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <span>View All Bills for {s.name}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENT TIMELINE VIEW */}
      {activeTab === 'PAYMENTS' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Weekly Installment Records</h3>
              <p className="text-xs text-gray-500">History of partial and full payments collected by stockists</p>
            </div>
            <span className="text-xs font-medium text-gray-500">{filteredPayments.length} transactions</span>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="p-12 text-center">
              <History className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">No payment records match your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 text-xs uppercase border-b border-gray-100">
                  <tr>
                    <th className="py-3 px-4 font-semibold">Payment Date</th>
                    <th className="py-3 px-4 font-semibold">Stockist</th>
                    <th className="py-3 px-4 font-semibold">Bill #</th>
                    <th className="py-3 px-4 font-semibold">Payment Mode</th>
                    <th className="py-3 px-4 font-semibold text-right">Amount Paid</th>
                    <th className="py-3 px-4 font-semibold">Noted on 2 Copies</th>
                    <th className="py-3 px-4 font-semibold">Collected / Paid By</th>
                    <th className="py-3 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-gray-900">{p.payment_date}</td>
                      <td className="py-3 px-4 font-semibold text-gray-800">{p.stockist_name}</td>
                      <td className="py-3 px-4 text-blue-600 font-medium">#{p.bill_number}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-800 font-medium">
                          {p.payment_mode}
                        </span>
                        {p.transaction_reference && (
                          <span className="text-xs text-gray-400 block mt-0.5 font-mono">
                            Ref: {p.transaction_reference}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-700">
                        ₹{p.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        {p.noted_on_physical_copy ? (
                          <span className="inline-flex items-center text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium border border-emerald-200">
                            ✓ Noted on both copies
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
                            Not recorded on copy
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">
                        {p.collected_by && <div>Collector: {p.collected_by}</div>}
                        {p.paid_by && <div className="text-gray-400">Paid by: {p.paid_by}</div>}
                        {p.notes && <div className="text-gray-500 italic mt-0.5">{p.notes}</div>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => p.id && handleDeletePayment(p.id)}
                          className="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg"
                          title="Delete Payment (Revert Balance)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL 1: ADD / EDIT PURCHASE BILL
         ========================================================================= */}
      {isBillModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {editingBill ? `Edit Purchase Bill #${editingBill.bill_number}` : 'Record New Medicine Purchase Bill'}
                </h3>
                <p className="text-xs text-gray-500">
                  Enter invoice details from the stockist's two-copy delivery bill
                </p>
              </div>
              <button
                onClick={() => setIsBillModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitBill} className="p-6 overflow-y-auto flex-1 space-y-5">
              {/* Row 1: Stockist & Bill No */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Stockist / Distributor Name *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      list="stockists-datalist"
                      required
                      placeholder="e.g. Mahaveer Pharma Agency"
                      value={billForm.stockist_name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const match = stockists.find((s) => s.name.toLowerCase() === name.toLowerCase());
                        setBillForm((prev) => ({
                          ...prev,
                          stockist_name: name,
                          stockist_id: match?.id || '',
                        }));
                      }}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <datalist id="stockists-datalist">
                      {stockists.map((s) => (
                        <option key={s.id || s.name} value={s.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Bill / Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. INV-2026/894"
                    value={billForm.bill_number}
                    onChange={(e) => setBillForm({ ...billForm, bill_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: Bill Date & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Bill Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={billForm.bill_date}
                    onChange={(e) => setBillForm({ ...billForm, bill_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Expected Due / Followup Date
                  </label>
                  <input
                    type="date"
                    value={billForm.due_date}
                    onChange={(e) => setBillForm({ ...billForm, due_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Medicines / Items Section */}
              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-gray-700 uppercase">Medicines / Items on Bill</h4>
                    <p className="text-[11px] text-gray-400">List items from the paper bill (optional or itemized)</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2">
                  {billForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-gray-200">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Medicine name (e.g. Augmentin 625)"
                          list="medicines-autocomplete"
                          value={item.medicine_name}
                          onChange={(e) => handleItemChange(idx, 'medicine_name', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-24">
                        <select
                          value={item.pack_type || 'Box'}
                          onChange={(e) => handleItemChange(idx, 'pack_type', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-1.5 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="Strips">Strips</option>
                          <option value="Box">Box</option>
                          <option value="Bottle">Bottle</option>
                          <option value="Vial">Vial</option>
                          <option value="Units">Units</option>
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          step="any"
                          placeholder="Rate ₹"
                          value={item.rate || ''}
                          onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                          className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="w-24 text-right pr-2 text-xs font-semibold text-gray-700">
                        ₹{(item.amount || 0).toLocaleString('en-IN')}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItemRow(idx)}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <datalist id="medicines-autocomplete">
                    {clinicMedicines.map((m) => (
                      <option key={m.id || m.name} value={m.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Total Bill Amount */}
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-blue-900 uppercase">
                    Total Bill Amount (₹) *
                  </label>
                  <span className="text-xs text-blue-600">Enter total invoice value from physical bill</span>
                </div>
                <div className="w-48">
                  <input
                    type="number"
                    step="any"
                    required
                    min="1"
                    placeholder="Total ₹"
                    value={billForm.total_amount || ''}
                    onChange={(e) => setBillForm({ ...billForm, total_amount: Number(e.target.value) })}
                    className="w-full text-right text-lg font-bold border border-blue-300 rounded-xl px-3 py-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* Two Copies Verification Checklist */}
              <div className="border border-emerald-200 bg-emerald-50/40 p-4 rounded-2xl space-y-2">
                <label className="flex items-start space-x-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={billForm.has_physical_copy}
                    onChange={(e) => setBillForm({ ...billForm, has_physical_copy: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800">
                      Two Copies Received (1 retained by us, 1 by stockist)
                    </span>
                    <p className="text-[11px] text-gray-500">
                      Confirms the delivery arrived on credit with dual copies for mutual weekly payment noting.
                    </p>
                  </div>
                </label>

                <input
                  type="text"
                  placeholder="Physical bill file / location remark (e.g. Filed in Active Bills Folder)"
                  value={billForm.physical_copy_notes}
                  onChange={(e) => setBillForm({ ...billForm, physical_copy_notes: e.target.value })}
                  className="w-full text-xs border border-emerald-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* Initial Paid Amount (only on create) */}
              {!editingBill && (
                <div className="border border-gray-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-gray-700 uppercase">Initial Payment on Delivery?</span>
                      <p className="text-[11px] text-gray-500">
                        Stockists usually deliver on credit (0 paid now). If you paid anything on delivery, record here.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">Amount Paid Now (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0 for credit"
                        value={billForm.initial_paid_amount || ''}
                        onChange={(e) => setBillForm({ ...billForm, initial_paid_amount: Number(e.target.value) })}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">Payment Mode</label>
                      <select
                        value={billForm.initial_payment_mode}
                        onChange={(e) => setBillForm({ ...billForm, initial_payment_mode: e.target.value as any })}
                        className="w-full text-xs border border-gray-200 rounded-xl px-2 py-2 bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI / GPay / PhonePe</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">Ref / Cheque / Notes</label>
                      <input
                        type="text"
                        placeholder="Optional ref"
                        value={billForm.initial_payment_ref}
                        onChange={(e) => setBillForm({ ...billForm, initial_payment_ref: e.target.value })}
                        className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* General Remarks */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Remarks / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes..."
                  value={billForm.notes}
                  onChange={(e) => setBillForm({ ...billForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsBillModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>{editingBill ? 'Save Changes' : 'Save Purchase Bill'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: RECORD WEEKLY INSTALLMENT / PART-PAYMENT
         ========================================================================= */}
      {isPaymentModalOpen && activeBillForPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-emerald-50/60">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <IndianRupee className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    Record Weekly Payment / Installment
                  </h3>
                  <p className="text-xs text-gray-500">
                    Bill #{activeBillForPayment.bill_number} • {activeBillForPayment.stockist_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Bill Summary Strip */}
            <div className="grid grid-cols-3 gap-2 p-4 bg-gray-50 border-b border-gray-100 text-center">
              <div>
                <span className="text-[10px] uppercase text-gray-400 font-bold block">Total Bill</span>
                <span className="text-sm font-bold text-gray-800">
                  ₹{(activeBillForPayment.total_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-emerald-600 font-bold block">Already Paid</span>
                <span className="text-sm font-bold text-emerald-700">
                  ₹{(activeBillForPayment.paid_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-rose-600 font-bold block">Balance Remaining</span>
                <span className="text-sm font-bold text-rose-600">
                  ₹{(activeBillForPayment.balance_amount || 0).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitPayment} className="p-5 space-y-4">
              {/* Payment Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Amount to Pay */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-gray-700 uppercase">
                    Amount Paid (₹) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amount: activeBillForPayment.balance_amount || 0 })}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 underline"
                  >
                    Pay Full Balance (₹{activeBillForPayment.balance_amount?.toLocaleString('en-IN')})
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  placeholder="Enter amount collected by stockist"
                  value={paymentForm.amount || ''}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="w-full text-lg font-bold text-gray-900 border border-gray-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Payment Mode *
                  </label>
                  <select
                    value={paymentForm.payment_mode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_mode: e.target.value as any })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Transaction / Cheque No.
                  </label>
                  <input
                    type="text"
                    placeholder="Optional ref"
                    value={paymentForm.transaction_reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transaction_reference: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Collector & Paid By */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Collected By (Stockist Person)
                  </label>
                  <input
                    type="text"
                    placeholder="Name of agent"
                    value={paymentForm.collected_by}
                    onChange={(e) => setPaymentForm({ ...paymentForm, collected_by: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Paid By (Clinic Staff)
                  </label>
                  <input
                    type="text"
                    placeholder="Clinic staff name"
                    value={paymentForm.paid_by}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paid_by: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Physical Copy Noting Confirmation */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl">
                <label className="flex items-start space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentForm.noted_on_physical_copy}
                    onChange={(e) => setPaymentForm({ ...paymentForm, noted_on_physical_copy: e.target.checked })}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-800">
                      Noted on our paper copy & stockist's paper copy
                    </span>
                    <p className="text-[11px] text-gray-500">
                      Amount and date have been written down on both copies as per mutual agreement.
                    </p>
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes</label>
                <input
                  type="text"
                  placeholder="Optional remarks"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save Installment</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: BILL LEDGER & RECONCILIATION SLIP (PRINTABLE)
         ========================================================================= */}
      {isLedgerModalOpen && activeBillForLedger && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50 print:hidden">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Stockist Bill Ledger & Reconciliation Slip
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintLedger}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Slip</span>
                </button>
                <button
                  onClick={() => setIsLedgerModalOpen(false)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div ref={printRef} className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Slip Header */}
              <div className="text-center border-b border-gray-200 pb-4">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">SHAHI DENTAL CLINIC</h2>
                <p className="text-xs text-gray-500">Medicine Procurement & Stockist Payment Ledger</p>
              </div>

              {/* Bill Details Box */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs">
                <div>
                  <span className="text-gray-400 font-medium block uppercase text-[10px]">Stockist / Supplier</span>
                  <span className="font-bold text-gray-900 text-sm">{activeBillForLedger.stockist_name}</span>
                  {activeBillForLedger.physical_copy_notes && (
                    <div className="text-gray-500 text-[11px] mt-1">
                      {activeBillForLedger.physical_copy_notes}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-gray-400 font-medium block uppercase text-[10px]">Invoice Details</span>
                  <span className="font-bold text-gray-900 text-sm">Bill #{activeBillForLedger.bill_number}</span>
                  <div className="text-gray-500 text-[11px] mt-1">Bill Date: {activeBillForLedger.bill_date}</div>
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="grid grid-cols-3 gap-3 text-center border border-gray-200 p-3 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase text-gray-400 font-bold block">Total Bill Amount</span>
                  <span className="text-base font-bold text-gray-900">
                    ₹{(activeBillForLedger.total_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-emerald-600 font-bold block">Total Amount Paid</span>
                  <span className="text-base font-bold text-emerald-700">
                    ₹{(activeBillForLedger.paid_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-rose-600 font-bold block">Balance Remaining</span>
                  <span className="text-base font-bold text-rose-600">
                    ₹{(activeBillForLedger.balance_amount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Itemized Medicines Preview (if any) */}
              {activeBillForLedger.items && activeBillForLedger.items.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">Supplied Medicines:</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 text-gray-600">
                        <tr>
                          <th className="py-2 px-3">Medicine</th>
                          <th className="py-2 px-3">Quantity</th>
                          <th className="py-2 px-3 text-right">Rate</th>
                          <th className="py-2 px-3 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeBillForLedger.items.map((it, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-3 font-medium text-gray-800">{it.medicine_name}</td>
                            <td className="py-1.5 px-3 text-gray-600">{it.quantity} {it.pack_type || ''}</td>
                            <td className="py-1.5 px-3 text-right text-gray-600">₹{it.rate}</td>
                            <td className="py-1.5 px-3 text-right font-semibold text-gray-800">₹{it.amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Installments / Payment History (Matching Paper Copy Notes) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase">
                    Weekly Installments & Payments Recorded on Both Copies:
                  </h4>
                  {activeBillForLedger.balance_amount > 0 && (
                    <button
                      onClick={() => {
                        setIsLedgerModalOpen(false);
                        handleOpenPaymentModal(activeBillForLedger);
                      }}
                      className="text-xs font-bold text-emerald-600 hover:text-emerald-800 print:hidden"
                    >
                      + Record New Payment
                    </button>
                  )}
                </div>

                {(!activeBillForLedger.payments || activeBillForLedger.payments.length === 0) ? (
                  <div className="p-4 border border-dashed border-gray-300 rounded-xl text-center text-xs text-gray-400">
                    No installment payments recorded yet for this bill.
                  </div>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-100 text-gray-600 uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Date</th>
                          <th className="py-2 px-3 text-right">Amount Paid</th>
                          <th className="py-2 px-3">Mode</th>
                          <th className="py-2 px-3">Ref / Notes</th>
                          <th className="py-2 px-3">Noted on 2 Copies</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {activeBillForLedger.payments.map((pmt, idx) => (
                          <tr key={pmt.id || idx}>
                            <td className="py-2 px-3 text-gray-400">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-gray-900">{pmt.payment_date}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-700">
                              ₹{pmt.amount.toLocaleString('en-IN')}
                            </td>
                            <td className="py-2 px-3 text-gray-600">{pmt.payment_mode}</td>
                            <td className="py-2 px-3 text-gray-500">
                              {pmt.transaction_reference || pmt.notes || '—'}
                            </td>
                            <td className="py-2 px-3">
                              {pmt.noted_on_physical_copy ? (
                                <span className="text-[10px] text-emerald-700 font-semibold">✓ Yes</span>
                              ) : (
                                <span className="text-[10px] text-gray-400">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Signatures for physical reconciliation */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-center text-xs text-gray-500">
                <div className="border-t border-gray-300 pt-2">
                  <span>Stockist Representative Signature</span>
                </div>
                <div className="border-t border-gray-300 pt-2">
                  <span>Clinic Authorized Signature</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: ADD / EDIT STOCKIST
         ========================================================================= */}
      {isStockistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
              <h3 className="text-base font-bold text-gray-900">
                {editingStockist ? 'Edit Stockist Profile' : 'Add New Medicine Stockist'}
              </h3>
              <button
                onClick={() => setIsStockistModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitStockist} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Stockist / Agency Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Balaji Medical Agency"
                  value={stockistForm.name}
                  onChange={(e) => setStockistForm({ ...stockistForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Contact Person</label>
                  <input
                    type="text"
                    placeholder="Representative name"
                    value={stockistForm.contact_person}
                    onChange={(e) => setStockistForm({ ...stockistForm, contact_person: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={stockistForm.phone}
                    onChange={(e) => setStockistForm({ ...stockistForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Address / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Sadar Bazar, Delhi"
                  value={stockistForm.address}
                  onChange={(e) => setStockistForm({ ...stockistForm, address: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">GST Number</label>
                  <input
                    type="text"
                    placeholder="GSTIN"
                    value={stockistForm.gst_number}
                    onChange={(e) => setStockistForm({ ...stockistForm, gst_number: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Drug License No</label>
                  <input
                    type="text"
                    placeholder="DL No"
                    value={stockistForm.drug_license_no}
                    onChange={(e) => setStockistForm({ ...stockistForm, drug_license_no: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Visits every Thursday afternoon"
                  value={stockistForm.notes}
                  onChange={(e) => setStockistForm({ ...stockistForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setIsStockistModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center space-x-1.5"
                >
                  {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>Save Stockist</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
