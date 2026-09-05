"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { investigationService } from '@/services/investigations';
import {
  Activity,
  Calendar,
  Search,
  BarChart3,
  RefreshCw,
  TrendingUp,
  FileText,
  Sparkles,
  ExternalLink,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';

export default function InvestigationsPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'OPG' | 'IOPAR'>('ALL');

  // Date Range Presets
  const todayStr = new Date().toISOString().split('T')[0];
  const firstOfMonthStr = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [dateRangePreset, setDateRangePreset] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL_TIME' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState<string>(firstOfMonthStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Auto Report State
  const [reportData, setReportData] = useState<{
    totalOpg: number;
    totalIopar: number;
    totalCount: number;
    dateWiseBreakdown: Array<{
      date: string;
      opgCount: number;
      ioparCount: number;
      totalCount: number;
    }>;
    records: Array<{
      id: string;
      prescription_id: string;
      patient_name: string;
      phone_number: string;
      reference_number?: string;
      prescription_date: string;
      doctor_name?: string;
      investigation_text: string;
      has_opg: boolean;
      has_iopar: boolean;
      investigation_types: string[];
    }>;
  }>({
    totalOpg: 0,
    totalIopar: 0,
    totalCount: 0,
    dateWiseBreakdown: [],
    records: [],
  });

  const fetchInvestigationReport = useCallback(async () => {
    setLoading(true);
    try {
      const data = await investigationService.getAutomaticReport({
        startDate: dateRangePreset === 'ALL_TIME' ? undefined : (startDate || undefined),
        endDate: dateRangePreset === 'ALL_TIME' ? undefined : (endDate || undefined),
        investigationType: typeFilter === 'ALL' ? undefined : typeFilter,
        search: searchTerm || undefined,
      });
      setReportData(data);
    } catch (err) {
      console.error('Failed to load automatic investigation report:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, dateRangePreset, typeFilter, searchTerm]);

  useEffect(() => {
    fetchInvestigationReport();
  }, [fetchInvestigationReport]);

  const applyDatePreset = (preset: 'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'ALL_TIME' | 'CUSTOM') => {
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
    } else if (preset === 'ALL_TIME') {
      setStartDate('');
      setEndDate('');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Activity size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">OPG & IOPAR Investigation Register</h1>
              <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-xs border border-emerald-200 flex items-center gap-1">
                <Sparkles size={12} /> Auto-Extracted
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              Automatically maintains case-insensitive OPG and IOPAR counts directly from prescriptions in real-time.
            </p>
          </div>
        </div>

        <button
          onClick={() => fetchInvestigationReport()}
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-blue-600 bg-gray-100 hover:bg-blue-50 px-3.5 py-2 rounded-xl font-medium transition-all self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh Counts</span>
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total OPG */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'OPG' ? 'ALL' : 'OPG')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            typeFilter === 'OPG'
              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-600'
              : 'bg-white border-gray-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wider ${typeFilter === 'OPG' ? 'text-blue-100' : 'text-gray-500'}`}>
              OPG Count
            </p>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${typeFilter === 'OPG' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
              Full Mouth
            </span>
          </div>
          <p className={`text-3xl font-black mt-3 ${typeFilter === 'OPG' ? 'text-white' : 'text-gray-900'}`}>
            {reportData.totalOpg}
          </p>
          <p className={`text-xs mt-1 ${typeFilter === 'OPG' ? 'text-blue-100' : 'text-gray-400'}`}>
            Auto-detected from prescriptions
          </p>
        </div>

        {/* Total IOPAR */}
        <div
          onClick={() => setTypeFilter(typeFilter === 'IOPAR' ? 'ALL' : 'IOPAR')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            typeFilter === 'IOPAR'
              ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-600'
              : 'bg-white border-gray-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wider ${typeFilter === 'IOPAR' ? 'text-indigo-100' : 'text-gray-500'}`}>
              IOPAR Count
            </p>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${typeFilter === 'IOPAR' ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-700'}`}>
              Periapical
            </span>
          </div>
          <p className={`text-3xl font-black mt-3 ${typeFilter === 'IOPAR' ? 'text-white' : 'text-gray-900'}`}>
            {reportData.totalIopar}
          </p>
          <p className={`text-xs mt-1 ${typeFilter === 'IOPAR' ? 'text-indigo-100' : 'text-gray-400'}`}>
            Auto-detected from prescriptions
          </p>
        </div>

        {/* Total Combined */}
        <div
          onClick={() => setTypeFilter('ALL')}
          className={`p-5 rounded-2xl border cursor-pointer transition-all shadow-sm ${
            typeFilter === 'ALL'
              ? 'bg-gradient-to-br from-gray-900 to-slate-800 text-white border-gray-900'
              : 'bg-white border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <p className={`text-xs font-semibold uppercase tracking-wider ${typeFilter === 'ALL' ? 'text-gray-300' : 'text-gray-500'}`}>
              Total Investigations
            </p>
            <span className={`text-xs px-2 py-0.5 rounded font-bold ${typeFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'}`}>
              OPG + IOPAR
            </span>
          </div>
          <p className={`text-3xl font-black mt-3 ${typeFilter === 'ALL' ? 'text-white' : 'text-gray-900'}`}>
            {reportData.totalCount}
          </p>
          <p className={`text-xs mt-1 ${typeFilter === 'ALL' ? 'text-gray-300' : 'text-gray-400'}`}>
            Across {reportData.records.length} prescriptions
          </p>
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 space-y-4">
        {/* Date Presets Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar size={14} /> Period:
            </span>
            {[
              { id: 'TODAY', label: 'Today' },
              { id: 'YESTERDAY', label: 'Yesterday' },
              { id: 'LAST_7_DAYS', label: 'Last 7 Days' },
              { id: 'THIS_MONTH', label: 'This Month' },
              { id: 'ALL_TIME', label: 'All Time' },
            ].map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyDatePreset(preset.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  dateRangePreset === preset.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                typeFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setTypeFilter('OPG')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                typeFilter === 'OPG' ? 'bg-white text-blue-700 shadow-xs' : 'text-gray-600'
              }`}
            >
              OPG Only
            </button>
            <button
              onClick={() => setTypeFilter('IOPAR')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition ${
                typeFilter === 'IOPAR' ? 'bg-white text-indigo-700 shadow-xs' : 'text-gray-600'
              }`}
            >
              IOPAR Only
            </button>
          </div>
        </div>

        {/* Custom Date Range & Search Input */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="font-semibold">Custom Range:</span>
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
              placeholder="Search patient, doctor, investigation text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* Date-wise Breakdown Accordion / Summary */}
      {reportData.dateWiseBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-600" />
            <span>Date-wise Investigation Frequency</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
            {reportData.dateWiseBreakdown.slice(0, 12).map((item) => (
              <div key={item.date} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-center">
                <p className="text-[11px] font-semibold text-gray-500">{item.date}</p>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                    OPG: {item.opgCount}
                  </span>
                  <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    IOPAR: {item.ioparCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Investigations List Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-900">
            Detected Investigation Records ({reportData.records.length})
          </h3>
          <span className="text-xs text-gray-400">
            Auto-synchronized with Prescription Management
          </span>
        </div>

        {loading ? (
          <div className="p-16 text-center text-gray-400">
            <RefreshCw size={32} className="animate-spin mx-auto mb-2 text-blue-600" />
            <p className="font-medium">Scanning prescriptions for OPG & IOPAR investigations...</p>
          </div>
        ) : reportData.records.length === 0 ? (
          <div className="p-16 text-center text-gray-400">
            <Activity size={40} className="mx-auto mb-2 opacity-50" />
            <p className="font-semibold text-gray-700">No OPG or IOPAR investigations found for this period.</p>
            <p className="text-xs mt-1 text-gray-400">
              Prescriptions with "OPG" or "IOPAR" in their investigation field appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3.5">Date</th>
                  <th className="px-5 py-3.5">Patient Details</th>
                  <th className="px-4 py-3.5">Ref No.</th>
                  <th className="px-4 py-3.5">Doctor</th>
                  <th className="px-4 py-3.5">Prescription Investigation Text</th>
                  <th className="px-4 py-3.5 text-center">Detected Type</th>
                  <th className="px-5 py-3.5 text-right">Prescription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reportData.records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">
                      {rec.prescription_date}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{rec.patient_name}</div>
                      <div className="text-xs text-gray-400">📱 {rec.phone_number || "No phone"}</div>
                    </td>
                    <td className="px-4 py-4 text-xs font-mono text-gray-600">
                      {rec.reference_number || "-"}
                    </td>
                    <td className="px-4 py-4 font-medium text-gray-800">
                      {rec.doctor_name || "Dr. Kautilya Swaroop"}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-semibold text-gray-900 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100 text-xs">
                        {rec.investigation_text}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 flex-wrap">
                        {rec.has_opg && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                            OPG
                          </span>
                        )}
                        {rec.has_iopar && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                            IOPAR
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/prescription?patientId=${rec.prescription_id}&reference=${rec.reference_number || ''}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition"
                      >
                        <span>View Rx</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
