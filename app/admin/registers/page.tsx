"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  reviewService,
  recallService,
  followupService,
  staffPaymentService,
  staffMemberService,
} from '@/services/registers';
import { getPatients } from '@/services/patients';
import {
  ReviewRecord,
  PatientRecall,
  PatientFollowup,
  StaffPaymentRecord,
  StaffMember,
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
  Users,
  Wallet,
  CheckCircle2,
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

  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isEditStaffMode, setIsEditStaffMode] = useState<boolean>(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<{
    name: string;
    role: string;
    phone: string;
    fixed_salary: number;
    notes: string;
  }>({
    name: '',
    role: 'Dental Assistant',
    phone: '',
    fixed_salary: 15000,
    notes: '',
  });

  const [staffPaymentForm, setStaffPaymentForm] = useState<Omit<StaffPaymentRecord, '_id' | 'id' | 'created_at'>>({
    staff_id: '',
    staff_name: '',
    staff_role: 'Dental Assistant',
    staff_phone: '',
    salary_month: todayStr.slice(0, 7), // YYYY-MM
    payment_date: todayStr,
    payment_type: 'Salary',
    base_salary: 0,
    amount_paid: 0,
    advance_deducted: 0,
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
        const [membersData, paymentsData] = await Promise.all([
          staffMemberService.list({ search: searchTerm || undefined }),
          staffPaymentService.list({
            staffName: selectedStaffName === 'ALL' ? undefined : selectedStaffName,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            search: searchTerm || undefined,
          }),
        ]);
        setStaffMembers(membersData);
        setStaffPayments(paymentsData);

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

  // Unique staff names list combining staff_members and payments
  const staffNamesList = useMemo(() => {
    const names = new Set<string>();
    staffMembers.forEach((s) => names.add(s.name));
    staffPayments.forEach((p) => names.add(p.staff_name));
    return Array.from(names);
  }, [staffMembers, staffPayments]);

  // Staff Totals KPI
  const staffTotals = useMemo(() => {
    const totalFixedSalary = staffMembers.reduce((sum, s) => sum + (s.fixed_salary || 0), 0);
    const totalAdvanceBalance = staffMembers.reduce((sum, s) => sum + (s.advance_balance || 0), 0);
    const totalPaidThisMonth = staffMembers.reduce((sum, s) => sum + (s.total_paid_this_month || 0), 0);
    const totalPendingThisMonth = staffMembers.reduce((sum, s) => sum + (s.pending_salary_this_month || 0), 0);
    return { totalFixedSalary, totalAdvanceBalance, totalPaidThisMonth, totalPendingThisMonth };
  }, [staffMembers]);

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setPatientSearchQuery('');
    if (activeTab === 'STAFF_PAYMENTS') {
      const defaultStaff = staffMembers[0];
      setStaffPaymentForm({
        staff_id: defaultStaff ? (defaultStaff.id || (defaultStaff as any)._id) : '',
        staff_name: defaultStaff ? defaultStaff.name : '',
        staff_role: defaultStaff ? defaultStaff.role : 'Dental Assistant',
        staff_phone: defaultStaff ? (defaultStaff.phone || '') : '',
        salary_month: todayStr.slice(0, 7),
        payment_date: todayStr,
        payment_type: 'Salary',
        base_salary: defaultStaff ? (defaultStaff.fixed_salary || 0) : 0,
        amount_paid: defaultStaff ? (defaultStaff.pending_salary_this_month && defaultStaff.pending_salary_this_month > 0 ? defaultStaff.pending_salary_this_month : defaultStaff.fixed_salary || 0) : 0,
        advance_deducted: 0,
        previous_payments_total: 0,
        pending_balance: 0,
        payment_mode: 'Cash',
        transaction_reference: '',
        paid_by: 'Dr. Kautilya Swaroop',
        notes: '',
      });
    }
    setIsModalOpen(true);
  };

  const openAddStaffModal = () => {
    setStaffForm({
      name: '',
      role: 'Dental Assistant',
      phone: '',
      fixed_salary: 15000,
      notes: '',
    });
    setIsEditStaffMode(false);
    setEditingStaffId(null);
    setIsStaffModalOpen(true);
  };

  const openEditStaffModal = (staff: StaffMember) => {
    setStaffForm({
      name: staff.name,
      role: staff.role,
      phone: staff.phone || '',
      fixed_salary: staff.fixed_salary || 0,
      notes: staff.notes || '',
    });
    setIsEditStaffMode(true);
    setEditingStaffId(staff.id || (staff as any)._id || null);
    setIsStaffModalOpen(true);
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditStaffMode && editingStaffId) {
        await staffMemberService.update(editingStaffId, staffForm);
      } else {
        await staffMemberService.create(staffForm);
      }
      setIsStaffModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(`Error saving staff member: ${err.message || 'Failed'}`);
    }
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete staff member "${name}"?`)) return;
    try {
      await staffMemberService.delete(id);
      fetchData();
    } catch (err: any) {
      alert(`Error deleting staff member: ${err.message || 'Failed'}`);
    }
  };

  const openPayStaffModal = (staff: StaffMember, type: 'Salary' | 'Advance' = 'Salary') => {
    setIsEditMode(false);
    setEditingId(null);
    setStaffPaymentForm({
      staff_id: staff.id || (staff as any)._id,
      staff_name: staff.name,
      staff_role: staff.role,
      staff_phone: staff.phone || '',
      salary_month: todayStr.slice(0, 7),
      payment_date: todayStr,
      payment_type: type,
      base_salary: staff.fixed_salary,
      amount_paid: type === 'Salary' ? (staff.pending_salary_this_month && staff.pending_salary_this_month > 0 ? staff.pending_salary_this_month : staff.fixed_salary) : 0,
      advance_deducted: 0,
      previous_payments_total: 0,
      pending_balance: 0,
      payment_mode: 'Cash',
      transaction_reference: '',
      paid_by: 'Dr. Kautilya Swaroop',
      notes: '',
    });
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
        else await staffMemberService.recordPayment(staffPaymentForm);
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

          {activeTab === 'STAFF_PAYMENTS' ? (
            <div className="flex items-center gap-2">
              <button
                onClick={openAddStaffModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition"
              >
                <Plus size={16} />
                Add Staff Member
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition"
              >
                <IndianRupee size={16} />
                Record Payment
              </button>
            </div>
          ) : (
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-semibold shadow-sm transition"
            >
              <Plus size={16} />
              Add Entry
            </button>
          )}
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

        {/* Staff Overview, Fixed Salaries & Advance Balances */}
        {activeTab === 'STAFF_PAYMENTS' && (
          <div className="space-y-4">
            {/* 1. Overall Staff KPI Summary */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
                  <span>Staff Members</span>
                  <Users size={16} className="text-blue-600" />
                </div>
                <div className="text-2xl font-black text-gray-900 mt-1">{staffMembers.length}</div>
                <p className="text-[11px] text-gray-500 mt-0.5">Active clinic personnel</p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
                  <span>Fixed Monthly Payroll</span>
                  <IndianRupee size={16} className="text-indigo-600" />
                </div>
                <div className="text-2xl font-black text-indigo-900 mt-1">
                  ₹{staffTotals.totalFixedSalary.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">Total base salary commitment</p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm transition ${
                staffTotals.totalAdvanceBalance > 0
                  ? 'bg-amber-50/70 border-amber-200'
                  : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-center justify-between text-xs font-semibold uppercase">
                  <span className={staffTotals.totalAdvanceBalance > 0 ? 'text-amber-800' : 'text-gray-500'}>
                    Advance Balance
                  </span>
                  <Wallet size={16} className={staffTotals.totalAdvanceBalance > 0 ? 'text-amber-600' : 'text-gray-400'} />
                </div>
                <div className={`text-2xl font-black mt-1 ${
                  staffTotals.totalAdvanceBalance > 0 ? 'text-amber-900' : 'text-gray-900'
                }`}>
                  ₹{staffTotals.totalAdvanceBalance.toLocaleString('en-IN')}
                </div>
                <p className={`text-[11px] mt-0.5 ${
                  staffTotals.totalAdvanceBalance > 0 ? 'text-amber-700 font-medium' : 'text-gray-500'
                }`}>
                  {staffTotals.totalAdvanceBalance > 0 ? '⚠️ Total advance outstanding' : 'No advance outstanding'}
                </p>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase">
                  <span>Paid This Month</span>
                  <CheckCircle2 size={16} className="text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-700 mt-1">
                  ₹{staffTotals.totalPaidThisMonth.toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Remaining: ₹{staffTotals.totalPendingThisMonth.toLocaleString('en-IN')}
                </p>
              </div>
            </div>

            {/* 2. Staff Directory & Fixed Salaries Grid */}
            <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-100">
                <div>
                  <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Users size={18} className="text-blue-600" />
                    Staff Directory & Fixed Salaries
                  </h2>
                  <p className="text-xs text-gray-500">
                    Clinic staff profiles with fixed monthly salaries and live advance balances.
                  </p>
                </div>
                <button
                  onClick={openAddStaffModal}
                  className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition"
                >
                  <Plus size={14} /> Add New Staff
                </button>
              </div>

              {staffMembers.length === 0 ? (
                <div className="py-8 text-center text-gray-500 text-xs">
                  No staff members added yet. Click &quot;Add New Staff&quot; above to add staff and set their fixed salary.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
                  {staffMembers.map((member) => {
                    const hasAdvance = (member.advance_balance || 0) > 0;
                    return (
                      <div
                        key={member.id || (member as any)._id}
                        className="bg-gray-50/60 hover:bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex flex-col justify-between space-y-3 transition"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm uppercase">
                              {member.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900 text-sm leading-tight">{member.name}</div>
                              <span className="inline-block px-1.5 py-0.5 bg-gray-200 text-gray-700 text-[10px] font-medium rounded mt-0.5">
                                {member.role}
                              </span>
                              {member.phone && (
                                <div className="text-[11px] text-gray-500 mt-0.5">{member.phone}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEditStaffModal(member)}
                              className="text-gray-400 hover:text-blue-600 p-1"
                              title="Edit Staff Member & Fixed Salary"
                            >
                              <Edit size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => handleDeleteStaff(member.id || (member as any)._id, member.name)}
                                className="text-gray-400 hover:text-rose-600 p-1"
                                title="Delete Staff Member"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Salary & Advance Metrics */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200/80 text-xs">
                          <div>
                            <span className="text-[10px] uppercase font-semibold text-gray-500">Fixed Salary</span>
                            <div className="font-bold text-gray-900 text-sm">
                              ₹{(member.fixed_salary || 0).toLocaleString('en-IN')}
                              <span className="text-[10px] text-gray-500 font-normal"> /mo</span>
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-semibold text-gray-500">Advance Balance</span>
                            <div className={`font-bold text-sm flex items-center gap-1 ${
                              hasAdvance ? 'text-amber-700' : 'text-gray-500 font-normal'
                            }`}>
                              ₹{(member.advance_balance || 0).toLocaleString('en-IN')}
                              {hasAdvance && (
                                <span className="px-1 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                  Due
                                </span>
                              )}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-semibold text-gray-500">Paid This Month</span>
                            <div className="font-medium text-emerald-700">
                              ₹{(member.salary_paid_this_month || 0).toLocaleString('en-IN')}
                            </div>
                          </div>

                          <div>
                            <span className="text-[10px] uppercase font-semibold text-gray-500">Remaining</span>
                            <div className="font-medium text-gray-700">
                              ₹{(member.pending_salary_this_month || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Quick Action Buttons */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => openPayStaffModal(member, 'Salary')}
                            className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                          >
                            <IndianRupee size={12} /> Pay Salary
                          </button>
                          <button
                            onClick={() => openPayStaffModal(member, 'Advance')}
                            className="flex-1 py-1.5 px-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1"
                          >
                            <Wallet size={12} /> Give Advance
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Individual staff ledger summary if selected */}
            {staffLedgerSummary && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-500 font-semibold uppercase">Selected Staff</span>
                  <div className="text-base font-bold text-blue-900">{staffLedgerSummary.staffName}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold uppercase">Total Salary Paid</span>
                  <div className="text-base font-bold text-green-700">₹{staffLedgerSummary.totalSalaryPaid.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold uppercase">Total Advances Given</span>
                  <div className="text-base font-bold text-orange-600">₹{staffLedgerSummary.totalAdvancePaid.toLocaleString('en-IN')}</div>
                </div>
                <div>
                  <span className="text-gray-500 font-semibold uppercase">Total Payment Records</span>
                  <div className="text-base font-bold text-gray-900">{staffLedgerSummary.totalPaymentsCount} records</div>
                </div>
              </div>
            )}
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
                      <th className="py-2.5 px-3">Staff Details</th>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Payment Type</th>
                      <th className="py-2.5 px-3 text-right">Amount Paid</th>
                      <th className="py-2.5 px-3 text-right">Advance Deducted</th>
                      <th className="py-2.5 px-3">Mode</th>
                      <th className="py-2.5 px-3">Paid By / Ref</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {staffPayments.length === 0 ? (
                      <tr><td colSpan={9} className="py-12 text-center text-gray-500">No staff payment records found.</td></tr>
                    ) : (
                      staffPayments.map((sp) => {
                        const matchedStaff = staffMembers.find((m) => m.name.toLowerCase() === sp.staff_name.toLowerCase());
                        return (
                          <tr key={sp.id} className="hover:bg-gray-50/80">
                            <td className="py-3 px-3 font-semibold text-gray-900 whitespace-nowrap">{sp.payment_date}</td>
                            <td className="py-3 px-3">
                              <div className="font-bold text-gray-900">{sp.staff_name}</div>
                              <div className="text-[11px] text-gray-500 flex items-center gap-1.5 mt-0.5">
                                <span>{sp.staff_role}</span>
                                {matchedStaff && (
                                  <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded font-medium">
                                    Fixed: ₹{matchedStaff.fixed_salary.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-3 font-medium text-gray-700">{sp.salary_month}</td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sp.payment_type === 'Salary' ? 'bg-emerald-100 text-emerald-800' :
                                sp.payment_type === 'Advance' ? 'bg-amber-100 text-amber-800' :
                                sp.payment_type === 'Incentive / Bonus' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                              }`}>{sp.payment_type}</span>
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-gray-900 text-sm">
                              ₹{sp.amount_paid.toLocaleString('en-IN')}
                            </td>
                            <td className="py-3 px-3 text-right font-semibold">
                              {(sp.advance_deducted && sp.advance_deducted > 0) ? (
                                <span className="text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                                  -₹{sp.advance_deducted.toLocaleString('en-IN')}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 font-medium text-gray-700">{sp.payment_mode}</td>
                            <td className="py-3 px-3 text-gray-600">
                              <div>{sp.transaction_reference || sp.notes || '-'}</div>
                              <div className="text-[10px] text-gray-400">By: {sp.paid_by || 'Clinic'}</div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button onClick={() => { setStaffPaymentForm(sp); setEditingId(sp.id || null); setIsEditMode(true); setIsModalOpen(true); }} className="text-blue-600 hover:text-blue-800 p-1"><Edit size={14} /></button>
                                {isAdmin && <button onClick={async () => { if (confirm('Delete this payment record?')) { await staffPaymentService.delete(sp.id!); fetchData(); } }} className="text-red-600 hover:text-red-800 p-1"><Trash2 size={14} /></button>}
                              </div>
                            </td>
                          </tr>
                        );
                      })
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
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-gray-700">Select Staff Member *</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalOpen(false);
                          openAddStaffModal();
                        }}
                        className="text-blue-600 hover:text-blue-800 text-[11px] font-medium"
                      >
                        + New Staff
                      </button>
                    </div>
                    {staffMembers.length > 0 ? (
                      <select
                        value={staffPaymentForm.staff_name}
                        onChange={(e) => {
                          const selected = staffMembers.find((m) => m.name === e.target.value);
                          if (selected) {
                            setStaffPaymentForm({
                              ...staffPaymentForm,
                              staff_id: selected.id || (selected as any)._id,
                              staff_name: selected.name,
                              staff_role: selected.role,
                              staff_phone: selected.phone || '',
                              base_salary: selected.fixed_salary || 0,
                              amount_paid: staffPaymentForm.payment_type === 'Salary'
                                ? (selected.pending_salary_this_month && selected.pending_salary_this_month > 0
                                    ? selected.pending_salary_this_month
                                    : selected.fixed_salary || 0)
                                : staffPaymentForm.amount_paid,
                            });
                          } else {
                            setStaffPaymentForm({ ...staffPaymentForm, staff_name: e.target.value });
                          }
                        }}
                        required
                        className="w-full px-3 py-1.5 border rounded-lg bg-white font-medium"
                      >
                        <option value="">-- Choose Staff Member --</option>
                        {staffMembers.map((m) => (
                          <option key={m.id || (m as any)._id} value={m.name}>
                            {m.name} ({m.role}) — Fixed: ₹{(m.fixed_salary || 0).toLocaleString('en-IN')}/mo
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={staffPaymentForm.staff_name}
                        onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, staff_name: e.target.value })}
                        required
                        placeholder="Staff Member Name"
                        className="w-full px-3 py-1.5 border rounded-lg font-bold"
                      />
                    )}
                  </div>

                  {/* Staff Info Banner (Fixed Salary & Advance Balance) */}
                  {(() => {
                    const currentStaff = staffMembers.find(
                      (m) => m.name.toLowerCase() === (staffPaymentForm.staff_name || '').toLowerCase()
                    );
                    if (!currentStaff) return null;
                    const hasAdv = (currentStaff.advance_balance || 0) > 0;
                    return (
                      <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-500">Fixed Monthly Salary</span>
                          <div className="font-bold text-gray-900 text-sm">
                            ₹{(currentStaff.fixed_salary || 0).toLocaleString('en-IN')}
                            <span className="text-[10px] text-gray-500 font-normal"> /mo</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-gray-500">Advance Balance</span>
                          <div className={`font-bold text-sm flex items-center gap-1 ${hasAdv ? 'text-amber-700' : 'text-gray-600 font-medium'}`}>
                            ₹{(currentStaff.advance_balance || 0).toLocaleString('en-IN')}
                            {hasAdv && (
                              <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-bold">
                                Outstanding
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">When I Paid (Date) *</label>
                      <input
                        type="date"
                        value={staffPaymentForm.payment_date}
                        onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, payment_date: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 border rounded-lg font-medium"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Salary Month *</label>
                      <input
                        type="month"
                        value={staffPaymentForm.salary_month}
                        onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, salary_month: e.target.value })}
                        required
                        className="w-full px-3 py-1.5 border rounded-lg font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Payment Type *</label>
                      <select
                        value={staffPaymentForm.payment_type}
                        onChange={(e) => {
                          const ptype = e.target.value as any;
                          const currentStaff = staffMembers.find(
                            (m) => m.name.toLowerCase() === (staffPaymentForm.staff_name || '').toLowerCase()
                          );
                          let newAmount = staffPaymentForm.amount_paid;
                          if (ptype === 'Salary' && currentStaff) {
                            newAmount = currentStaff.pending_salary_this_month && currentStaff.pending_salary_this_month > 0
                              ? currentStaff.pending_salary_this_month
                              : currentStaff.fixed_salary || 0;
                          }
                          setStaffPaymentForm({ ...staffPaymentForm, payment_type: ptype, amount_paid: newAmount });
                        }}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white font-medium"
                      >
                        <option value="Salary">Salary (Fixed)</option>
                        <option value="Advance">Advance (Pre-payment)</option>
                        <option value="Incentive / Bonus">Incentive / Bonus</option>
                        <option value="Reimbursement">Reimbursement</option>
                        <option value="Deduction">Deduction / Repayment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">How Much I Paid (₹) *</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={staffPaymentForm.amount_paid === 0 ? '' : staffPaymentForm.amount_paid}
                          onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, amount_paid: Number(e.target.value) })}
                          required
                          placeholder="Amount paid"
                          className="w-full pl-7 pr-3 py-1.5 border rounded-lg font-bold text-gray-900 text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Advance deduction if staff has existing advance */}
                  {(() => {
                    const currentStaff = staffMembers.find(
                      (m) => m.name.toLowerCase() === (staffPaymentForm.staff_name || '').toLowerCase()
                    );
                    if (currentStaff && (currentStaff.advance_balance || 0) > 0 && staffPaymentForm.payment_type === 'Salary') {
                      return (
                        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="block font-semibold text-amber-900 text-xs">
                              Deduct from Advance Balance (Optional)
                            </label>
                            <span className="text-[10px] text-amber-700 font-medium">
                              Current Balance: ₹{(currentStaff.advance_balance || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                            <input
                              type="number"
                              min="0"
                              max={currentStaff.advance_balance || 0}
                              value={staffPaymentForm.advance_deducted === 0 ? '' : staffPaymentForm.advance_deducted}
                              onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, advance_deducted: Number(e.target.value) })}
                              placeholder="0"
                              className="w-full pl-7 pr-3 py-1.5 border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 bg-white"
                            />
                          </div>
                          <p className="text-[10px] text-amber-700">
                            Entering an amount here will automatically reduce the staff member&apos;s advance balance.
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Payment Mode</label>
                      <select
                        value={staffPaymentForm.payment_mode}
                        onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, payment_mode: e.target.value as any })}
                        className="w-full px-3 py-1.5 border rounded-lg bg-white"
                      >
                        <option value="Cash">Cash</option>
                        <option value="UPI">UPI</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-gray-700 mb-1">Paid By</label>
                      <input
                        type="text"
                        value={staffPaymentForm.paid_by || ''}
                        onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, paid_by: e.target.value })}
                        placeholder="Dr. Kautilya Swaroop"
                        className="w-full px-3 py-1.5 border rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">Notes / Transaction Reference</label>
                    <input
                      type="text"
                      value={staffPaymentForm.transaction_reference || staffPaymentForm.notes || ''}
                      onChange={(e) => setStaffPaymentForm({ ...staffPaymentForm, transaction_reference: e.target.value, notes: e.target.value })}
                      placeholder="e.g. Full salary for September, or Google Pay UPI ID"
                      className="w-full px-3 py-1.5 border rounded-lg"
                    />
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

      {/* Staff Member Add / Edit Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Users size={18} className="text-emerald-600" />
                {isEditStaffMode ? 'Edit Staff Member' : 'Add New Staff Member'}
              </h3>
              <button onClick={() => setIsStaffModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStaffSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={staffForm.name}
                  onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                  required
                  placeholder="e.g. Shivani, Priyanshu"
                  className="w-full px-3 py-2 border rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Role / Designation *</label>
                  <input
                    type="text"
                    value={staffForm.role}
                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                    required
                    placeholder="Dental Assistant, Receptionist, Boy"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Fixed Monthly Salary (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={staffForm.fixed_salary === 0 ? '' : staffForm.fixed_salary}
                    onChange={(e) => setStaffForm({ ...staffForm, fixed_salary: Number(e.target.value) })}
                    required
                    placeholder="e.g. 15000"
                    className="w-full pl-8 pr-3 py-2 border rounded-lg text-base font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">/ month</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  This base salary is recorded for monthly payroll calculations.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes / Remarks</label>
                <textarea
                  rows={2}
                  value={staffForm.notes}
                  onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                  placeholder="Joining date, working hours, bank details..."
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-gray-100 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-xs"
                >
                  {isEditStaffMode ? 'Update Staff Member' : 'Save Staff Member'}
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
