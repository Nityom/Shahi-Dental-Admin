"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  reviewService,
  recallService,
  followupService,
  staffPaymentService,
} from '@/services/registers';
import { getPatients } from '@/services/patients';
import {
  ReviewRecord,
  PatientRecall,
  PatientFollowup,
  StaffPaymentRecord,
} from '@/types/registers';
import { Patient } from '@/types/patient';
import { useIsAdmin } from '@/hooks/use-is-admin';
import {
  ClipboardList,
  Calendar,
  PhoneCall,
  IndianRupee,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  X,
  UserCheck,
} from 'lucide-react';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

type RegisterTab =
  | 'REVIEW'
  | 'RECALL'
  | 'FOLLOWUP'
  | 'STAFF_PAYMENTS';

function RegistersContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as RegisterTab) || 'REVIEW';
  const { isAdmin } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<RegisterTab>(initialTab);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as RegisterTab;
    if (tabParam && ['REVIEW', 'RECALL', 'FOLLOWUP', 'STAFF_PAYMENTS'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Autocomplete suggestions
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Data States
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [recalls, setRecalls] = useState<PatientRecall[]>([]);
  const [followups, setFollowups] = useState<PatientFollowup[]>([]);
  const [staffPayments, setStaffPayments] = useState<StaffPaymentRecord[]>([]);

  // Selected staff for ledger view
  const [selectedStaffName, setSelectedStaffName] = useState<string>('ALL');
  const [staffLedgerSummary, setStaffLedgerSummary] = useState<any>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Today Date String
  const todayStr = new Date().toISOString().split('T')[0];

  // Tab Forms Data State
  const [reviewForm, setReviewForm] = useState<Omit<ReviewRecord, '_id' | 'id' | 'created_at' | 'updated_at'>>({
    patient_name: '',
    phone_number: '',
    reference_number: '',
    review_date: todayStr,
    doctor_name: 'Dr. Kautilya Swaroop',
    chief_complaint_or_treatment: '',
    findings_notes: '',
    status: 'Scheduled',
  });

  const [recallForm, setRecallForm] = useState<Omit<PatientRecall, '_id' | 'id' | 'created_at' | 'updated_at'>>({
    patient_name: '',
    phone_number: '',
    reference_number: '',
    recall_type: '6-Month Preventive Checkup',
    due_date: todayStr,
    status: 'Due',
    doctor_name: 'Dr. Kautilya Swaroop',
    notes: '',
    contacted_date: '',
  });

  const [followupForm, setFollowupForm] = useState<Omit<PatientFollowup, '_id' | 'id' | 'created_at' | 'updated_at'>>({
    patient_name: '',
    phone_number: '',
    reference_number: '',
    followup_date: todayStr,
    treatment_summary: '',
    doctor_name: 'Dr. Kautilya Swaroop',
    status: 'Pending',
    notes: '',
    next_followup_date: '',
  });

  const [staffPaymentForm, setStaffPaymentForm] = useState<Omit<StaffPaymentRecord, '_id' | 'id' | 'created_at'>>({
    staff_name: '',
    staff_role: 'Dental Assistant',
    staff_phone: '',
    salary_month: todayStr.slice(0, 7), // YYYY-MM
    payment_date: todayStr,
    payment_type: 'Salary',
    base_salary: 0,
    amount_paid: 0,
    previous_payments_total: 0,
    pending_balance: 0,
    payment_mode: 'Cash',
    transaction_reference: '',
    paid_by: 'Dr. Kautilya Swaroop',
    notes: '',
  });

  // Fetch Patients for autocomplete
  useEffect(() => {
    getPatients().then((data) => setPatients(data || [])).catch(() => {});
  }, []);

  const handlePatientQueryChange = (val: string) => {
    setPatientSearchQuery(val);
    if (val.trim()) {
      const q = val.toLowerCase();
      const matches = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone_number.includes(q) ||
          (p.reference_number && p.reference_number.toLowerCase().includes(q))
      );
      setPatientSuggestions(matches.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectPatientForForm = (p: Patient) => {
    if (activeTab === 'REVIEW') {
      setReviewForm((prev) => ({
        ...prev,
        patient_name: p.name,
        phone_number: p.phone_number,
        reference_number: p.reference_number,
      }));
    } else if (activeTab === 'RECALL') {
      setRecallForm((prev) => ({
        ...prev,
        patient_name: p.name,
        phone_number: p.phone_number,
        reference_number: p.reference_number,
      }));
    } else if (activeTab === 'FOLLOWUP') {
      setFollowupForm((prev) => ({
        ...prev,
        patient_name: p.name,
        phone_number: p.phone_number,
        reference_number: p.reference_number,
      }));
    }
    setShowSuggestions(false);
    setPatientSearchQuery(`${p.name} (${p.reference_number || p.phone_number})`);
  };

  // Fetch Data Function
  const fetchData = useCallback(async () => {
    setLoading(true);
    const filter = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: searchTerm || undefined,
    };

    try {
      if (activeTab === 'REVIEW') {
        const data = await reviewService.list(filter);
        setReviews(data);
      } else if (activeTab === 'RECALL') {
        const data = await recallService.list(filter);
        setRecalls(data);
      } else if (activeTab === 'FOLLOWUP') {
        const data = await followupService.list(filter);
        setFollowups(data);
      } else if (activeTab === 'STAFF_PAYMENTS') {
        const data = await staffPaymentService.list({
          staffName: selectedStaffName === 'ALL' ? undefined : selectedStaffName,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: searchTerm || undefined,
        });
        setStaffPayments(data);

        if (selectedStaffName !== 'ALL') {
          const summary = await staffPaymentService.getLedgerSummary(selectedStaffName);
          setStaffLedgerSummary(summary);
        } else {
          setStaffLedgerSummary(null);
        }
      }
    } catch (err) {
      console.error('Error fetching register data:', err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, startDate, endDate, statusFilter, searchTerm, selectedStaffName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Unique staff names list
  const staffNamesList = useMemo(() => {
    const names = new Set(staffPayments.map((p) => p.staff_name));
    return Array.from(names);
  }, [staffPayments]);

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setPatientSearchQuery('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (activeTab === 'REVIEW') {
        if (isEditMode && editingId) await reviewService.update(editingId, reviewForm);
        else await reviewService.create(reviewForm);
      } else if (activeTab === 'RECALL') {
        if (isEditMode && editingId) await recallService.update(editingId, recallForm);
        else await recallService.create(recallForm);
      } else if (activeTab === 'FOLLOWUP') {
        if (isEditMode && editingId) await followupService.update(editingId, followupForm);
        else await followupService.create(followupForm);
      } else if (activeTab === 'STAFF_PAYMENTS') {
        if (isEditMode && editingId) await staffPaymentService.update(editingId, staffPaymentForm);
        else await staffPaymentService.create(staffPaymentForm);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Error saving entry: ${err.message || 'Failed'}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 w-full p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <ClipboardList className="text-blue-600" />
              <span>Registers & Clinical Records</span>
            </h1>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              Patient reviews, recalls, follow-ups, and staff payments history.
            </p>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition"
          >
            <Plus size={16} />
            Add Entry
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1.5 bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm">
          {[
            { id: 'REVIEW', label: 'Review Register', icon: UserCheck },
            { id: 'RECALL', label: 'Patient Recall', icon: Calendar },
            { id: 'FOLLOWUP', label: 'Follow-up Register', icon: PhoneCall },
            { id: 'STAFF_PAYMENTS', label: 'Staff Register & Payments', icon: IndianRupee },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  const newTab = tab.id as RegisterTab;
                  setActiveTab(newTab);
                  setStatusFilter('ALL');
                  setSearchTerm('');
                  router.push(`/admin/registers?tab=${newTab}`);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            {activeTab === 'STAFF_PAYMENTS' && (
              <select
                value={selectedStaffName}
                onChange={(e) => setSelectedStaffName(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-md bg-white font-medium text-gray-700"
              >
                <option value="ALL">All Staff Members</option>
                {staffNamesList.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-1 text-xs text-gray-500">
              <span>Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-md"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-md"
              />
            </div>

            <button
              onClick={fetchData}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600"
              title="Refresh"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, phone, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Staff Ledger KPI Summary */}
        {activeTab === 'STAFF_PAYMENTS' && staffLedgerSummary && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-gray-500 font-semibold uppercase">Staff Member</span>
              <div className="text-base font-bold text-blue-900">{staffLedgerSummary.staffName}</div>
            </div>
            <div>
              <span className="text-gray-500 font-semibold uppercase">Total Salary Paid</span>
              <div className="text-base font-bold text-green-700">₹{staffLedgerSummary.totalSalaryPaid.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <span className="text-gray-500 font-semibold uppercase">Total Advances</span>
              <div className="text-base font-bold text-orange-600">₹{staffLedgerSummary.totalAdvancePaid.toLocaleString('en-IN')}</div>
            </div>
            <div>
              <span className="text-gray-500 font-semibold uppercase">Net Transactions</span>
              <div className="text-base font-bold text-gray-900">{staffLedgerSummary.totalPaymentsCount} records</div>
            </div>
          </div>
        )}

        {/* Main Register Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* 1. REVIEW REGISTER TABLE */}
              {activeTab === 'REVIEW' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Review Date</th>
                      <th className="py-2.5 px-3">Patient Details</th>
                      <th className="py-2.5 px-3">Treatment / Purpose</th>
                      <th className="py-2.5 px-3">Doctor</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Findings & Notes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {reviews.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-gray-500">No review records found.</td></tr>
                    ) : (
                      reviews.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50/80">
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">{r.review_date}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{r.patient_name}</div>
                            <div className="text-[11px] text-gray-500">📱 {r.phone_number} {r.reference_number && `• ${r.reference_number}`}</div>
                          </td>
                          <td className="py-3 px-3 text-gray-800">{r.chief_complaint_or_treatment || '-'}</td>
                          <td className="py-3 px-3 text-gray-600">{r.doctor_name || '-'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              r.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              r.status === 'Visited' ? 'bg-blue-100 text-blue-800' :
                              r.status === 'Scheduled' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                            }`}>{r.status}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-500 max-w-xs truncate">{r.findings_notes || '-'}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => { setReviewForm(r); setEditingId(r.id || null); setIsEditMode(true); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={14} /></button>
                              {isAdmin && <button onClick={async () => { if (confirm('Delete?')) { await reviewService.delete(r.id!); fetchData(); } }} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 2. RECALL REGISTER TABLE */}
              {activeTab === 'RECALL' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Due Date</th>
                      <th className="py-2.5 px-3">Patient Details</th>
                      <th className="py-2.5 px-3">Recall Reason / Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Contacted Date</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recalls.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-gray-500">No recall records found.</td></tr>
                    ) : (
                      recalls.map((rc) => (
                        <tr key={rc.id} className="hover:bg-gray-50/80">
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">{rc.due_date}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{rc.patient_name}</div>
                            <div className="text-[11px] text-gray-500">📱 {rc.phone_number}</div>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-800">{rc.recall_type}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              rc.status === 'Completed' ? 'bg-green-100 text-green-800' :
                              rc.status === 'Contacted' ? 'bg-blue-100 text-blue-800' :
                              rc.status === 'Scheduled' ? 'bg-purple-100 text-purple-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>{rc.status}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600">{rc.contacted_date || '-'}</td>
                          <td className="py-3 px-3 text-gray-500 max-w-xs truncate">{rc.notes || '-'}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => { setRecallForm(rc); setEditingId(rc.id || null); setIsEditMode(true); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={14} /></button>
                              {isAdmin && <button onClick={async () => { if (confirm('Delete?')) { await recallService.delete(rc.id!); fetchData(); } }} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 3. FOLLOWUP REGISTER TABLE */}
              {activeTab === 'FOLLOWUP' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Follow-up Date</th>
                      <th className="py-2.5 px-3">Patient Details</th>
                      <th className="py-2.5 px-3">Treatment Performed</th>
                      <th className="py-2.5 px-3">Calling Status</th>
                      <th className="py-2.5 px-3">Next Date</th>
                      <th className="py-2.5 px-3">Notes</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {followups.length === 0 ? (
                      <tr><td colSpan={7} className="py-12 text-center text-gray-500">No followup records found.</td></tr>
                    ) : (
                      followups.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50/80">
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">{f.followup_date}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{f.patient_name}</div>
                            <div className="text-[11px] text-gray-500">📱 {f.phone_number}</div>
                          </td>
                          <td className="py-3 px-3 text-gray-800">{f.treatment_summary || '-'}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              f.status === 'Completed' || f.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                              f.status === 'Called - Reached' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                            }`}>{f.status}</span>
                          </td>
                          <td className="py-3 px-3 text-gray-600">{f.next_followup_date || '-'}</td>
                          <td className="py-3 px-3 text-gray-500 max-w-xs truncate">{f.notes || '-'}</td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => { setFollowupForm(f); setEditingId(f.id || null); setIsEditMode(true); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={14} /></button>
                              {isAdmin && <button onClick={async () => { if (confirm('Delete?')) { await followupService.delete(f.id!); fetchData(); } }} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}

              {/* 4. STAFF PAYMENT HISTORY TABLE */}
              {activeTab === 'STAFF_PAYMENTS' && (
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Staff Name & Role</th>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Payment Type</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Reference / Paid By</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffPayments.length === 0 ? (
                      <tr><td colSpan={8} className="py-12 text-center text-gray-500">No staff payment records found.</td></tr>
                    ) : (
                      staffPayments.map((sp) => (
                        <tr key={sp.id} className="hover:bg-gray-50/80">
                          <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">{sp.payment_date}</td>
                          <td className="py-3 px-3">
                            <div className="font-bold text-gray-900">{sp.staff_name}</div>
                            <div className="text-[11px] text-gray-500">{sp.staff_role}</div>
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700">{sp.salary_month}</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              sp.payment_type === 'Salary' ? 'bg-green-100 text-green-800' :
                              sp.payment_type === 'Advance' ? 'bg-orange-100 text-orange-800' :
                              sp.payment_type === 'Incentive / Bonus' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}>{sp.payment_type}</span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-gray-900 text-sm">
                            ₹{sp.amount_paid.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-3 font-medium text-gray-700">{sp.payment_mode}</td>
                          <td className="py-3 px-3 text-gray-600">
                            <div>{sp.transaction_reference || '-'}</div>
                            <div className="text-[10px] text-gray-400">By: {sp.paid_by || 'Clinic'}</div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-1.5">
                              <button onClick={() => { setStaffPaymentForm(sp); setEditingId(sp.id || null); setIsEditMode(true); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={14} /></button>
                              {isAdmin && <button onClick={async () => { if (confirm('Delete?')) { await staffPaymentService.delete(sp.id!); fetchData(); } }} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">
                {isEditMode ? 'Edit Record' : 'New Entry'} - {activeTab.replace('_', ' ')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {/* Autocomplete Patient for relevant tabs */}
              {['REVIEW', 'RECALL', 'FOLLOWUP'].includes(activeTab) && !isEditMode && (
                <div className="relative">
                  <label className="block font-semibold text-gray-700 mb-1">Search Patient</label>
                  <input
                    type="text"
                    placeholder="Search by name, phone or ref #..."
                    value={patientSearchQuery}
                    onChange={(e) => handlePatientQueryChange(e.target.value)}
                    className="w-full px-3 py-1.5 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {showSuggestions && patientSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                      {patientSuggestions.map((p) => (
                        <div
                          key={p.id || p.phone_number}
                          onClick={() => selectPatientForForm(p)}
                          className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-0"
                        >
                          <div className="font-bold text-gray-900">{p.name}</div>
                          <div className="text-[11px] text-gray-500">📱 {p.phone_number} {p.reference_number && `• ${p.reference_number}`}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* REVIEW FORM FIELDS */}
              {activeTab === 'REVIEW' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Patient Name *</label>
                      <input type="text" value={reviewForm.patient_name} onChange={(e) => setReviewForm({ ...reviewForm, patient_name: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input type="text" value={reviewForm.phone_number} onChange={(e) => setReviewForm({ ...reviewForm, phone_number: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Review Date</label>
                      <input type="date" value={reviewForm.review_date} onChange={(e) => setReviewForm({ ...reviewForm, review_date: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Status</label>
                      <select value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as any })} className="w-full px-3 py-1.5 border rounded-lg bg-white">
                        <option value="Scheduled">Scheduled</option>
                        <option value="Visited">Visited</option>
                        <option value="Completed">Completed</option>
                        <option value="Missed">Missed</option>
                        <option value="Rescheduled">Rescheduled</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Chief Complaint / Treatment</label>
                    <input type="text" value={reviewForm.chief_complaint_or_treatment || ''} onChange={(e) => setReviewForm({ ...reviewForm, chief_complaint_or_treatment: e.target.value })} placeholder="e.g. Post-RCT Review wrt 46" className="w-full px-3 py-1.5 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Findings / Notes</label>
                    <textarea rows={2} value={reviewForm.findings_notes || ''} onChange={(e) => setReviewForm({ ...reviewForm, findings_notes: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" />
                  </div>
                </>
              )}

              {/* RECALL FORM FIELDS */}
              {activeTab === 'RECALL' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Patient Name *</label>
                      <input type="text" value={recallForm.patient_name} onChange={(e) => setRecallForm({ ...recallForm, patient_name: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input type="text" value={recallForm.phone_number} onChange={(e) => setRecallForm({ ...recallForm, phone_number: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Recall Reason *</label>
                      <input type="text" value={recallForm.recall_type} onChange={(e) => setRecallForm({ ...recallForm, recall_type: e.target.value })} placeholder="Scaling, 6-Month Checkup" required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Due Date *</label>
                      <input type="date" value={recallForm.due_date} onChange={(e) => setRecallForm({ ...recallForm, due_date: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Status</label>
                      <select value={recallForm.status} onChange={(e) => setRecallForm({ ...recallForm, status: e.target.value as any })} className="w-full px-3 py-1.5 border rounded-lg bg-white">
                        <option value="Due">Due</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Scheduled">Scheduled</option>
                        <option value="Completed">Completed</option>
                        <option value="Dismissed">Dismissed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Contacted Date</label>
                      <input type="date" value={recallForm.contacted_date || ''} onChange={(e) => setRecallForm({ ...recallForm, contacted_date: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                  </div>
                </>
              )}

              {/* FOLLOWUP FORM FIELDS */}
              {activeTab === 'FOLLOWUP' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Patient Name *</label>
                      <input type="text" value={followupForm.patient_name} onChange={(e) => setFollowupForm({ ...followupForm, patient_name: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                      <input type="text" value={followupForm.phone_number} onChange={(e) => setFollowupForm({ ...followupForm, phone_number: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Followup Date *</label>
                      <input type="date" value={followupForm.followup_date} onChange={(e) => setFollowupForm({ ...followupForm, followup_date: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Status</label>
                      <select value={followupForm.status} onChange={(e) => setFollowupForm({ ...followupForm, status: e.target.value as any })} className="w-full px-3 py-1.5 border rounded-lg bg-white">
                        <option value="Pending">Pending</option>
                        <option value="Called - Reached">Called - Reached</option>
                        <option value="Called - No Answer">Called - No Answer</option>
                        <option value="Confirmed">Confirmed</option>
                        <option value="Completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Treatment Performed</label>
                    <input type="text" value={followupForm.treatment_summary || ''} onChange={(e) => setFollowupForm({ ...followupForm, treatment_summary: e.target.value })} placeholder="e.g. Tooth Extraction #47" className="w-full px-3 py-1.5 border rounded-lg" />
                  </div>
                </>
              )}

              {/* STAFF PAYMENT FORM FIELDS */}
              {activeTab === 'STAFF_PAYMENTS' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Staff Member Name *</label>
                      <input type="text" value={staffPaymentForm.staff_name} onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, staff_name: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg font-bold" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Staff Role *</label>
                      <input type="text" value={staffPaymentForm.staff_role} onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, staff_role: e.target.value })} required placeholder="Dental Assistant, Receptionist" className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Salary Month *</label>
                      <input type="text" value={staffPaymentForm.salary_month} onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, salary_month: e.target.value })} placeholder="2026-08" required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Payment Date *</label>
                      <input type="date" value={staffPaymentForm.payment_date} onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, payment_date: e.target.value })} required className="w-full px-3 py-1.5 border rounded-lg" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Payment Type</label>
                      <select value={staffPaymentForm.payment_type} onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, payment_type: e.target.value as any })} className="w-full px-3 py-1.5 border rounded-lg bg-white">
                        <option value="Salary">Salary</option>
                        <option value="Advance">Advance</option>
                        <option value="Incentive / Bonus">Incentive / Bonus</option>
                        <option value="Reimbursement">Reimbursement</option>
                        <option value="Deduction">Deduction</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Amount Paid (₹) *</label>
                      <input type="number" value={staffPaymentForm.amount_paid} onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, amount_paid: Number(e.target.value) })} required className="w-full px-3 py-1.5 border rounded-lg font-bold text-green-700" />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Payment Mode</label>
                      <select value={staffPaymentForm.payment_mode} onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, payment_mode: e.target.value as any })} className="w-full px-3 py-1.5 border rounded-lg bg-white">
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl hover:bg-gray-100">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl">
                  {isEditMode ? 'Update' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegistersPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading registers...</div>}>
      <RegistersContent />
    </Suspense>
  );
}
