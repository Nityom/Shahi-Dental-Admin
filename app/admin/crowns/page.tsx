"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { crownCuttingService } from '@/services/registers';
import { getPatients } from '@/services/patients';
import { CrownCuttingRecord, CrownStatusCategory } from '@/types/registers';
import { Patient } from '@/types/patient';
import { useIsAdmin } from '@/hooks/use-is-admin';
import {
  Crown,
  Calendar,
  Search,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  X,
  Sparkles,
  IndianRupee,
  ExternalLink,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react';
import Link from 'next/link';

export default function CrownManagementPage() {
  const { isAdmin } = useIsAdmin();
  const [loading, setLoading] = useState<boolean>(true);
  const [crowns, setCrowns] = useState<CrownCuttingRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Date Range Presets - Default to ALL_TIME so all crown records are visible immediately
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateRangePreset, setDateRangePreset] = useState<'ALL_TIME' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('ALL_TIME');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Autocomplete suggestions for modal
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [patientSuggestions, setPatientSuggestions] = useState<Patient[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  // Modal Form State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState<Omit<CrownCuttingRecord, '_id' | 'id' | 'created_at' | 'updated_at'>>({
    patient_name: '',
    phone_number: '',
    reference_number: '',
    tooth_numbers: '',
    crown_type: 'Zirconia',
    shade: 'A2',
    cutting_date: todayStr,
    dentist_name: 'Dr. Kautilya Swaroop',
    lab_name: 'DentCare Dental Lab',
    impression_type: 'Addition Silicone',
    expected_delivery_date: '',
    patient_cost: 0,
    treatment_reference: '',
    crown_status: 'Crown Cutting',
    status: 'Crown Cutting',
    notes: '',
  });

  // Fetch Patients for autocomplete
  useEffect(() => {
    getPatients().then((data) => setPatients(data || [])).catch(() => {});
  }, []);

  const fetchCrowns = useCallback(async () => {
    setLoading(true);
    try {
      // Auto-sync prescriptions first to guarantee all RCT/Crown entries are up-to-date
      await crownCuttingService.syncAllPrescriptions();

      const data = await crownCuttingService.list({
        startDate: dateRangePreset === 'ALL_TIME' ? undefined : (startDate || undefined),
        endDate: dateRangePreset === 'ALL_TIME' ? undefined : (endDate || undefined),
        crownStatus: statusFilter === 'ALL' ? undefined : statusFilter,
        search: searchTerm || undefined,
      });
      setCrowns(data);
    } catch (err) {
      console.error('Failed to fetch crowns:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, dateRangePreset, statusFilter, searchTerm]);

  useEffect(() => {
    fetchCrowns();
  }, [fetchCrowns]);

  // Financial & KPI Calculations (Single Price: Total Crown Revenue)
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let countCutting = 0;
    let countReceived = 0;
    let countNotRequired = 0;

    crowns.forEach((c) => {
      const pCost = Number(c.patient_cost) || 0;
      totalRevenue += pCost;

      const st =
        (c.crown_status as string) ||
        (c.status === 'Crown Received' || c.status === 'Received' || c.status === 'Cemented / Completed'
          ? 'Crown Received'
          : c.status === 'Crown Not Required'
          ? 'Crown Not Required'
          : 'Crown Cutting');

      if (st === 'Crown Received') countReceived++;
      else if (st === 'Crown Not Required') countNotRequired++;
      else countCutting++;
    });

    return {
      totalRevenue,
      countCutting,
      countReceived,
      countNotRequired,
      totalRecords: crowns.length,
    };
  }, [crowns]);

  // Handle Date Range Presets
  const applyDatePreset = (preset: 'ALL_TIME' | 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM') => {
    setDateRangePreset(preset);
    const now = new Date();

    if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'TODAY') {
      const t = now.toISOString().split('T')[0];
      setStartDate(t);
      setEndDate(t);
    } else if (preset === 'YESTERDAY') {
      const y = new Date(now.setDate(now.getDate() - 1)).toISOString().split('T')[0];
      setStartDate(y);
      setEndDate(y);
    } else if (preset === 'LAST_7_DAYS') {
      const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
      setStartDate(sevenDaysAgo);
      setEndDate(new Date().toISOString().split('T')[0]);
    } else if (preset === 'THIS_MONTH') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      setStartDate(first);
      setEndDate(new Date().toISOString().split('T')[0]);
    }
  };

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
    setForm((prev) => ({
      ...prev,
      patient_name: p.name,
      phone_number: p.phone_number,
      reference_number: p.reference_number,
    }));
    setShowSuggestions(false);
    setPatientSearchQuery(`${p.name} (${p.reference_number || p.phone_number})`);
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setEditingId(null);
    setPatientSearchQuery('');
    setForm({
      patient_name: '',
      phone_number: '',
      reference_number: '',
      tooth_numbers: '',
      crown_type: 'Zirconia',
      shade: 'A2',
      cutting_date: todayStr,
      dentist_name: 'Dr. Kautilya Swaroop',
      lab_name: 'DentCare Dental Lab',
      impression_type: 'Addition Silicone',
      expected_delivery_date: '',
      patient_cost: 0,
      treatment_reference: '',
      crown_status: 'Crown Cutting',
      status: 'Crown Cutting',
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editingId) {
        await crownCuttingService.update(editingId, form);
      } else {
        await crownCuttingService.create(form);
      }
      setIsModalOpen(false);
      fetchCrowns();
    } catch (err: any) {
      alert(`Error saving crown record: ${err.message || 'Failed'}`);
    }
  };

  const handleQuickStatusChange = async (id: string, newStatus: CrownStatusCategory) => {
    try {
      await crownCuttingService.update(id, {
        crown_status: newStatus,
        status: newStatus as any,
      });
      fetchCrowns();
    } catch (err) {
      console.error('Failed to update crown status:', err);
      alert('Failed to update status');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 w-full p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-md shadow-blue-500/20">
              <Crown size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Crown Patients & Revenue</h1>
                <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded text-xs border border-blue-200 flex items-center gap-1">
                  <Sparkles size={12} /> Auto-Linked from Prescriptions
                </span>
              </div>
              <p className="text-xs md:text-sm text-gray-500 mt-0.5">
                Automatically maintained from RCT and Crown treatments. Track statuses (Cutting, Received, No Crown) and revenue.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => fetchCrowns()}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl transition"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs md:text-sm font-bold shadow-sm transition"
            >
              <Plus size={16} />
              Add Crown Entry
            </button>
          </div>
        </div>

        {/* Financial & Status KPI Cards (Single Crown Revenue & 3 Statuses in Blue Theme) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Crown Revenue */}
          <div className="bg-blue-600 text-white p-5 rounded-2xl shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-100">Total Crown Revenue</span>
              <span className="p-1.5 bg-white/20 text-white rounded-lg">
                <IndianRupee size={18} />
              </span>
            </div>
            <div className="text-3xl md:text-4xl font-black text-white mt-2">
              ₹{metrics.totalRevenue.toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-blue-100 mt-1">From {metrics.totalRecords} crown records</p>
          </div>

          {/* 1. Crown Cutting */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Crown Cutting' ? 'ALL' : 'Crown Cutting')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
              statusFilter === 'Crown Cutting'
                ? 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-500'
                : 'bg-white border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Crown Cutting' ? 'text-blue-100' : 'text-gray-500'}`}>
                1. Crown Cutting
              </span>
              <span className={`p-1.5 rounded-lg ${statusFilter === 'Crown Cutting' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
                <Clock size={16} />
              </span>
            </div>
            <div className={`text-3xl font-black mt-2 ${statusFilter === 'Crown Cutting' ? 'text-white' : 'text-gray-900'}`}>
              {metrics.countCutting}
            </div>
            <p className={`text-[11px] mt-1 ${statusFilter === 'Crown Cutting' ? 'text-blue-100' : 'text-gray-400'}`}>
              In Progress / Preparation
            </p>
          </div>

          {/* 2. Crown Received */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Crown Received' ? 'ALL' : 'Crown Received')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
              statusFilter === 'Crown Received'
                ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-600'
                : 'bg-white border-gray-200 hover:border-indigo-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Crown Received' ? 'text-indigo-100' : 'text-gray-500'}`}>
                2. Crown Received
              </span>
              <span className={`p-1.5 rounded-lg ${statusFilter === 'Crown Received' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
                <CheckCircle2 size={16} />
              </span>
            </div>
            <div className={`text-3xl font-black mt-2 ${statusFilter === 'Crown Received' ? 'text-white' : 'text-gray-900'}`}>
              {metrics.countReceived}
            </div>
            <p className={`text-[11px] mt-1 ${statusFilter === 'Crown Received' ? 'text-indigo-100' : 'text-gray-400'}`}>
              Received in clinic / fitted
            </p>
          </div>

          {/* 3. Crown Not Required */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'Crown Not Required' ? 'ALL' : 'Crown Not Required')}
            className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
              statusFilter === 'Crown Not Required'
                ? 'bg-slate-800 text-white border-slate-800 ring-2 ring-slate-800'
                : 'bg-white border-gray-200 hover:border-gray-400'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Crown Not Required' ? 'text-slate-300' : 'text-gray-500'}`}>
                3. Crown Not Required
              </span>
              <span className={`p-1.5 rounded-lg ${statusFilter === 'Crown Not Required' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
                <Ban size={16} />
              </span>
            </div>
            <div className={`text-3xl font-black mt-2 ${statusFilter === 'Crown Not Required' ? 'text-white' : 'text-gray-900'}`}>
              {metrics.countNotRequired}
            </div>
            <p className={`text-[11px] mt-1 ${statusFilter === 'Crown Not Required' ? 'text-slate-300' : 'text-gray-400'}`}>
              Crown No. / Not required
            </p>
          </div>
        </div>

        {/* Filter & Controls Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
          {/* Status Filter Chips & Date Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Status Chips */}
            <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
              {[
                { id: 'ALL', label: `All Crowns (${metrics.totalRecords})` },
                { id: 'Crown Cutting', label: `1. Crown Cutting (${metrics.countCutting})` },
                { id: 'Crown Received', label: `2. Crown Received (${metrics.countReceived})` },
                { id: 'Crown Not Required', label: `3. Crown Not Required (${metrics.countNotRequired})` },
              ].map((chip) => (
                <button
                  key={chip.id}
                  onClick={() => setStatusFilter(chip.id)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    statusFilter === chip.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                  }`}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Date Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'ALL_TIME', label: 'All Time' },
                { id: 'TODAY', label: 'Today' },
                { id: 'YESTERDAY', label: 'Yesterday' },
                { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
                { id: 'THIS_MONTH', label: 'This Month' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyDatePreset(preset.id as any)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                    dateRangePreset === preset.id
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date Picker & Search Input */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="font-semibold">Period:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateRangePreset('CUSTOM');
                }}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
              <span>to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateRangePreset('CUSTOM');
                }}
                className="px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs"
              />
            </div>

            <div className="relative flex-1 min-w-[240px] max-w-sm">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search patient, tooth, lab, ref #..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Main Crown Patients Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">
              Crown Patient Records ({crowns.length})
            </h3>
            <span className="text-xs text-gray-400">
              Auto-Synchronized with Prescription Treatments
            </span>
          </div>

          {loading ? (
            <div className="p-16 text-center text-gray-400">
              <RefreshCw size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
              <p className="font-medium">Loading crown patient records...</p>
            </div>
          ) : crowns.length === 0 ? (
            <div className="p-16 text-center text-gray-400">
              <Crown size={40} className="mx-auto mb-2 opacity-40 text-amber-500" />
              <p className="font-bold text-gray-700 text-base">No crown patient records found.</p>
              <p className="text-xs mt-1 text-gray-400">
                Prescriptions with RCT or Crown treatments automatically appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-gray-700 uppercase font-bold text-[11px] border-b border-gray-200">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Patient Details</th>
                    <th className="py-3.5 px-4">Tooth #</th>
                    <th className="py-3.5 px-4">Treatment Ref</th>
                    <th className="py-3.5 px-4">Crown Status</th>
                    <th className="py-3.5 px-4 text-right">Crown Price</th>
                    <th className="py-3.5 px-4">Crown Type</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {crowns.map((c) => {
                    const currentStatus: CrownStatusCategory =
                      (c.crown_status as any) ||
                      (c.status === 'Crown Received' || c.status === 'Received' || c.status === 'Cemented / Completed'
                        ? 'Crown Received'
                        : c.status === 'Crown Not Required'
                        ? 'Crown Not Required'
                        : 'Crown Cutting');

                    const pCost = Number(c.patient_cost) || 0;

                    return (
                      <tr key={c.id || c._id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3.5 px-4 font-semibold text-gray-900 whitespace-nowrap">
                          {c.cutting_date}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900 text-sm">{c.patient_name}</div>
                          <div className="text-[11px] text-gray-500">
                            📱 {c.phone_number} {c.reference_number && `• ${c.reference_number}`}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-black text-blue-700 text-sm">
                          {c.tooth_numbers}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900">{c.treatment_reference || 'RCT / Crown'}</div>
                          {c.prescription_id && (
                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-mono">
                              Auto-Linked Rx
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {/* 1-Click Status Dropdown */}
                          <select
                            value={currentStatus}
                            onChange={(e) =>
                              handleQuickStatusChange(c.id || c._id || '', e.target.value as CrownStatusCategory)
                            }
                            className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border outline-none cursor-pointer ${
                              currentStatus === 'Crown Received'
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : currentStatus === 'Crown Not Required'
                                ? 'bg-gray-100 text-gray-700 border-gray-300'
                                : 'bg-blue-50 text-blue-800 border-blue-200'
                            }`}
                          >
                            <option value="Crown Cutting">1. Crown Cutting</option>
                            <option value="Crown Received">2. Crown Received</option>
                            <option value="Crown Not Required">3. Crown Not Required</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-blue-700 text-sm">
                          {pCost ? `₹${pCost.toLocaleString('en-IN')}` : '₹0'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-gray-800">{c.crown_type || 'Zirconia'}</span>
                          {c.shade && <span className="text-gray-500 ml-1">({c.shade})</span>}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex justify-end gap-1.5 items-center">
                            {c.prescription_id && (
                              <Link
                                href={`/admin/prescription?patientId=${c.prescription_id}&reference=${c.reference_number || ''}`}
                                className="p-1 text-blue-600 hover:text-blue-800 bg-blue-50 rounded"
                                title="View Prescription"
                              >
                                <ExternalLink size={13} />
                              </Link>
                            )}
                            <button
                              onClick={() => {
                                setForm({
                                  patient_name: c.patient_name,
                                  phone_number: c.phone_number,
                                  reference_number: c.reference_number || '',
                                  tooth_numbers: c.tooth_numbers,
                                  crown_type: c.crown_type || 'Zirconia',
                                  shade: c.shade || '',
                                  cutting_date: c.cutting_date,
                                  dentist_name: c.dentist_name || 'Dr. Kautilya Swaroop',
                                  lab_name: c.lab_name || '',
                                  impression_type: c.impression_type || '',
                                  expected_delivery_date: c.expected_delivery_date || '',
                                  patient_cost: c.patient_cost || 0,
                                  treatment_reference: c.treatment_reference || '',
                                  crown_status: currentStatus,
                                  status: c.status,
                                  notes: c.notes || '',
                                });
                                setEditingId(c.id || c._id || null);
                                setIsEditMode(true);
                                setIsModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title="Edit"
                            >
                              <Edit size={14} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={async () => {
                                  if (confirm('Delete this crown record?')) {
                                    await crownCuttingService.delete(c.id || c._id || '');
                                    fetchCrowns();
                                  }
                                }}
                                className="text-red-600 hover:text-red-800 p-1"
                                title="Delete"
                              >
                                <Trash2 size={14} />
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-900 text-sm">
                {isEditMode ? 'Edit Crown Record' : 'New Crown Entry'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 text-xs">
              {/* Autocomplete Patient */}
              {!isEditMode && (
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
                          <div className="text-[11px] text-gray-500">
                            📱 {p.phone_number} {p.reference_number && `• ${p.reference_number}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Patient Name *</label>
                  <input
                    type="text"
                    value={form.patient_name}
                    onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={form.phone_number}
                    onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Tooth Numbers *</label>
                  <input
                    type="text"
                    value={form.tooth_numbers}
                    onChange={(e) => setForm({ ...form, tooth_numbers: e.target.value })}
                    required
                    placeholder="e.g. 16, 46"
                    className="w-full px-3 py-1.5 border rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Crown Status *</label>
                  <select
                    value={form.crown_status || 'Crown Cutting'}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        crown_status: e.target.value as any,
                        status: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-1.5 border rounded-lg bg-white font-bold text-blue-700"
                  >
                    <option value="Crown Cutting">1. Crown Cutting</option>
                    <option value="Crown Received">2. Crown Received</option>
                    <option value="Crown Not Required">3. Crown Not Required</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Treatment / RCT Ref</label>
                  <input
                    type="text"
                    value={form.treatment_reference || ''}
                    onChange={(e) => setForm({ ...form, treatment_reference: e.target.value })}
                    placeholder="e.g. RCT wrt 46"
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Crown Type / Material</label>
                  <input
                    type="text"
                    value={form.crown_type || 'Zirconia'}
                    onChange={(e) => setForm({ ...form, crown_type: e.target.value })}
                    placeholder="Zirconia, PFM, E-Max"
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Shade</label>
                  <input
                    type="text"
                    value={form.shade || ''}
                    onChange={(e) => setForm({ ...form, shade: e.target.value })}
                    placeholder="A2, A3.5"
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Record Date *</label>
                  <input
                    type="date"
                    value={form.cutting_date}
                    onChange={(e) => setForm({ ...form, cutting_date: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Crown Price (₹) *</label>
                  <input
                    type="number"
                    value={form.patient_cost || 0}
                    onChange={(e) => setForm({ ...form, patient_cost: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border rounded-lg font-black text-green-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Special instructions..."
                  className="w-full px-3 py-1.5 border rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl"
                >
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
