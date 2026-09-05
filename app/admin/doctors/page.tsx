"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { doctorService } from "@/services/doctors";
import { Doctor, DoctorMonthlyRevenue, AssistantDoctorSummary, DoctorPayout } from "@/types/doctor";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  UserCheck,
  Users,
  Plus,
  Edit,
  Trash2,
  Calendar,
  IndianRupee,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  FileText,
  AlertCircle,
  X,
  CreditCard,
  Percent,
  Stethoscope,
  ShieldCheck,
  ChevronRight,
  Filter,
  RefreshCw,
} from "lucide-react";

export default function DoctorManagementPage() {
  const router = useRouter();
  const { isAdmin, loading: isAdminLoading } = useIsAdmin();

  useEffect(() => {
    if (!isAdminLoading && !isAdmin) {
      router.replace('/admin/patients');
    }
  }, [isAdminLoading, isAdmin, router]);

  // Active Main View Tab: 'DIRECTORY' | 'ASSISTANT_DASHBOARD' | 'PAYOUT_LEDGER'
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ASSISTANT_DASHBOARD' | 'PAYOUT_LEDGER'>('ASSISTANT_DASHBOARD');

  // Month selector (Default: current month YYYY-MM)
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${d.getFullYear()}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Data States
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [assistantSummaries, setAssistantSummaries] = useState<AssistantDoctorSummary[]>([]);
  const [individualDoctorRevenue, setIndividualDoctorRevenue] = useState<DoctorMonthlyRevenue | null>(null);
  const [payouts, setPayouts] = useState<DoctorPayout[]>([]);

  // Doctor Form Modal States
  const [isDoctorModalOpen, setIsDoctorModalOpen] = useState<boolean>(false);
  const [isEditDoctor, setIsEditDoctor] = useState<boolean>(false);
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);

  const [doctorForm, setDoctorForm] = useState<{
    name: string;
    doctor_type: 'MAIN' | 'ASSISTANT';
    commission_percentage: 2 | 5 | 7 | 10;
    phone: string;
    email: string;
    status: 'ACTIVE' | 'INACTIVE';
    joining_date: string;
    notes: string;
  }>({
    name: '',
    doctor_type: 'ASSISTANT',
    commission_percentage: 5,
    phone: '',
    email: '',
    status: 'ACTIVE',
    joining_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Payout Record Modal State
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [payoutForm, setPayoutForm] = useState<{
    doctor_id: string;
    doctor_name: string;
    month: string;
    total_revenue: number;
    medicine_cost: number;
    crown_cap_cost: number;
    xray_cost: number;
    consultation_cost: number;
    braces_cost: number;
    total_excluded: number;
    eligible_revenue: number;
    commission_percentage: number;
    payout_amount: number;
    paid_amount: number;
    payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
    payment_date: string;
    payment_mode: 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'Other';
    transaction_reference: string;
    notes: string;
  }>({
    doctor_id: '',
    doctor_name: '',
    month: currentMonthStr,
    total_revenue: 0,
    medicine_cost: 0,
    crown_cap_cost: 0,
    xray_cost: 0,
    consultation_cost: 0,
    braces_cost: 0,
    total_excluded: 0,
    eligible_revenue: 0,
    commission_percentage: 5,
    payout_amount: 0,
    paid_amount: 0,
    payment_status: 'PAID',
    payment_date: new Date().toISOString().split('T')[0],
    payment_mode: 'UPI',
    transaction_reference: '',
    notes: '',
  });

  // Fetch Doctors List
  const fetchDoctors = useCallback(async () => {
    try {
      const data = await doctorService.list();
      setDoctors(data);
    } catch (err) {
      console.error("Failed to load doctors:", err);
    }
  }, []);

  // Fetch Assistant Dashboard Summaries
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      if (selectedDoctorId === 'ALL') {
        const summaries = await doctorService.getAssistantDoctorsMonthlySummary(selectedMonth);
        setAssistantSummaries(summaries);
        setIndividualDoctorRevenue(null);
      } else {
        const singleRev = await doctorService.getMonthlyRevenue({
          doctorId: selectedDoctorId,
          month: selectedMonth,
        });
        setIndividualDoctorRevenue(singleRev);
      }
    } catch (err) {
      console.error("Failed to load monthly revenue data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedDoctorId]);

  // Fetch Payouts History
  const fetchPayouts = useCallback(async () => {
    try {
      const data = await doctorService.listPayouts({
        month: selectedMonth === 'ALL' ? undefined : selectedMonth,
      });
      setPayouts(data);
    } catch (err) {
      console.error("Failed to load payouts:", err);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (activeTab === 'ASSISTANT_DASHBOARD') {
      fetchDashboardData();
    } else if (activeTab === 'PAYOUT_LEDGER') {
      fetchPayouts();
    }
  }, [activeTab, fetchDashboardData, fetchPayouts]);

  // Handle Doctor Add / Edit Save
  const handleSaveDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorForm.name.trim()) {
      alert("Please enter doctor name");
      return;
    }

    try {
      if (isEditDoctor && editingDoctorId) {
        await doctorService.update(editingDoctorId, {
          name: doctorForm.name.trim(),
          doctor_type: doctorForm.doctor_type,
          commission_percentage: doctorForm.doctor_type === 'ASSISTANT' ? doctorForm.commission_percentage : undefined,
          phone: doctorForm.phone.trim() || undefined,
          email: doctorForm.email.trim() || undefined,
          status: doctorForm.status,
          joining_date: doctorForm.joining_date || undefined,
          notes: doctorForm.notes.trim() || undefined,
        });
        alert("Doctor updated successfully");
      } else {
        await doctorService.create({
          name: doctorForm.name.trim(),
          doctor_type: doctorForm.doctor_type,
          commission_percentage: doctorForm.doctor_type === 'ASSISTANT' ? doctorForm.commission_percentage : undefined,
          phone: doctorForm.phone.trim() || undefined,
          email: doctorForm.email.trim() || undefined,
          status: doctorForm.status,
          joining_date: doctorForm.joining_date || undefined,
          notes: doctorForm.notes.trim() || undefined,
        });
        alert("Doctor added successfully");
      }

      setIsDoctorModalOpen(false);
      fetchDoctors();
      if (activeTab === 'ASSISTANT_DASHBOARD') fetchDashboardData();
    } catch (err) {
      console.error("Failed to save doctor:", err);
      alert("Failed to save doctor details.");
    }
  };

  const handleEditDoctorClick = (doc: Doctor) => {
    setIsEditDoctor(true);
    setEditingDoctorId(doc.id || doc._id || null);
    setDoctorForm({
      name: doc.name,
      doctor_type: doc.doctor_type,
      commission_percentage: (doc.commission_percentage as any) || 5,
      phone: doc.phone || '',
      email: doc.email || '',
      status: doc.status,
      joining_date: doc.joining_date || new Date().toISOString().split('T')[0],
      notes: doc.notes || '',
    });
    setIsDoctorModalOpen(true);
  };

  const handleDeleteDoctor = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to delete ${docName}? This cannot be undone.`)) return;
    try {
      await doctorService.delete(docId);
      alert("Doctor removed successfully");
      fetchDoctors();
      if (activeTab === 'ASSISTANT_DASHBOARD') fetchDashboardData();
    } catch (err) {
      console.error("Failed to delete doctor:", err);
      alert("Failed to delete doctor.");
    }
  };

  const openNewDoctorModal = () => {
    setIsEditDoctor(false);
    setEditingDoctorId(null);
    setDoctorForm({
      name: '',
      doctor_type: 'ASSISTANT',
      commission_percentage: 5,
      phone: '',
      email: '',
      status: 'ACTIVE',
      joining_date: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsDoctorModalOpen(true);
  };

  // Open Record Payout Modal
  const openRecordPayoutModal = (revenueData: DoctorMonthlyRevenue | AssistantDoctorSummary) => {
    const isFullRev = 'totalExcluded' in revenueData && 'eligibleRevenue' in revenueData;
    const docId = 'doctorId' in revenueData ? revenueData.doctorId : (revenueData as any).id;
    const docName = revenueData.doctorName;
    const totalRev = revenueData.totalRevenue;
    const medCost = revenueData.medicineCost;
    const crownCapCost = revenueData.crownCapCost;
    const xrayCost = revenueData.xrayCost;
    const consultCost = revenueData.consultationCost;
    const bracesCost = revenueData.bracesCost;
    const totalExcluded = isFullRev ? revenueData.totalExcluded : (medCost + crownCapCost + xrayCost + consultCost + bracesCost);
    const eligibleRev = revenueData.eligibleRevenue;
    const comm = revenueData.commissionPercentage;
    const payable = revenueData.amountPayable;

    setPayoutForm({
      doctor_id: docId,
      doctor_name: docName,
      month: selectedMonth,
      total_revenue: totalRev,
      medicine_cost: medCost,
      crown_cap_cost: crownCapCost,
      xray_cost: xrayCost,
      consultation_cost: consultCost,
      braces_cost: bracesCost,
      total_excluded: totalExcluded,
      eligible_revenue: eligibleRev,
      commission_percentage: comm,
      payout_amount: payable,
      paid_amount: payable,
      payment_status: 'PAID',
      payment_date: new Date().toISOString().split('T')[0],
      payment_mode: 'UPI',
      transaction_reference: '',
      notes: `Monthly payout for ${selectedMonth} (${comm}% commission)`,
    });
    setIsPayoutModalOpen(true);
  };

  // Save Payout
  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutForm.doctor_id) {
      alert("Invalid doctor selection");
      return;
    }

    try {
      await doctorService.recordPayout({
        doctor_id: payoutForm.doctor_id,
        doctor_name: payoutForm.doctor_name,
        month: payoutForm.month,
        total_revenue: payoutForm.total_revenue,
        medicine_cost: payoutForm.medicine_cost,
        crown_cap_cost: payoutForm.crown_cap_cost,
        xray_cost: payoutForm.xray_cost,
        consultation_cost: payoutForm.consultation_cost,
        braces_cost: payoutForm.braces_cost,
        total_excluded: payoutForm.total_excluded,
        eligible_revenue: payoutForm.eligible_revenue,
        commission_percentage: payoutForm.commission_percentage,
        payout_amount: payoutForm.payout_amount,
        paid_amount: payoutForm.paid_amount,
        payment_status: payoutForm.payment_status,
        payment_date: payoutForm.payment_date,
        payment_mode: payoutForm.payment_mode,
        transaction_reference: payoutForm.transaction_reference || undefined,
        notes: payoutForm.notes || undefined,
      });

      alert("Payout recorded successfully!");
      setIsPayoutModalOpen(false);
      fetchDashboardData();
      fetchPayouts();
    } catch (err) {
      console.error("Failed to record payout:", err);
      alert("Failed to record payout.");
    }
  };

  // Filtered Doctors for Directory Tab
  const filteredDoctors = useMemo(() => {
    return doctors.filter((d) => {
      const matchesSearch =
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (d.phone && d.phone.includes(searchTerm)) ||
        (d.notes && d.notes.toLowerCase().includes(searchTerm));
      return matchesSearch;
    });
  }, [doctors, searchTerm]);

  // Month Selector Presets
  const generateMonthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = (d.getMonth() + 1).toString().padStart(2, '0');
      const val = `${d.getFullYear()}-${mStr}`;
      const label = d.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ val, label });
    }
    return options;
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Stethoscope size={26} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Doctor & Assistant Management</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage Main & Assistant doctors, track clinical revenue, automated exclusions, and monthly payouts
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={openNewDoctorModal}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
          >
            <Plus size={18} />
            <span>Add Doctor</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-gray-200 bg-white px-6 rounded-xl shadow-sm">
        <button
          onClick={() => setActiveTab('ASSISTANT_DASHBOARD')}
          className={`py-4 px-5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'ASSISTANT_DASHBOARD'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <TrendingUp size={18} />
          <span>Monthly Revenue & Payouts</span>
        </button>

        <button
          onClick={() => setActiveTab('DIRECTORY')}
          className={`py-4 px-5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'DIRECTORY'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users size={18} />
          <span>Doctor Directory ({doctors.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('PAYOUT_LEDGER')}
          className={`py-4 px-5 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all ${
            activeTab === 'PAYOUT_LEDGER'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CreditCard size={18} />
          <span>Payout History Ledger</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: MONTHLY REVENUE & ASSISTANT DOCTOR DASHBOARD
          ========================================================================= */}
      {activeTab === 'ASSISTANT_DASHBOARD' && (
        <div className="space-y-6">
          {/* Controls Bar: Month Picker + Doctor Selector */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {/* Month Picker */}
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-gray-400" />
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Month:</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {generateMonthOptions.map((opt) => (
                    <option key={opt.val} value={opt.val}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Doctor Selector */}
              <div className="flex items-center gap-2">
                <UserCheck size={18} className="text-gray-400" />
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Doctor View:</label>
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white font-medium text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL">All Assistant Doctors (Overview)</option>
                  {doctors
                    .filter((d) => d.doctor_type === 'ASSISTANT')
                    .map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>
                        {d.name} ({d.commission_percentage}% Commission)
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <button
              onClick={() => fetchDashboardData()}
              className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-3 py-2 rounded-lg font-medium transition-all"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span>Refresh Revenue</span>
            </button>
          </div>

          {/* Individual Doctor Deep-Dive View */}
          {individualDoctorRevenue ? (
            <div className="space-y-6">
              {/* Doctor Summary Header Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    ₹{individualDoctorRevenue.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {individualDoctorRevenue.totalPrescriptionsCount} Prescriptions / Cases
                  </p>
                </div>

                <div className="bg-red-50/70 p-5 rounded-2xl border border-red-100 shadow-sm">
                  <p className="text-xs font-semibold text-red-600 uppercase tracking-wider">Total Excluded</p>
                  <p className="text-2xl font-bold text-red-700 mt-2">
                    -₹{individualDoctorRevenue.totalExcluded.toLocaleString()}
                  </p>
                  <p className="text-xs text-red-500 mt-1">Meds, Crowns, X-ray, OPD, Braces</p>
                </div>

                <div className="bg-emerald-50/70 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                  <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Eligible Revenue</p>
                  <p className="text-2xl font-bold text-emerald-800 mt-2">
                    ₹{individualDoctorRevenue.eligibleRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs text-emerald-600 mt-1">Treatment Commission Base</p>
                </div>

                <div className="bg-blue-50/70 p-5 rounded-2xl border border-blue-100 shadow-sm">
                  <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Commission %</p>
                  <p className="text-2xl font-bold text-blue-800 mt-2">
                    {individualDoctorRevenue.commissionPercentage}%
                  </p>
                  <p className="text-xs text-blue-600 mt-1">{individualDoctorRevenue.doctorName}</p>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm">
                  <p className="text-xs font-semibold text-blue-200 uppercase tracking-wider">Payable to Doctor</p>
                  <p className="text-2xl font-black mt-2">
                    ₹{individualDoctorRevenue.amountPayable.toLocaleString()}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs bg-white/20 px-2 py-0.5 rounded text-white font-medium">
                      {individualDoctorRevenue.payoutRecord ? individualDoctorRevenue.payoutRecord.payment_status : "UNPAID"}
                    </span>
                    <button
                      onClick={() => openRecordPayoutModal(individualDoctorRevenue)}
                      className="text-xs bg-white text-blue-700 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-all shadow-sm"
                    >
                      Record Payout
                    </button>
                  </div>
                </div>
              </div>

              {/* Formula & Financial Summary Breakdown Table (Exact Specification) */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Monthly Revenue Calculation Breakdown</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Formula: Eligible Revenue = Total Revenue − Meds − Crown/Cap − X-ray − Consultation − Braces
                    </p>
                  </div>
                  <span className="text-xs bg-blue-50 text-blue-700 font-semibold px-3 py-1 rounded-full border border-blue-100">
                    Month: {selectedMonth}
                  </span>
                </div>

                <div className="p-6">
                  <div className="max-w-xl mx-auto border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200">
                        <tr>
                          <th className="px-5 py-3 text-left font-bold">Particular</th>
                          <th className="px-5 py-3 text-right font-bold">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        <tr className="hover:bg-gray-50">
                          <td className="px-5 py-3 font-semibold text-gray-900">Total Revenue</td>
                          <td className="px-5 py-3 text-right font-bold text-gray-900">
                            ₹{individualDoctorRevenue.totalRevenue.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="text-red-600 bg-red-50/30">
                          <td className="px-5 py-2.5 pl-8">Medicine Cost</td>
                          <td className="px-5 py-2.5 text-right font-medium">
                            -₹{individualDoctorRevenue.medicineCost.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="text-red-600 bg-red-50/30">
                          <td className="px-5 py-2.5 pl-8">Crown / Cap Cost</td>
                          <td className="px-5 py-2.5 text-right font-medium">
                            -₹{individualDoctorRevenue.crownCapCost.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="text-red-600 bg-red-50/30">
                          <td className="px-5 py-2.5 pl-8">X-Ray (OPG / IOPAR)</td>
                          <td className="px-5 py-2.5 text-right font-medium">
                            -₹{individualDoctorRevenue.xrayCost.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="text-red-600 bg-red-50/30">
                          <td className="px-5 py-2.5 pl-8">Consultation Charges</td>
                          <td className="px-5 py-2.5 text-right font-medium">
                            -₹{individualDoctorRevenue.consultationCost.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="text-red-600 bg-red-50/30">
                          <td className="px-5 py-2.5 pl-8">Braces – All Types</td>
                          <td className="px-5 py-2.5 text-right font-medium">
                            -₹{individualDoctorRevenue.bracesCost.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="text-red-600 bg-red-50/30">
                          <td className="px-5 py-2.5 pl-8">RPD, FPD, Bridge & Implants</td>
                          <td className="px-5 py-2.5 text-right font-medium">
                            -₹{(individualDoctorRevenue.prosthoImplantCost || 0).toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-emerald-50 text-emerald-900 font-bold border-t-2 border-emerald-200">
                          <td className="px-5 py-3">Eligible Revenue</td>
                          <td className="px-5 py-3 text-right text-base">
                            ₹{individualDoctorRevenue.eligibleRevenue.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="bg-blue-50 text-blue-900 font-semibold">
                          <td className="px-5 py-3">Doctor Commission %</td>
                          <td className="px-5 py-3 text-right">
                            {individualDoctorRevenue.commissionPercentage}%
                          </td>
                        </tr>
                        <tr className="bg-indigo-600 text-white font-black text-base">
                          <td className="px-5 py-3.5">Payable to Doctor</td>
                          <td className="px-5 py-3.5 text-right text-lg">
                            ₹{individualDoctorRevenue.amountPayable.toLocaleString()}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Itemized Prescriptions Breakdown List */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">
                    Prescriptions & Treatments for {individualDoctorRevenue.doctorName} ({individualDoctorRevenue.prescriptions.length})
                  </h3>
                </div>

                {individualDoctorRevenue.prescriptions.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <FileText size={40} className="mx-auto mb-2 opacity-50" />
                    <p className="font-medium">No prescriptions found for this doctor in {selectedMonth}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-600">
                      <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200">
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Patient</th>
                          <th className="px-4 py-3">Ref No.</th>
                          <th className="px-4 py-3 text-right">Total Rev</th>
                          <th className="px-4 py-3 text-right text-red-600">Meds</th>
                          <th className="px-4 py-3 text-right text-red-600">Crown</th>
                          <th className="px-4 py-3 text-right text-red-600">X-Ray</th>
                          <th className="px-4 py-3 text-right text-red-600">Consult</th>
                          <th className="px-4 py-3 text-right text-red-600">Braces</th>
                          <th className="px-4 py-3 text-right text-red-600">RPD/FPD/Impl.</th>
                          <th className="px-4 py-3 text-right font-bold text-emerald-700">Eligible</th>
                          <th className="px-4 py-3 text-right font-bold text-blue-700">Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {individualDoctorRevenue.prescriptions.map((rx) => (
                          <tr key={rx.prescription_id} className="hover:bg-gray-50 transition-all">
                            <td className="px-4 py-3 font-medium text-gray-900">{rx.prescription_date}</td>
                            <td className="px-4 py-3 font-medium text-gray-900">
                              <div>{rx.patient_name}</div>
                              <div className="text-xs text-gray-400">{rx.phone_number}</div>
                            </td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">
                              {rx.reference_number || "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-gray-900">
                              ₹{rx.total_revenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {rx.medicine_cost > 0 ? `-₹${rx.medicine_cost}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {rx.crown_cap_cost > 0 ? `-₹${rx.crown_cap_cost}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {rx.xray_cost > 0 ? `-₹${rx.xray_cost}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {rx.consultation_cost > 0 ? `-₹${rx.consultation_cost}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {rx.braces_cost > 0 ? `-₹${rx.braces_cost}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {rx.prostho_implant_cost && rx.prostho_implant_cost > 0 ? `-₹${rx.prostho_implant_cost}` : "-"}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-emerald-700">
                              ₹{rx.eligible_revenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right font-black text-blue-700">
                              ₹{rx.payable_commission.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* All Assistant Doctors Overview Table */
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assistant Doctors Monthly Summary</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Commission & Payout calculation for month: <span className="font-semibold text-gray-800">{selectedMonth}</span>
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-gray-400">
                  <RefreshCw size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
                  <p className="font-medium">Calculating revenue and eligible payouts...</p>
                </div>
              ) : assistantSummaries.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <UserCheck size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="font-medium">No active assistant doctors found.</p>
                  <p className="text-xs mt-1">Add assistant doctors from the Doctor Directory tab.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600">
                    <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200">
                      <tr>
                        <th className="px-5 py-3">Doctor Name</th>
                        <th className="px-4 py-3 text-center">Comm. %</th>
                        <th className="px-4 py-3 text-right">Total Revenue</th>
                        <th className="px-4 py-3 text-right text-red-600">Meds Excluded</th>
                        <th className="px-4 py-3 text-right text-red-600">Other Exclusions</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-700">Eligible Revenue</th>
                        <th className="px-4 py-3 text-right font-black text-blue-700">Payable Amount</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {assistantSummaries.map((doc) => {
                        const otherExcl = doc.totalExcluded - doc.medicineCost;
                        return (
                          <tr key={doc.doctorId} className="hover:bg-gray-50 transition-all">
                            <td className="px-5 py-4 font-bold text-gray-900">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                                  {doc.doctorName.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p>{doc.doctorName}</p>
                                  <p className="text-xs font-normal text-gray-400">{doc.totalPrescriptions} cases</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-lg text-xs border border-blue-100">
                                {doc.commissionPercentage}%
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-gray-900">
                              ₹{doc.totalRevenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-right text-red-600 font-medium">
                              -₹{doc.medicineCost.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-right text-red-600 font-medium">
                              -₹{otherExcl.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-right font-bold text-emerald-700 text-base">
                              ₹{doc.eligibleRevenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-right font-black text-indigo-700 text-base">
                              ₹{doc.amountPayable.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                  doc.payoutStatus === 'PAID'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : doc.payoutStatus === 'PARTIAL'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {doc.payoutStatus}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedDoctorId(doc.doctorId)}
                                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1.5 rounded-lg font-semibold transition-all"
                                >
                                  Breakdown
                                </button>
                                <button
                                  onClick={() => openRecordPayoutModal(doc)}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1.5 rounded-lg font-semibold transition-all shadow-sm"
                                >
                                  Payout
                                </button>
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
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: DOCTOR DIRECTORY & MANAGEMENT
          ========================================================================= */}
      {activeTab === 'DIRECTORY' && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search doctors by name, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              onClick={openNewDoctorModal}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all text-sm"
            >
              <Plus size={18} />
              <span>Add New Doctor</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3.5">Doctor Name</th>
                    <th className="px-4 py-3.5">Doctor Type</th>
                    <th className="px-4 py-3.5 text-center">Commission %</th>
                    <th className="px-4 py-3.5">Phone / Contact</th>
                    <th className="px-4 py-3.5">Joining Date</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDoctors.map((doc) => (
                    <tr key={doc.id || doc._id} className="hover:bg-gray-50 transition-all">
                      <td className="px-5 py-4 font-bold text-gray-900">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                              doc.doctor_type === 'MAIN'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {doc.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p>{doc.name}</p>
                            {doc.notes && <p className="text-xs font-normal text-gray-400">{doc.notes}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            doc.doctor_type === 'MAIN'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {doc.doctor_type === 'MAIN' ? 'Main Doctor' : 'Assistant Doctor'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {doc.doctor_type === 'ASSISTANT' ? (
                          <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg text-xs border border-blue-100">
                            {doc.commission_percentage}%
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        <div>{doc.phone || "-"}</div>
                        {doc.email && <div className="text-xs text-gray-400">{doc.email}</div>}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">{doc.joining_date || "-"}</td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            doc.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEditDoctorClick(doc)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Doctor"
                          >
                            <Edit size={16} />
                          </button>
                          {doc.doctor_type === 'ASSISTANT' && (
                            <button
                              onClick={() => handleDeleteDoctor(doc.id || doc._id || '', doc.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="Delete Doctor"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: PAYOUT HISTORY LEDGER
          ========================================================================= */}
      {activeTab === 'PAYOUT_LEDGER' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Doctor Payout History Ledger</h3>
                <p className="text-xs text-gray-500 mt-0.5">All recorded monthly disbursements to assistant doctors</p>
              </div>
            </div>

            {payouts.length === 0 ? (
              <div className="p-12 text-center text-gray-400">
                <CreditCard size={40} className="mx-auto mb-2 opacity-50" />
                <p className="font-medium">No recorded payouts found for this period.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200">
                    <tr>
                      <th className="px-5 py-3">Month</th>
                      <th className="px-5 py-3">Doctor Name</th>
                      <th className="px-4 py-3 text-right">Eligible Revenue</th>
                      <th className="px-4 py-3 text-center">Comm. %</th>
                      <th className="px-4 py-3 text-right font-bold text-gray-900">Amount Paid</th>
                      <th className="px-4 py-3">Payment Date</th>
                      <th className="px-4 py-3">Mode</th>
                      <th className="px-4 py-3">Txn Reference</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payouts.map((p) => (
                      <tr key={p.id || p._id} className="hover:bg-gray-50 transition-all">
                        <td className="px-5 py-4 font-bold text-gray-900">{p.month}</td>
                        <td className="px-5 py-4 font-semibold text-gray-800">{p.doctor_name}</td>
                        <td className="px-4 py-4 text-right">₹{p.eligible_revenue.toLocaleString()}</td>
                        <td className="px-4 py-4 text-center">{p.commission_percentage}%</td>
                        <td className="px-4 py-4 text-right font-black text-emerald-700 text-base">
                          ₹{p.paid_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-gray-700">{p.payment_date || "-"}</td>
                        <td className="px-4 py-4">
                          <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-medium text-gray-700">
                            {p.payment_mode || "Cash"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs font-mono text-gray-500">
                          {p.transaction_reference || "-"}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
                            {p.payment_status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT DOCTOR
          ========================================================================= */}
      {isDoctorModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {isEditDoctor ? 'Edit Doctor Details' : 'Add New Doctor'}
              </h2>
              <button
                onClick={() => setIsDoctorModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDoctor} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Doctor Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Priya Sharma"
                  value={doctorForm.name}
                  onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Doctor Type</label>
                  <select
                    value={doctorForm.doctor_type}
                    onChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        doctor_type: e.target.value as 'MAIN' | 'ASSISTANT',
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="MAIN">Main / Regular Doctor</option>
                    <option value="ASSISTANT">Assistant Doctor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Commission %</label>
                  <select
                    disabled={doctorForm.doctor_type !== 'ASSISTANT'}
                    value={doctorForm.commission_percentage}
                    onChange={(e) =>
                      setDoctorForm({
                        ...doctorForm,
                        commission_percentage: Number(e.target.value) as 2 | 5 | 7 | 10,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-bold text-blue-700 disabled:opacity-50 disabled:bg-gray-100"
                  >
                    <option value={2}>2%</option>
                    <option value={5}>5%</option>
                    <option value={7}>7%</option>
                    <option value={10}>10%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                  <select
                    value={doctorForm.status}
                    onChange={(e) =>
                      setDoctorForm({ ...doctorForm, status: e.target.value as 'ACTIVE' | 'INACTIVE' })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={doctorForm.joining_date}
                  onChange={(e) => setDoctorForm({ ...doctorForm, joining_date: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes / Specialization</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Endodontics, Dental Surgery, Associate"
                  value={doctorForm.notes}
                  onChange={(e) => setDoctorForm({ ...doctorForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDoctorModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl text-sm shadow-sm transition-all"
                >
                  {isEditDoctor ? 'Update Doctor' : 'Save Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: RECORD PAYOUT
          ========================================================================= */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Record Doctor Payout</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  {payoutForm.doctor_name} • {payoutForm.month}
                </p>
              </div>
              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePayout} className="space-y-4 mt-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 space-y-2">
                <div className="flex justify-between text-xs text-blue-900">
                  <span>Eligible Revenue:</span>
                  <span className="font-bold">₹{payoutForm.eligible_revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-blue-900">
                  <span>Commission Rate:</span>
                  <span className="font-bold">{payoutForm.commission_percentage}%</span>
                </div>
                <div className="flex justify-between text-sm font-black text-blue-950 pt-2 border-t border-blue-200">
                  <span>Calculated Payout:</span>
                  <span className="text-base">₹{payoutForm.payout_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Amount Paid (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    value={payoutForm.paid_amount}
                    onChange={(e) => setPayoutForm({ ...payoutForm, paid_amount: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Status</label>
                  <select
                    value={payoutForm.payment_status}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        payment_status: e.target.value as 'PENDING' | 'PARTIAL' | 'PAID',
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="PAID">Full Paid</option>
                    <option value="PARTIAL">Partial Payment</option>
                    <option value="PENDING">Pending</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={payoutForm.payment_date}
                    onChange={(e) => setPayoutForm({ ...payoutForm, payment_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Payment Mode</label>
                  <select
                    value={payoutForm.payment_mode}
                    onChange={(e) =>
                      setPayoutForm({
                        ...payoutForm,
                        payment_mode: e.target.value as any,
                      })
                    }
                    className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                  >
                    <option value="UPI">UPI</option>
                    <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                    <option value="Cash">Cash</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Transaction Reference / UTR / Cheque No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. UPI Ref # 309817264812"
                  value={payoutForm.transaction_reference}
                  onChange={(e) => setPayoutForm({ ...payoutForm, transaction_reference: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={payoutForm.notes}
                  onChange={(e) => setPayoutForm({ ...payoutForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
                >
                  Confirm & Save Payout
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
