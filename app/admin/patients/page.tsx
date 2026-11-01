'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { getAllPrescriptions, Prescription as PrescriptionType, deletePrescription } from '@/services/prescription';
import { deletePatient, getPatients } from '@/services/patients';
import { getAll as getAllBills, billService } from '@/services/bills';
import { Patient } from '@/types/patient';
import Link from 'next/link';
import { Alert } from "@/components/ui/alert";
import PrescriptionHistory from "@/components/PrescriptionHistory";
import { useIsAdmin } from '@/hooks/use-is-admin';
import { Calendar as CalendarIcon, X, Search, RefreshCw, UserPlus, Filter, IndianRupee, Printer, History, CheckCircle2 } from 'lucide-react';
import { paymentTransactionService, PaymentTransaction } from '@/services/payment-transactions';

// Group prescriptions by patient name to create a patient list
interface Bill {
  id: string;
  patient_id?: string;
  prescription_id?: string;
  bill_number?: string;
  reference_number?: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  items?: any[];
  created_at: string;
}

interface PrescriptionWithBill extends PrescriptionType {
  bills?: Bill[];
}

interface PatientWithPrescriptions extends Patient {
  latestVisit: string;
  totalVisits: number;
  prescriptions: PrescriptionWithBill[];
  reference_number?: string;
}

const ViewPatients = () => {
  const [patients, setPatients] = useState<PatientWithPrescriptions[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientWithPrescriptions[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [dateFilterMode, setDateFilterMode] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');
  const [selectedPatient, setSelectedPatient] = useState<PatientWithPrescriptions | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [alertMessage, setAlertMessage] = useState<{ type: 'error' | 'success', message: string } | null>(null);
  const { isAdmin } = useIsAdmin();
  const patientsPerPage = 10;

  // Installment payment state
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState<boolean>(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<Bill | null>(null);
  const [installmentAmount, setInstallmentAmount] = useState<number | ''>('');
  const [installmentMethod, setInstallmentMethod] = useState<string>('Cash');
  const [installmentDate, setInstallmentDate] = useState<string>('');
  const [installmentNotes, setInstallmentNotes] = useState<string>('');
  const [submittingInstallment, setSubmittingInstallment] = useState<boolean>(false);
  const [patientTransactions, setPatientTransactions] = useState<PaymentTransaction[]>([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState<boolean>(false);
  const [selectedInstallmentItemIds, setSelectedInstallmentItemIds] = useState<Set<string | number>>(new Set());
  const [showPaidInstallmentItems, setShowPaidInstallmentItems] = useState<boolean>(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    try {
      // Get prescriptions with bills included
      console.log('Fetching prescriptions...');
      const prescriptions = await getAllPrescriptions();
      if (!prescriptions) {
        throw new Error('No prescriptions data received');
      }
      console.log(`Fetched ${prescriptions.length} prescriptions`);

      // Fetch all bills and create a lookup map by prescription_id
      let billsByPrescriptionId = new Map<string, Bill[]>();
      try {
        const allBills = await getAllBills();
        allBills.forEach((bill: any) => {
          const billObj: Bill = {
            id: bill.id || bill._id,
            patient_id: bill.patient_id || '',
            prescription_id: bill.prescription_id || '',
            bill_number: bill.bill_number || '',
            reference_number: bill.reference_number || '',
            total_amount: Number(bill.total_amount) || 0,
            paid_amount: Number(bill.paid_amount) || 0,
            balance_amount: typeof bill.balance_amount === 'number'
              ? bill.balance_amount
              : Math.max(0, (Number(bill.total_amount) || 0) - (Number(bill.paid_amount) || 0)),
            payment_status: bill.payment_status || 'PENDING',
            items: bill.items || [],
            created_at: bill.created_at || (bill._creationTime ? new Date(bill._creationTime).toISOString() : '') || '',
          };
          if (bill.prescription_id) {
            const existing = billsByPrescriptionId.get(bill.prescription_id) || [];
            existing.push(billObj);
            billsByPrescriptionId.set(bill.prescription_id, existing);
          }
        });
        console.log(`Fetched ${allBills.length} bills`);
      } catch (billError) {
        console.error('Error fetching bills:', billError);
        // Continue without bills rather than failing
      }

      // Attach bills to prescriptions
      const prescriptionsWithBills: PrescriptionWithBill[] = prescriptions.map(p => ({
        ...p,
        bills: p.id ? billsByPrescriptionId.get(p.id) || [] : [],
      }));

      const patientMap = new Map<string, PatientWithPrescriptions>();

      // First, get all patients from the database
      console.log('Fetching patients...');
      const dbPatients = await getPatients();
      if (!dbPatients) {
        throw new Error('No patients data received');
      }
      console.log(`Fetched ${dbPatients.length} patients`);

      const dbPatientMap = new Map(dbPatients.map(p => [p.phone_number, p]));

      // Group prescriptions by phone_number, falling back to name if phone is not available
      prescriptionsWithBills.forEach(prescription => {
        const key = prescription.phone_number || `name:${prescription.patient_name}`;

        if (!patientMap.has(key)) {
          // Try to find existing patient in database
          const existingPatient = prescription.phone_number ? dbPatientMap.get(prescription.phone_number) : null;
          patientMap.set(key, {
            id: existingPatient?.id || 'TMP-' + Math.random().toString(36).substring(2, 7), // Use DB ID if exists, or create a temporary ID
            reference_number: existingPatient?.reference_number,
            name: prescription.patient_name,
            phone_number: prescription.phone_number || 'Unknown',
            age: parseInt(prescription.age, 10),
            sex: prescription.sex,
            latestVisit: prescription.prescription_date,
            totalVisits: 1,
            prescriptions: [prescription],
            created_at: existingPatient?.created_at,
            updated_at: existingPatient?.updated_at
          });
        } else {
          const patient = patientMap.get(key)!;
          patient.totalVisits += 1;
          patient.prescriptions.push(prescription);

          // Update latest visit date if this prescription is newer
          if (new Date(prescription.prescription_date) > new Date(patient.latestVisit)) {
            patient.latestVisit = prescription.prescription_date;
            patient.age = parseInt(prescription.age, 10);
            patient.name = prescription.patient_name;

            if (prescription.phone_number && patient.phone_number === 'Unknown') {
              patient.phone_number = prescription.phone_number;
              // Update patient ID if we find a matching patient in the database
              const existingPatient = dbPatientMap.get(prescription.phone_number); if (existingPatient) {
                patient.id = existingPatient.id;
                patient.reference_number = existingPatient.reference_number;
                patient.created_at = existingPatient.created_at;
                patient.updated_at = existingPatient.updated_at;
              }
            }
          }

          patientMap.set(key, patient);
        }
      });
      // Convert map to array and sort by reference number
      const patientList = Array.from(patientMap.values()).sort((a, b) => {
        // Put patients without reference numbers at the end
        if (!a.reference_number && !b.reference_number) return 0;
        if (!a.reference_number) return 1;
        if (!b.reference_number) return -1;

        // Sort by reference number (TS01, TS02, etc.)
        return a.reference_number.localeCompare(b.reference_number);
      });

      setPatients(patientList);
      setFilteredPatients(patientList);
    } catch (err) {
      console.error('Failed to fetch patient data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to load patient data: ${errorMessage}. Please try again.`);

      // Log detailed error information for debugging
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Date helper functions for calendar filtering
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayStr = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const isPatientOnDate = (patient: PatientWithPrescriptions, targetDate: string): boolean => {
    if (!targetDate) return false;
    // Check all prescriptions
    const hasRx = (patient.prescriptions || []).some((p) => {
      if (!p.prescription_date) return false;
      const pDate = p.prescription_date.slice(0, 10);
      if (pDate === targetDate) return true;
      try {
        const d = new Date(p.prescription_date);
        if (!isNaN(d.getTime())) {
          const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return local === targetDate;
        }
      } catch {}
      return false;
    });
    if (hasRx) return true;

    // Check latestVisit
    if (patient.latestVisit) {
      if (patient.latestVisit.slice(0, 10) === targetDate) return true;
      try {
        const d = new Date(patient.latestVisit);
        if (!isNaN(d.getTime())) {
          const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return local === targetDate;
        }
      } catch {}
    }

    // Check created_at (for new patients registered on that date)
    if (patient.created_at) {
      try {
        const d = new Date(patient.created_at);
        if (!isNaN(d.getTime())) {
          const local = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return local === targetDate;
        }
      } catch {}
    }

    return false;
  };

  const isPatientInCurrentMonth = (patient: PatientWithPrescriptions): boolean => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const hasRx = (patient.prescriptions || []).some((p) => {
      if (!p.prescription_date) return false;
      return p.prescription_date.startsWith(currentYearMonth);
    });
    if (hasRx) return true;

    if (patient.latestVisit && patient.latestVisit.startsWith(currentYearMonth)) return true;

    if (patient.created_at) {
      try {
        const d = new Date(patient.created_at);
        if (!isNaN(d.getTime())) {
          const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return ym === currentYearMonth;
        }
      } catch {}
    }

    return false;
  };

  useEffect(() => {
    // Filter patients by both date and search term
    let result = patients;

    // 1. Date Filter
    if (dateFilterMode === 'TODAY') {
      const today = getTodayStr();
      result = result.filter(p => isPatientOnDate(p, today));
    } else if (dateFilterMode === 'YESTERDAY') {
      const yesterday = getYesterdayStr();
      result = result.filter(p => isPatientOnDate(p, yesterday));
    } else if (dateFilterMode === 'THIS_MONTH') {
      result = result.filter(p => isPatientInCurrentMonth(p));
    } else if (dateFilterMode === 'CUSTOM' && selectedDate) {
      result = result.filter(p => isPatientOnDate(p, selectedDate));
    }

    // 2. Search Term Filter
    if (searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(patient =>
        patient.name.toLowerCase().includes(searchLower) ||
        patient.phone_number.includes(searchTerm) ||
        (patient.reference_number && patient.reference_number.toLowerCase().includes(searchLower))
      );
    }

    setFilteredPatients(result);
    setCurrentPage(1); // Reset to first page on new filter
  }, [searchTerm, selectedDate, dateFilterMode, patients]);

  const handleDelete = async (patient: PatientWithPrescriptions) => {
    if (window.confirm('Are you sure you want to delete this patient and all their prescriptions? This action cannot be undone.')) {
      try {
        setLoading(true); // Show loading state while deleting

        // First delete all prescriptions for this patient
        const deletePromises = patient.prescriptions
          .filter(prescription => prescription.id)
          .map(prescription => deletePrescription(prescription.id!));

        if (deletePromises.length > 0) {
          await Promise.all(deletePromises);
        }

        // Then delete the patient if it actually exists in the DB
        // Sometimes patients only exist in prescriptions and have a TMP- ID in the UI
        if (patient.id && !patient.id.toString().startsWith('TMP-')) {
          await deletePatient(patient.id);
        }

        // Add a small delay to ensure database operations are complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Refresh the patient list
        await fetchPatients();

        // Clear any existing error messages
        setError(null);
      } catch (err) {
        console.error('Failed to delete patient:', err);
        setError('Failed to delete patient. Please try again.');
      } finally {
        setLoading(false); // Hide loading state
      }
    }
  };

  const loadTransactionsForPatient = async (patient: PatientWithPrescriptions) => {
    const bills = (patient.prescriptions || []).flatMap(p => p.bills || []);
    const billIds = bills.map(b => b.id).filter(Boolean);
    if (billIds.length === 0) {
      setPatientTransactions([]);
      return;
    }
    try {
      const txLists = await Promise.all(billIds.map(id => paymentTransactionService.getByBillId(id)));
      const merged = txLists.flat().sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
      setPatientTransactions(merged);
    } catch (err) {
      console.error("Failed to load patient transactions:", err);
    }
  };

  const openPatientDetails = (patient: PatientWithPrescriptions) => {
    setSelectedPatient(patient);
    setIsModalOpen(true);
    setShowPaymentHistory(false);
    loadTransactionsForPatient(patient);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsInstallmentModalOpen(false);
    setSelectedBillForPayment(null);
  };

  const handleOpenInstallment = async (bill?: Bill) => {
    if (!selectedPatient) return;
    const allBills = (selectedPatient.prescriptions || []).flatMap(p => p.bills || []);
    const pendingBills = allBills.filter(b => {
      const bal = typeof b.balance_amount === 'number' ? b.balance_amount : ((b.total_amount || 0) - (b.paid_amount || 0));
      return bal > 0;
    });

    const targetBill = bill || pendingBills[0] || allBills[0];
    if (!targetBill) {
      setAlertMessage({ type: 'error', message: 'No bill found for this patient to pay installment.' });
      return;
    }

    // Attempt to fetch fresh bill to get the latest item statuses and items
    let freshBill: any = targetBill;
    try {
      const dbBill = await billService.getById(targetBill.id);
      if (dbBill) freshBill = dbBill;
    } catch (e) {
      console.warn('Could not fetch latest bill for installment dialog:', e);
    }

    setSelectedBillForPayment(freshBill);
    const currentBal = typeof freshBill.balance_amount === 'number'
      ? freshBill.balance_amount
      : Math.max(0, (freshBill.total_amount || 0) - (freshBill.paid_amount || 0));

    // Identify pending items vs paid items
    const rawItems: any[] = Array.isArray(freshBill.items) ? freshBill.items : [];
    const pendingItems = rawItems.filter((it: any) => !it.is_paid);
    const activeItems = pendingItems.length > 0 ? pendingItems : rawItems;

    // Default: select all pending items
    const initialItemIds = new Set<string | number>(
      activeItems.map((it: any, idx: number) => it.id !== undefined && it.id !== null ? it.id : `item-${idx}`)
    );
    setSelectedInstallmentItemIds(initialItemIds);

    const initialSum = activeItems.reduce(
      (sum: number, it: any) => sum + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unit_price || 0))),
      0
    );
    const safeInitialAmt = Math.min(initialSum, currentBal);
    setInstallmentAmount(safeInitialAmt > 0 ? safeInitialAmt : (currentBal > 0 ? currentBal : ''));

    setInstallmentMethod('Cash');
    setInstallmentDate(getTodayStr());

    // Generate descriptive notes with treatment names, dates, and amounts
    const billDateStr = freshBill.created_at ? formatDate(freshBill.created_at) : '';
    const descList = activeItems.map((it: any) => {
      const dt = it.date ? formatDate(it.date) : billDateStr;
      return dt ? `${it.description} (${dt})` : it.description;
    });
    setInstallmentNotes(descList.length > 0 ? `Payment for: ${descList.join(', ')}` : 'Installment payment');

    setIsInstallmentModalOpen(true);
  };

  const toggleInstallmentItem = (itemId: string | number) => {
    if (!selectedBillForPayment) return;
    const items: any[] = Array.isArray(selectedBillForPayment.items) ? selectedBillForPayment.items : [];
    const currentBal = typeof selectedBillForPayment.balance_amount === 'number'
      ? selectedBillForPayment.balance_amount
      : Math.max(0, (selectedBillForPayment.total_amount || 0) - (selectedBillForPayment.paid_amount || 0));

    const next = new Set(selectedInstallmentItemIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedInstallmentItemIds(next);

    const billDateStr = selectedBillForPayment.created_at ? formatDate(selectedBillForPayment.created_at) : '';
    const selectedItems = items.filter((it: any, idx: number) => {
      const id = it.id !== undefined && it.id !== null ? it.id : `item-${idx}`;
      return next.has(id);
    });

    const sum = selectedItems.reduce(
      (s, it) => s + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unit_price || 0))),
      0
    );
    const safeAmt = Math.min(sum, currentBal);
    setInstallmentAmount(safeAmt > 0 ? safeAmt : '');

    const desc = selectedItems.map((it: any) => {
      const dt = it.date ? formatDate(it.date) : billDateStr;
      return dt
        ? `${it.description} (${dt}) - ₹${Number(it.total || it.unit_price || 0).toLocaleString('en-IN')}`
        : `${it.description} - ₹${Number(it.total || it.unit_price || 0).toLocaleString('en-IN')}`;
    });
    setInstallmentNotes(desc.length > 0 ? `Payment for: ${desc.join(', ')}` : '');
  };

  const toggleSelectAllPendingInstallmentItems = (selectAll: boolean) => {
    if (!selectedBillForPayment) return;
    const items: any[] = Array.isArray(selectedBillForPayment.items) ? selectedBillForPayment.items : [];
    const currentBal = typeof selectedBillForPayment.balance_amount === 'number'
      ? selectedBillForPayment.balance_amount
      : Math.max(0, (selectedBillForPayment.total_amount || 0) - (selectedBillForPayment.paid_amount || 0));

    if (selectAll) {
      const pendingItems = items.filter((it: any) => !it.is_paid);
      const activeItems = pendingItems.length > 0 ? pendingItems : items;
      const allIds = new Set<string | number>(
        activeItems.map((it: any, idx: number) => it.id !== undefined && it.id !== null ? it.id : `item-${idx}`)
      );
      setSelectedInstallmentItemIds(allIds);

      const sum = activeItems.reduce(
        (s, it) => s + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unit_price || 0))),
        0
      );
      const safeAmt = Math.min(sum, currentBal);
      setInstallmentAmount(safeAmt > 0 ? safeAmt : currentBal);

      const billDateStr = selectedBillForPayment.created_at ? formatDate(selectedBillForPayment.created_at) : '';
      const desc = activeItems.map((it: any) => {
        const dt = it.date ? formatDate(it.date) : billDateStr;
        return dt ? `${it.description} (${dt})` : it.description;
      });
      setInstallmentNotes(desc.length > 0 ? `Payment for: ${desc.join(', ')}` : 'Installment payment');
    } else {
      setSelectedInstallmentItemIds(new Set());
      setInstallmentAmount('');
      setInstallmentNotes('');
    }
  };

  const handleRecordInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment || !selectedPatient) return;

    const amt = Number(installmentAmount);
    if (!amt || amt <= 0) {
      setAlertMessage({ type: 'error', message: 'Please enter a valid payment amount greater than 0.' });
      return;
    }

    const currentBal = typeof selectedBillForPayment.balance_amount === 'number'
      ? selectedBillForPayment.balance_amount
      : Math.max(0, (selectedBillForPayment.total_amount || 0) - (selectedBillForPayment.paid_amount || 0));

    if (amt > currentBal) {
      setAlertMessage({ type: 'error', message: `Installment amount cannot exceed the pending balance (₹${currentBal.toFixed(2)}).` });
      return;
    }

    try {
      setSubmittingInstallment(true);
      await paymentTransactionService.create({
        bill_id: selectedBillForPayment.id,
        patient_id: selectedBillForPayment.patient_id || selectedPatient.id || '',
        amount: amt,
        payment_method: installmentMethod,
        payment_date: installmentDate || getTodayStr(),
        notes: installmentNotes.trim() || undefined,
      });

      // Update bill items in database to mark selected items as is_paid
      if (Array.isArray(selectedBillForPayment.items) && selectedBillForPayment.items.length > 0) {
        try {
          const updatedItems = selectedBillForPayment.items.map((it: any, idx: number) => {
            const id = it.id !== undefined && it.id !== null ? it.id : `item-${idx}`;
            return {
              ...it,
              is_paid: selectedInstallmentItemIds.has(id) || it.is_paid,
            };
          });
          await billService.update(selectedBillForPayment.id, {
            items: updatedItems,
          });
        } catch (itemErr) {
          console.warn("Could not update item paid status on bill:", itemErr);
        }
      }

      // Update selectedPatient locally
      const updatedPrescriptions = selectedPatient.prescriptions.map(p => ({
        ...p,
        bills: (p.bills || []).map(b => {
          if (b.id === selectedBillForPayment.id) {
            const newPaid = (b.paid_amount || 0) + amt;
            const newBal = Math.max(0, (b.total_amount || 0) - newPaid);
            const updatedItems = (b.items || []).map((it: any, idx: number) => {
              const id = it.id !== undefined && it.id !== null ? it.id : `item-${idx}`;
              return {
                ...it,
                is_paid: selectedInstallmentItemIds.has(id) || it.is_paid,
              };
            });
            return {
              ...b,
              paid_amount: newPaid,
              balance_amount: newBal,
              payment_status: (newBal <= 0 ? 'PAID' : 'PARTIAL') as 'PAID' | 'PARTIAL',
              items: updatedItems,
            };
          }
          return b;
        }),
      }));

      const updatedPatient: PatientWithPrescriptions = {
        ...selectedPatient,
        prescriptions: updatedPrescriptions,
      };

      setSelectedPatient(updatedPatient);
      setIsInstallmentModalOpen(false);
      setAlertMessage({ type: 'success', message: `Payment of ₹${amt.toFixed(2)} recorded successfully!` });

      // Refresh transactions and patients data
      loadTransactionsForPatient(updatedPatient);
      fetchPatients();
    } catch (err: any) {
      console.error('Error recording installment:', err);
      setAlertMessage({ type: 'error', message: `Failed to record payment: ${err.message || 'Error'}` });
    } finally {
      setSubmittingInstallment(false);
    }
  };

  // Format date to readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Pagination
  const indexOfLastPatient = currentPage * patientsPerPage;
  const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
  const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
  const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="relative">
      {alertMessage && (
        <div className="fixed top-4 right-4 z-50">
          <Alert className={alertMessage.type === 'error' ? 'bg-red-100 border-red-400 text-red-700' : 'bg-green-100 border-green-400 text-green-700'}>
            {alertMessage.message}
          </Alert>
        </div>
      )}

      <div className="w-full max-w-7xl mx-auto mt-4 sm:mt-8 p-4">
        <h2 className="text-3xl font-bold mb-6 text-center text-blue-700 border-b pb-4">Patient Records</h2>

        {/* Search, Calendar Date Filter & Actions Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 space-y-4">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search patient name, phone, ref no..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-9 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Search size={18} />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Calendar / Date Picker & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Calendar Date Picker */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-lg px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                <CalendarIcon size={16} className="text-blue-600 shrink-0" />
                <span className="text-xs font-semibold text-gray-700">Filter Date:</span>
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
                    title="Clear date"
                    className="text-gray-400 hover:text-gray-600 ml-0.5"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <Link href="/admin/prescription">
                  <button className="px-3.5 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs sm:text-sm font-medium transition shadow-sm flex items-center gap-1.5">
                    <UserPlus size={16} />
                    <span>New Patient</span>
                  </button>
                </Link>

                <button
                  onClick={() => fetchPatients()}
                  className="px-3.5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-medium transition shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={16} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Date Filter Quick Pills */}
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
              All Time ({patients.length})
            </button>
            <button
              onClick={() => {
                const t = getTodayStr();
                setDateFilterMode('TODAY');
                setSelectedDate(t);
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
                const y = getYesterdayStr();
                setDateFilterMode('YESTERDAY');
                setSelectedDate(y);
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
                  Showing <b>{filteredPatients.length}</b> patient{filteredPatients.length !== 1 ? 's' : ''}
                  {dateFilterMode === 'TODAY' && ' for Today'}
                  {dateFilterMode === 'YESTERDAY' && ' for Yesterday'}
                  {dateFilterMode === 'THIS_MONTH' && ' for This Month'}
                  {dateFilterMode === 'CUSTOM' && selectedDate && ` on ${formatDate(selectedDate)}`}
                </span>
                <button
                  onClick={() => {
                    setDateFilterMode('ALL');
                    setSelectedDate('');
                  }}
                  className="hover:text-blue-900"
                  title="Clear filter"
                >
                  <X size={13} />
                </button>
              </span>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-blue-50 p-5 rounded-xl border border-blue-100 shadow-sm">
            <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-1">Total Patients</h4>
            <p className="text-2xl md:text-3xl font-bold text-blue-700">{patients.length}</p>
          </div>

          <div className="bg-purple-50 p-5 rounded-xl border border-purple-100 shadow-sm">
            <h4 className="text-xs font-semibold text-purple-800 uppercase tracking-wider mb-1">Total Consultations</h4>
            <p className="text-2xl md:text-3xl font-bold text-purple-700">
              {patients.reduce((sum, patient) => sum + patient.totalVisits, 0)}
            </p>
          </div>

          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100 shadow-sm">
            <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-1">Patients Today</h4>
            <p className="text-2xl md:text-3xl font-bold text-emerald-700">
              {patients.filter(p => isPatientOnDate(p, getTodayStr())).length}
            </p>
          </div>

          <div className="bg-amber-50 p-5 rounded-xl border border-amber-100 shadow-sm">
            <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">
              {dateFilterMode !== 'ALL' ? 'Filtered Patients' : 'Patients This Month'}
            </h4>
            <p className="text-2xl md:text-3xl font-bold text-amber-700">
              {dateFilterMode !== 'ALL' ? filteredPatients.length : patients.filter(p => isPatientInCurrentMonth(p)).length}
            </p>
          </div>
        </div>

        {/* Patients Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-10 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading patient data...</p>
            </div>
          ) : error ? (
            <div className="p-10 text-center text-red-600">
              <p>{error}</p>
              <button
                onClick={() => fetchPatients()}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center text-gray-600">
              <div className="inline-flex p-3 bg-blue-50 text-blue-600 rounded-full mb-3">
                <CalendarIcon size={24} />
              </div>
              <p className="text-base font-semibold text-gray-800">No patients found</p>
              <p className="text-xs text-gray-500 mt-1">
                {searchTerm ? `No matches for search "${searchTerm}".` : ''}
                {dateFilterMode !== 'ALL' ? ` No patient visits recorded for the selected date.` : ''}
              </p>
              {(searchTerm || dateFilterMode !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDateFilterMode('ALL');
                    setSelectedDate('');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reference No.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sex</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Visit</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Visits</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentPatients.map((patient) => (
                    <tr key={patient.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {patient.reference_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{patient.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{patient.phone_number}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{patient.age}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{patient.sex}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{formatDate(patient.latestVisit)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{patient.totalVisits}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openPatientDetails(patient)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition"
                          >
                            View Details
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(patient)}
                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition"
                            >
                              Delete
                            </button>
                          )}
                          <Link href={`/admin/prescription?patientName=${encodeURIComponent(patient.name)}&phone=${encodeURIComponent(patient.phone_number)}&age=${patient.age}&sex=${patient.sex}&medicalHistory=${encodeURIComponent(patient.prescriptions[0]?.medical_history || '')}`}>
                            <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition">
                              New Prescription
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && filteredPatients.length > 0 && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstPatient + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastPatient, filteredPatients.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredPatients.length}</span> patients
                </div>

                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  <button
                    onClick={() => paginate(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${currentPage === 1 ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {/* Page Numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
                    const pageNum = currentPage <= 3
                      ? idx + 1
                      : currentPage >= totalPages - 2
                        ? totalPages - 4 + idx
                        : currentPage - 2 + idx;

                    if (pageNum > 0 && pageNum <= totalPages) {
                      return (
                        <button
                          key={pageNum}
                          onClick={() => paginate(pageNum)}
                          className={`relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium ${currentPage === pageNum
                            ? 'z-10 bg-blue-50 border-blue-600 text-blue-600'
                            : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                          {pageNum}
                        </button>
                      );
                    }
                    return null;
                  })}

                  <button
                    onClick={() => paginate(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${currentPage === totalPages ? 'text-gray-300' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                  >
                    <span className="sr-only">Next</span>
                    <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          )}
        </div>

        {/* Patient Details Modal */}
        {isModalOpen && selectedPatient && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={closeModal}></div>
              </div>

              <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

              <div
                className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-headline"
              >
                {/* Modal Header */}
                <div className="bg-blue-600 px-6 py-4 flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white" id="modal-headline">
                    Patient Details
                  </h3>
                  <button
                    onClick={closeModal}
                    className="text-white hover:text-gray-300 focus:outline-none"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Modal Body */}
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-blue-800 mb-3">Patient Information</h4>
                        <div className="space-y-2">
                          <p><span className="font-medium">Name:</span> {selectedPatient.name}</p>
                          <p><span className="font-medium">Phone:</span> {selectedPatient.phone_number}</p>
                          <p><span className="font-medium">Age:</span> {selectedPatient.age}</p>
                          <p><span className="font-medium">Sex:</span> {selectedPatient.sex}</p>
                          <p><span className="font-medium">Latest Visit:</span> {formatDate(selectedPatient.latestVisit)}</p>
                          <p><span className="font-medium">Total Visits:</span> {selectedPatient.totalVisits}</p>
                        </div>
                      </div>                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="text-lg font-semibold text-purple-800 mb-3">Medical Summary</h4>
                        <div className="space-y-2">
                          <p><span className="font-medium">Last Diagnoses:</span> {selectedPatient.prescriptions[0]?.diagnosis || 'N/A'}</p>
                          <p><span className="font-medium">Medical History:</span> {selectedPatient.prescriptions[0]?.medical_history || 'N/A'}</p>
                          <p><span className="font-medium">Last Follow-up Date:</span> {selectedPatient.prescriptions[0]?.prescription_date ? formatDate(selectedPatient.prescriptions[0].prescription_date) : 'N/A'}</p>

                          {/* Payment Summary Section */}
                          {(() => {
                            const allPatientBills = selectedPatient.prescriptions.flatMap(p => p.bills || []);
                            const allIds = allPatientBills.map((b: any) => b.id || b._id).filter(Boolean) as string[];
                            const totalPaid = allPatientBills.reduce((sum, b) => sum + (Number(b.paid_amount) || 0), 0);
                            const totalPending = allPatientBills.reduce((sum, b) => {
                              const bal = typeof b.balance_amount === 'number' ? b.balance_amount : ((b.total_amount || 0) - (b.paid_amount || 0));
                              return sum + Math.max(0, bal);
                            }, 0);
                            const hasPending = totalPending > 0;

                            return (
                              <div className="mt-6 p-4 bg-white rounded-lg border border-purple-200 space-y-3">
                                <div className="flex justify-between items-center">
                                  <h5 className="text-md font-semibold text-purple-800">Payment Summary</h5>
                                  {allPatientBills.length > 0 && (
                                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                                      hasPending ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                                    }`}>
                                      {hasPending ? 'Pending Balance' : 'Fully Paid'}
                                    </span>
                                  )}
                                </div>

                                <div className="space-y-2">
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-600">Total Paid Amount:</span>
                                    <span className="text-green-600 font-bold">₹{totalPaid.toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-600">Total Pending Amount:</span>
                                    <span className={`font-bold ${hasPending ? 'text-red-600 text-base' : 'text-gray-500'}`}>
                                      ₹{totalPending.toFixed(2)}
                                    </span>
                                  </div>
                                </div>

                                {/* Action Buttons: Pay Installment + Print All Bills */}
                                <div className="pt-2 border-t border-purple-100 flex flex-col sm:flex-row gap-2">
                                  {hasPending && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenInstallment()}
                                      className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg px-3.5 py-2.5 bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
                                    >
                                      <IndianRupee size={16} />
                                      <span>Pay Installment</span>
                                    </button>
                                  )}

                                  {allIds.length > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const params = new URLSearchParams({
                                          billIds: allIds.join(','),
                                          signature: 'sign.png',
                                          doctorName: 'Dr. Kautilya Swaroop',
                                        });
                                        window.open(`/print-bill/statement?${params.toString()}`, '_blank');
                                      }}
                                      className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg px-3.5 py-2.5 bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 shadow-sm transition"
                                    >
                                      <Printer size={16} />
                                      <span>Print All Bills ({allIds.length})</span>
                                    </button>
                                  )}
                                </div>

                                {/* Past Installment Transactions History Collapsible */}
                                {patientTransactions.length > 0 && (
                                  <div className="pt-2 border-t border-purple-100">
                                    <button
                                      type="button"
                                      onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                                      className="w-full flex justify-between items-center text-xs font-semibold text-purple-700 hover:text-purple-900"
                                    >
                                      <span className="flex items-center gap-1">
                                        <History size={13} />
                                        <span>Past Payments / Installments ({patientTransactions.length})</span>
                                      </span>
                                      <span className="text-[11px] text-gray-500">{showPaymentHistory ? '▲ Hide' : '▼ View'}</span>
                                    </button>

                                    {showPaymentHistory && (
                                      <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                        {patientTransactions.map((tx, idx) => (
                                          <div key={tx.id || idx} className="flex justify-between items-center text-xs bg-purple-50/70 p-2 rounded border border-purple-100">
                                            <div>
                                              <div className="font-semibold text-gray-800">₹{Number(tx.amount).toFixed(2)} • {tx.payment_method || 'Cash'}</div>
                                              <div className="text-[10px] text-gray-500">
                                                {formatDate(tx.payment_date)}
                                                {tx.notes ? ` • ${tx.notes}` : ''}
                                              </div>
                                            </div>
                                            <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                                              Received
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Prescription History */}
                  <PrescriptionHistory
                    prescriptions={selectedPatient.prescriptions}
                    isAdmin={isAdmin}
                    onDelete={async (prescriptionId) => {
                      try {
                        // Skip database deletion for temporary IDs (only existing in UI)
                        if (!prescriptionId.toString().startsWith('TMP-')) {
                          await deletePrescription(prescriptionId);
                        }
                        const updatedPrescriptions = selectedPatient.prescriptions.filter(p => p.id !== prescriptionId);
                        setSelectedPatient({
                          ...selectedPatient,
                          prescriptions: updatedPrescriptions,
                          totalVisits: selectedPatient.totalVisits - 1
                        });
                        setPatients(prevPatients =>
                          prevPatients.map(p =>
                            p.id === selectedPatient.id
                              ? {
                                ...p,
                                prescriptions: updatedPrescriptions,
                                totalVisits: p.totalVisits - 1
                              }
                              : p
                          )
                        );
                      } catch (error) {
                        console.error('Failed to delete prescription:', error);
                        setError('Failed to delete prescription. Please try again.');
                      }
                    }}
                  />

                  {/* Modal Footer */}
                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse flex-wrap gap-2">
                    <Link href={`/admin/prescription?patientName=${encodeURIComponent(selectedPatient.name)}&age=${selectedPatient.age}&sex=${selectedPatient.sex}&phone=${encodeURIComponent(selectedPatient.phone_number)}&medicalHistory=${encodeURIComponent(selectedPatient.prescriptions[0]?.medical_history || '')}`}>
                      <button
                        type="button"
                        className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
                      >
                        Create New Prescription
                      </button>
                    </Link>
                    {(() => {
                      const allBillIds = selectedPatient.prescriptions
                        .flatMap(p => (p.bills || []).map(b => b.id))
                        .filter(Boolean) as string[];
                      return allBillIds.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            const params = new URLSearchParams({
                              billIds: allBillIds.join(','),
                              signature: 'sign.png',
                              doctorName: 'Dr. Kautilya Swaroop',
                            });
                            window.open(`/print-bill/statement?${params.toString()}`, '_blank');
                          }}
                          className="mt-3 w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                        >
                          Print All Bills ({allBillIds.length})
                        </button>
                      ) : null;
                    })()}
                    <button
                      type="button"
                      onClick={closeModal}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Installment Payment Modal */}
        {isInstallmentModalOpen && selectedBillForPayment && selectedPatient && (
          <div className="fixed inset-0 z-[60] overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-5 py-4 text-white flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <IndianRupee size={20} />
                    <span>Pay Installment</span>
                  </h3>
                  <p className="text-xs text-emerald-100 mt-0.5">
                    Patient: <span className="font-semibold text-white">{selectedPatient.name}</span>
                    {selectedPatient.phone_number && <span> • {selectedPatient.phone_number}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInstallmentModalOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleRecordInstallment} className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Select Bill if multiple pending bills */}
                {(() => {
                  const pendingBills = (selectedPatient.prescriptions || [])
                    .flatMap(p => p.bills || [])
                    .filter(b => {
                      const bal = typeof b.balance_amount === 'number' ? b.balance_amount : ((b.total_amount || 0) - (b.paid_amount || 0));
                      return bal > 0;
                    });

                  if (pendingBills.length > 1) {
                    return (
                      <div>
                        <label className="text-xs font-semibold text-gray-700 block mb-1">Select Bill to Pay Towards *</label>
                        <select
                          value={selectedBillForPayment.id}
                          onChange={(e) => {
                            const found = pendingBills.find(b => b.id === e.target.value);
                            if (found) {
                              setSelectedBillForPayment(found);
                              const bal = typeof found.balance_amount === 'number'
                                ? found.balance_amount
                                : Math.max(0, (found.total_amount || 0) - (found.paid_amount || 0));
                              setInstallmentAmount(bal);
                            }
                          }}
                          className="w-full px-3 py-2 border rounded-lg text-xs sm:text-sm bg-white font-medium"
                        >
                          {pendingBills.map((b) => {
                            const bal = typeof b.balance_amount === 'number'
                              ? b.balance_amount
                              : Math.max(0, (b.total_amount || 0) - (b.paid_amount || 0));
                            return (
                              <option key={b.id} value={b.id}>
                                {b.bill_number ? `Bill #${b.bill_number}` : 'Bill'} — Due: ₹{bal.toFixed(2)} (Total: ₹{b.total_amount.toFixed(2)})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Balance Summary Box */}
                {(() => {
                  const currentBal = typeof selectedBillForPayment.balance_amount === 'number'
                    ? selectedBillForPayment.balance_amount
                    : Math.max(0, (selectedBillForPayment.total_amount || 0) - (selectedBillForPayment.paid_amount || 0));
                  const billDate = selectedBillForPayment.created_at ? formatDate(selectedBillForPayment.created_at) : '';

                  return (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex justify-between items-center text-xs sm:text-sm">
                      <div>
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800 block">Pending Balance</span>
                        <span className="text-xl font-black text-emerald-900">₹{currentBal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-emerald-700 font-medium">
                          <span>Total: ₹{Number(selectedBillForPayment.total_amount || 0).toLocaleString('en-IN')}</span>
                          <span>• Paid: ₹{Number(selectedBillForPayment.paid_amount || 0).toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {selectedBillForPayment.bill_number && (
                          <span className="text-xs bg-white text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-md font-semibold inline-block">
                            Invoice #{selectedBillForPayment.bill_number}
                          </span>
                        )}
                        {billDate && (
                          <span className="block text-[11px] text-gray-500 mt-1">
                            Date: {billDate}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Treatment Items Selection with Dates & Checkboxes */}
                {(() => {
                  const items: any[] = Array.isArray(selectedBillForPayment.items) ? selectedBillForPayment.items : [];
                  if (items.length === 0) return null;

                  const pendingItems = items.filter((it: any) => !it.is_paid);
                  const paidItems = items.filter((it: any) => it.is_paid);
                  const allPendingSelected = pendingItems.length > 0 && pendingItems.every((it: any, idx: number) => {
                    const id = it.id !== undefined && it.id !== null ? it.id : `item-${idx}`;
                    return selectedInstallmentItemIds.has(id);
                  });

                  return (
                    <div className="space-y-2.5 pt-1">
                      {/* Master "Pay All Pending" Toggle */}
                      {pendingItems.length > 0 && (
                        <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                          <label className="flex items-center gap-2.5 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={allPendingSelected}
                              onChange={(e) => toggleSelectAllPendingInstallmentItems(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <div>
                              <span className="text-xs sm:text-sm font-bold text-emerald-950 block">
                                Pay All Pending Treatments
                              </span>
                              <span className="text-[11px] text-emerald-700">
                                Clear all {pendingItems.length} pending items
                              </span>
                            </div>
                          </label>
                          <span className="text-xs sm:text-sm font-bold text-emerald-900">
                            ₹{pendingItems.reduce((s, it) => s + (Number(it.total) || (Number(it.quantity || 1) * Number(it.unit_price || 0))), 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {/* Pending Treatments Section */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-gray-700 uppercase tracking-wider block">
                          Pending Treatments ({pendingItems.length}):
                        </span>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {pendingItems.map((item: any, idx: number) => {
                            const itemId = item.id !== undefined && item.id !== null ? item.id : `item-${idx}`;
                            const isChecked = selectedInstallmentItemIds.has(itemId);
                            const desc = (item.description || '').toLowerCase();
                            const icon = item.item_type === 'consultation' || desc.includes('consultation') ? '🩺' :
                                         item.item_type === 'xray' || desc.includes('iopar') || desc.includes('x-ray') ? '🩻' :
                                         item.item_type === 'medicine' ? '💊' : '🦷';
                            const itemDateStr = item.date ? formatDate(item.date) : (selectedBillForPayment.created_at ? formatDate(selectedBillForPayment.created_at) : '');
                            const itemTotal = Number(item.total) || (Number(item.quantity || 1) * Number(item.unit_price || 0));

                            return (
                              <label
                                key={itemId}
                                className={`flex items-start justify-between p-2.5 rounded-xl border transition cursor-pointer select-none ${
                                  isChecked
                                    ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                                    : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                              >
                                <div className="flex items-start gap-2.5 min-w-0 pr-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleInstallmentItem(itemId)}
                                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                  />
                                  <div className="truncate">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-xs sm:text-sm font-semibold ${isChecked ? 'text-emerald-950 font-bold' : 'text-gray-800'}`}>
                                        {icon} {item.description}
                                      </span>
                                      <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                                        Pending
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500">
                                      {itemDateStr && (
                                        <span className="flex items-center gap-1 text-gray-700 font-medium">
                                          📅 {itemDateStr}
                                        </span>
                                      )}
                                      {item.quantity && item.quantity > 1 && (
                                        <span>• Qty: {item.quantity}</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-gray-900 shrink-0">
                                  ₹{itemTotal.toLocaleString('en-IN')}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* Already Paid Treatments Section */}
                      {paidItems.length > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => setShowPaidInstallmentItems(!showPaidInstallmentItems)}
                            className="w-full flex items-center justify-between text-xs text-gray-600 font-semibold py-1 hover:text-gray-900 transition"
                          >
                            <span className="flex items-center gap-1.5">
                              <span className="text-emerald-700">✓</span> Already Paid Treatments ({paidItems.length})
                            </span>
                            <span className="text-[11px] text-gray-500">
                              {showPaidInstallmentItems ? '▲ Hide' : '▼ Show'}
                            </span>
                          </button>
                          {showPaidInstallmentItems && (
                            <div className="mt-1.5 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {paidItems.map((item: any, idx: number) => {
                                const itemId = item.id !== undefined && item.id !== null ? item.id : `paid-${idx}`;
                                const desc = (item.description || '').toLowerCase();
                                const icon = item.item_type === 'consultation' || desc.includes('consultation') ? '🩺' :
                                             item.item_type === 'xray' || desc.includes('iopar') || desc.includes('x-ray') ? '🩻' :
                                             item.item_type === 'medicine' ? '💊' : '🦷';
                                const itemDateStr = item.date ? formatDate(item.date) : (selectedBillForPayment.created_at ? formatDate(selectedBillForPayment.created_at) : '');
                                const itemTotal = Number(item.total) || (Number(item.quantity || 1) * Number(item.unit_price || 0));

                                return (
                                  <div
                                    key={itemId}
                                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50/80 border border-gray-200 text-xs text-gray-600"
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      <span className="text-emerald-600 font-bold">✓</span>
                                      <div className="truncate">
                                        <span className="font-medium text-gray-700 truncate block">
                                          {icon} {item.description}
                                        </span>
                                        {itemDateStr && (
                                          <span className="text-[10px] text-gray-500 font-mono">📅 {itemDateStr}</span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className="font-semibold text-gray-800">₹{itemTotal.toLocaleString('en-IN')}</span>
                                      <span className="block text-[9px] font-bold text-emerald-700 uppercase">Paid ✓</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Installment Amount */}
                {(() => {
                  const currentBal = typeof selectedBillForPayment.balance_amount === 'number'
                    ? selectedBillForPayment.balance_amount
                    : Math.max(0, (selectedBillForPayment.total_amount || 0) - (selectedBillForPayment.paid_amount || 0));

                  return (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-gray-700 block">Amount Customer is Paying (₹) *</label>
                        <span className="text-[11px] text-gray-500">Auto-filled from selected treatments</span>
                      </div>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-bold text-base">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          max={currentBal}
                          value={installmentAmount}
                          onChange={(e) => setInstallmentAmount(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Enter amount"
                          required
                          className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg text-lg font-bold text-gray-900 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                        />
                      </div>

                      {/* Quick Amount Chips */}
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setInstallmentAmount(currentBal)}
                          className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-md text-xs font-semibold transition"
                        >
                          Full Balance (₹{currentBal.toFixed(2)})
                        </button>
                        {currentBal > 500 && (
                          <button
                            type="button"
                            onClick={() => setInstallmentAmount(Math.round(currentBal / 2))}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition"
                          >
                            Half (₹{Math.round(currentBal / 2)})
                          </button>
                        )}
                        {currentBal >= 1000 && (
                          <button
                            type="button"
                            onClick={() => setInstallmentAmount(1000)}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition"
                          >
                            ₹1,000
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Payment Method */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Payment Method *</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['Cash', 'UPI', 'Card', 'Net Banking', 'Cheque', 'Other'].map((method) => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setInstallmentMethod(method)}
                        className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition ${
                          installmentMethod === method
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Date & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Payment Date *</label>
                    <input
                      type="date"
                      value={installmentDate}
                      onChange={(e) => setInstallmentDate(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Notes / Transaction Reference</label>
                    <input
                      type="text"
                      value={installmentNotes}
                      onChange={(e) => setInstallmentNotes(e.target.value)}
                      placeholder="e.g. Google Pay UPI ref"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm bg-white"
                    />
                  </div>
                </div>

                {/* Allocation Note Preview */}
                {installmentNotes && (
                  <div className="p-2.5 bg-emerald-50/70 rounded-lg border border-emerald-200 text-xs text-emerald-950">
                    <span className="font-semibold block mb-0.5 text-emerald-900">Payment Allocation:</span>
                    <p className="text-gray-700 leading-relaxed font-mono text-[11px]">{installmentNotes}</p>
                  </div>
                )}

                {/* Remaining Balance Preview */}
                {(() => {
                  const currentBal = typeof selectedBillForPayment.balance_amount === 'number'
                    ? selectedBillForPayment.balance_amount
                    : Math.max(0, (selectedBillForPayment.total_amount || 0) - (selectedBillForPayment.paid_amount || 0));
                  const amt = Number(installmentAmount) || 0;
                  const rem = Math.max(0, currentBal - amt);

                  return (
                    <div className="pt-2 border-t text-xs flex justify-between items-center text-gray-600">
                      <span>Remaining after this payment:</span>
                      <span className={`font-bold ${rem === 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
                        ₹{rem.toFixed(2)} {rem === 0 ? ' (Full Settlement ✓)' : ''}
                      </span>
                    </div>
                  );
                })()}

                {/* Dialog Footer Actions */}
                <div className="pt-3 border-t flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInstallmentModalOpen(false)}
                    disabled={submittingInstallment}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingInstallment || !installmentAmount || Number(installmentAmount) <= 0}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-semibold shadow-sm transition flex items-center gap-1.5"
                  >
                    {submittingInstallment ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Confirm Payment (₹{Number(installmentAmount || 0).toFixed(2)})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Alert Message */}
        {alertMessage && (
          <div className={`fixed top-4 right-4 z-50 max-w-sm w-full bg-white rounded-lg shadow-md p-4 transition-all duration-300 ease-in-out ${alertMessage.type === 'error' ? 'border-l-4 border-red-500' : 'border-l-4 border-green-500'}`} role="alert">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {alertMessage.type === 'error' ? (
                  <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2l4 -4m0 0l2 -2l-6 6l-2 2l4 -4z" />
                  </svg>
                )}
              </div>
              <div className="ml-3">
                <p className={`text-sm font-medium ${alertMessage.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                  {alertMessage.message}
                </p>
              </div>
              <div className="ml-auto">
                <button
                  onClick={() => setAlertMessage(null)}
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewPatients;
