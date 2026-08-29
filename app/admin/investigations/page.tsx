"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { investigationService } from '@/services/investigations';
import { getPatients } from '@/services/patients';
import { InvestigationRecord } from '@/types/registers';
import { Patient } from '@/types/patient';
import {
  Activity,
  Calendar,
  Search,
  Plus,
  BarChart3,
  RefreshCw,
  Edit,
  Trash2,
  X,
  TrendingUp,
} from 'lucide-react';
import { useIsAdmin } from '@/hooks/use-is-admin';

export default function InvestigationsPage() {
  const { isAdmin } = useIsAdmin();
  const [investigations, setInvestigations] = useState<InvestigationRecord[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('OPG'); // Default to OPG view

  // Date Range States
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [dateRangePreset, setDateRangePreset] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(firstOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState<string>('');
  const [filteredPatientSuggestions, setFilteredPatientSuggestions] = useState<Patient[]>([]);
  const [showPatientSuggestions, setShowPatientSuggestions] = useState<boolean>(false);

  const [formData, setFormData] = useState<Omit<InvestigationRecord, '_id' | 'id' | 'created_at'>>({
    patient_name: '',
    phone_number: '',
    reference_number: '',
    investigation_type: 'OPG',
    investigation_date: todayStr,
    doctor_name: 'Dr. Kautilya Swaroop',
    technician_name: '',
    indication: 'Pre-treatment Full Mouth Evaluation',
    findings: '',
    film_type: 'Digital',
    cost: 500,
    payment_status: 'PAID',
    notes: '',
  });

  const fetchInvestigations = useCallback(async () => {
    setLoading(true);
    try {
      const data = await investigationService.list({
        investigationType: typeFilter === 'ALL' ? undefined : typeFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchTerm || undefined,
      });
      setInvestigations(data);
    } catch (err) {
      console.error('Failed to load investigations:', err);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, startDate, endDate, searchTerm]);

  const fetchPatientsList = useCallback(async () => {
    try {
      const data = await getPatients();
      setPatients(data || []);
    } catch (err) {
      console.error('Failed to load patients list:', err);
    }
  }, []);

  useEffect(() => {
    fetchInvestigations();
  }, [fetchInvestigations]);

  useEffect(() => {
    fetchPatientsList();
  }, [fetchPatientsList]);

  // Handle Date Range Presets
  const applyDatePreset = (preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'CUSTOM') => {
    setDateRangePreset(preset);
    const now = new Date();

    if (preset === 'TODAY') {
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

  // Autocomplete patient handler
  const handlePatientSelect = (p: Patient) => {
    setFormData((prev) => ({
      ...prev,
      patient_name: p.name,
      phone_number: p.phone_number,
      reference_number: p.reference_number || '',
    }));
    setPatientSearchQuery(p.name);
    setShowPatientSuggestions(false);
  };

  const handlePatientSearchChange = (query: string) => {
    setPatientSearchQuery(query);
    setFormData((prev) => ({ ...prev, patient_name: query }));
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      const matches = patients.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone_number.includes(q) ||
          (p.reference_number && p.reference_number.toLowerCase().includes(q))
      );
      setFilteredPatientSuggestions(matches.slice(0, 5));
      setShowPatientSuggestions(true);
    } else {
      setShowPatientSuggestions(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode && editingId) {
        await investigationService.update(editingId, formData);
      } else {
        await investigationService.create(formData);
      }
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditingId(null);
      fetchInvestigations();
    } catch (err: any) {
      alert(`Error saving investigation: ${err.message || 'Failed'}`);
    }
  };

  const handleEdit = (rec: InvestigationRecord) => {
    setFormData({
      patient_id: rec.patient_id,
      patient_name: rec.patient_name,
      phone_number: rec.phone_number,
      reference_number: rec.reference_number,
      investigation_type: rec.investigation_type,
      investigation_date: rec.investigation_date,
      doctor_name: rec.doctor_name || 'Dr. Kautilya Swaroop',
      technician_name: rec.technician_name || '',
      indication: rec.indication || '',
      findings: rec.findings || '',
      film_type: rec.film_type || 'Digital',
      cost: rec.cost || 500,
      payment_status: rec.payment_status || 'PAID',
      notes: rec.notes || '',
    });
    setPatientSearchQuery(rec.patient_name);
    setEditingId(rec.id || null);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this investigation record?')) {
      try {
        await investigationService.delete(id);
        fetchInvestigations();
      } catch (err: any) {
        alert('Failed to delete investigation record');
      }
    }
  };

  const openNewModal = (type: string = 'OPG') => {
    setFormData({
      patient_name: '',
      phone_number: '',
      reference_number: '',
      investigation_type: type,
      investigation_date: todayStr,
      doctor_name: 'Dr. Kautilya Swaroop',
      technician_name: '',
      indication: type === 'OPG' ? 'Pre-treatment Full Mouth Evaluation' : '',
      findings: '',
      film_type: 'Digital',
      cost: type === 'OPG' ? 500 : 200,
      payment_status: 'PAID',
      notes: '',
    });
    setPatientSearchQuery('');
    setIsEditMode(false);
    setEditingId(null);
    setIsModalOpen(true);
  };

  // Date-wise OPG Counting Breakdown calculation
  const { totalOpgs, dateWiseOpgCounts, totalCost } = useMemo(() => {
    const opgRecords = investigations.filter((i) => i.investigation_type.toUpperCase() === 'OPG');
    const dateMap = new Map<string, number>();

    for (const opg of opgRecords) {
      const d = opg.investigation_date;
      dateMap.set(d, (dateMap.get(d) || 0) + 1);
    }

    const dateCounts = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const totalRev = opgRecords.reduce((sum, r) => sum + (Number(r.cost) || 0), 0);

    return {
      totalOpgs: opgRecords.length,
      dateWiseOpgCounts: dateCounts,
      totalCost: totalRev,
    };
  }, [investigations]);

  return (
    <div className="min-h-screen bg-gray-50/50 w-full p-4 md:p-6 space-y-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2.5">
              <Activity className="text-blue-600 h-8 w-8" />
              Investigation & OPG Module
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              Track OPG counts, date-wise volume, patient records, and diagnostic investigations
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => openNewModal('OPG')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              New OPG Record
            </button>
            <button
              onClick={() => openNewModal('IOPAR')}
              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium shadow-sm transition"
            >
              + Other Test
            </button>
          </div>
        </div>

        {/* Date Filter & Preset Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Date Period:</span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'TODAY', label: 'Today' },
                  { key: 'YESTERDAY', label: 'Yesterday' },
                  { key: 'LAST_7_DAYS', label: 'Last 7 Days' },
                  { key: 'THIS_MONTH', label: 'This Month' },
                  { key: 'CUSTOM', label: 'Custom' },
                ].map((p) => (
                  <button
                    key={p.key}
                    onClick={() => applyDatePreset(p.key as any)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition ${
                      dateRangePreset === p.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateRangePreset('CUSTOM');
                }}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-md"
              />
              <span className="text-xs text-gray-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateRangePreset('CUSTOM');
                }}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-md"
              />
              <button
                onClick={fetchInvestigations}
                className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600"
                title="Refresh"
              >
                <RefreshCw size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">Total OPGs Done</p>
                <h3 className="text-3xl font-black mt-1">{totalOpgs}</h3>
              </div>
              <div className="p-2.5 bg-white/15 rounded-xl">
                <Activity className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-blue-100 mt-3 font-medium">In selected date range</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">OPG Days Active</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{dateWiseOpgCounts.length}</h3>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Avg ~{dateWiseOpgCounts.length > 0 ? (totalOpgs / dateWiseOpgCounts.length).toFixed(1) : 0} OPGs / active day
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">OPG Revenue</p>
                <h3 className="text-3xl font-bold text-emerald-600 mt-1">₹{totalCost.toLocaleString('en-IN')}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 rounded-xl">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">Total collected for OPGs</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">All Investigations</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-1">{investigations.length}</h3>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">OPG, IOPAR, CBCT & other tests</p>
          </div>
        </div>

        {/* Date-wise OPG Counting Breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="text-blue-600 h-5 w-5" />
              Date-Wise OPG Count Breakdown
            </h2>
            <span className="text-xs text-gray-500 font-medium">
              Period: {startDate} to {endDate}
            </span>
          </div>

          {dateWiseOpgCounts.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500 bg-gray-50 rounded-xl">
              No OPGs performed during this date period.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {dateWiseOpgCounts.map((item) => (
                <div
                  key={item.date}
                  className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3 text-center"
                >
                  <div className="text-xs font-semibold text-gray-600">{item.date}</div>
                  <div className="text-2xl font-extrabold text-blue-700 mt-1">{item.count}</div>
                  <div className="text-[10px] text-blue-600 font-medium uppercase mt-0.5">OPGs Recorded</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Patient-wise Records Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTypeFilter('OPG')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  typeFilter === 'OPG' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                OPG Only ({totalOpgs})
              </button>
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${
                  typeFilter === 'ALL' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                All Tests ({investigations.length})
              </button>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search patient, phone, indication..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : investigations.length === 0 ? (
            <div className="py-16 text-center text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-200">
              No investigation records found for this period.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-gray-50 border-y border-gray-200 text-gray-600 uppercase font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Patient Details</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Indication / Notes</th>
                    <th className="py-2.5 px-3">Format</th>
                    <th className="py-2.5 px-3">Doctor</th>
                    <th className="py-2.5 px-3 text-right">Fee</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {investigations.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50/80 transition">
                      <td className="py-3 px-3 font-semibold text-gray-800 whitespace-nowrap">
                        {rec.investigation_date}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-900">{rec.patient_name}</div>
                        <div className="text-gray-500 text-[11px]">
                          📱 {rec.phone_number} {rec.reference_number && `• Ref: ${rec.reference_number}`}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          rec.investigation_type === 'OPG' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                        }`}>
                          {rec.investigation_type}
                        </span>
                      </td>
                      <td className="py-3 px-3 max-w-xs">
                        <div className="text-gray-800 font-medium truncate">{rec.indication || 'General'}</div>
                        {rec.findings && (
                          <div className="text-gray-500 text-[11px] truncate italic">{rec.findings}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-gray-600">{rec.film_type || 'Digital'}</td>
                      <td className="py-3 px-3 text-gray-700">{rec.doctor_name || '-'}</td>
                      <td className="py-3 px-3 text-right font-bold text-gray-900">
                        ₹{rec.cost || 0}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => handleEdit(rec)}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit size={15} />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => rec.id && handleDelete(rec.id)}
                              className="p-1 text-red-600 hover:text-red-800"
                              title="Delete"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Record Investigation Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-scale-up border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Activity className="text-blue-600 w-5 h-5" />
                {isEditMode ? 'Edit Investigation Record' : `New ${formData.investigation_type} Record`}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Patient Autocomplete */}
              <div className="relative">
                <label className="block font-semibold text-gray-700 mb-1">Patient Name *</label>
                <input
                  type="text"
                  value={patientSearchQuery}
                  onChange={(e) => handlePatientSearchChange(e.target.value)}
                  required
                  placeholder="Type to search or enter patient name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
                {showPatientSuggestions && filteredPatientSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border border-gray-200 rounded-lg mt-1 shadow-lg max-h-48 overflow-y-auto">
                    {filteredPatientSuggestions.map((p) => (
                      <div
                        key={p.id || p.phone_number}
                        onClick={() => handlePatientSelect(p)}
                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer border-b last:border-none"
                      >
                        <div className="font-semibold text-gray-900">{p.name}</div>
                        <div className="text-[11px] text-gray-500">📱 {p.phone_number} • Ref: {p.reference_number || 'N/A'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    required
                    placeholder="10-digit mobile"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Reference No.</label>
                  <input
                    type="text"
                    value={formData.reference_number || ''}
                    onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                    placeholder="e.g. SDC0012"
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Investigation Type *</label>
                  <select
                    value={formData.investigation_type}
                    onChange={(e) => setFormData({ ...formData, investigation_type: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="OPG">OPG (Orthopantomogram)</option>
                    <option value="IOPAR">IOPAR (X-Ray)</option>
                    <option value="CBCT">CBCT</option>
                    <option value="Lateral Ceph">Lateral Ceph</option>
                    <option value="Blood Test">Blood Test</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={formData.investigation_date}
                    onChange={(e) => setFormData({ ...formData, investigation_date: e.target.value })}
                    required
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Film / Delivery Type</label>
                  <select
                    value={formData.film_type || 'Digital'}
                    onChange={(e) => setFormData({ ...formData, film_type: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="Digital">Digital Softcopy</option>
                    <option value="Printed Film">Printed Film</option>
                    <option value="Both">Both Film & Digital</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Doctor</label>
                  <input
                    type="text"
                    value={formData.doctor_name || ''}
                    onChange={(e) => setFormData({ ...formData, doctor_name: e.target.value })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Clinical Indication / Reason</label>
                <input
                  type="text"
                  value={formData.indication || ''}
                  onChange={(e) => setFormData({ ...formData, indication: e.target.value })}
                  placeholder="e.g. Full mouth scan, 3rd Molar Impaction, Ortho Planning"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">Findings / Diagnostic Notes</label>
                <textarea
                  value={formData.findings || ''}
                  onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                  rows={2}
                  placeholder="Radiographic findings or notes"
                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Charge / Cost (₹)</label>
                  <input
                    type="number"
                    value={formData.cost || 0}
                    onChange={(e) => setFormData({ ...formData, cost: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">Payment Status</label>
                  <select
                    value={formData.payment_status || 'PAID'}
                    onChange={(e) => setFormData({ ...formData, payment_status: e.target.value as any })}
                    className="w-full px-3 py-1.5 border border-gray-300 rounded-lg bg-white"
                  >
                    <option value="PAID">PAID</option>
                    <option value="PENDING">PENDING</option>
                    <option value="INCLUDED_IN_TREATMENT">INCLUDED IN TREATMENT</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-1/2 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow"
                >
                  {isEditMode ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
