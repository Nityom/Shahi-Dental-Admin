'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { ToothData } from '@/components/TeethChart';
import { createBill, updateBill, getBillByPrescriptionId, getPatientByReferenceNumber } from '@/services/bills';
import { getPatientByReference } from '@/services/patients';


interface PatientData {
  name: string;
  age: string;
  sex: string;
  date: string;
  phoneNumber?: string;
  reference_number?: string;
}

interface BillItemFromDB {
  id?: number;
  description: string;
  quantity: number;
  unit_price: number;
  total?: number;
  itemType: 'medicine' | 'procedure' | 'consultation' | 'other';
}

interface BillItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  itemType: 'medicine' | 'procedure' | 'consultation' | 'other';
}

interface BillFormProps {
  patientData: PatientData;
  diagnosis: string;
  selectedTeeth: ToothData[];
  prescriptionId: string;
  onBack: () => void; // Function to go back to prescription form
}

// Default dental procedures with prices
const defaultDentalProcedures = [
  { id: 1, name: 'Dental Checkup', price: 500 },
  { id: 2, name: 'Teeth Cleaning', price: 1000 },
  { id: 3, name: 'Root Canal', price: 5000 },
  { id: 4, name: 'Tooth Extraction', price: 1500 },
  { id: 5, name: 'Dental Filling', price: 1200 },
  { id: 6, name: 'Dental Crown', price: 8000 },
  { id: 7, name: 'Dental Bridge', price: 15000 },
  { id: 8, name: 'Dental Implant', price: 25000 },
  { id: 9, name: 'Teeth Whitening', price: 4000 },
  { id: 10, name: 'Braces Consultation', price: 1000 },
];

// Temporary bill number shown before saving; real sequential number is assigned by the server
const generateBillNumber = () => {
  const year = new Date().getFullYear();
  return `KSD-INV-${year}-???`;
};

interface StockUpdateResult {
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  medicine?: {
    id: number;
    name: string;
    quantity: number;
  };
}

const BillForm: React.FC<BillFormProps> = ({ patientData, diagnosis, selectedTeeth, prescriptionId, onBack }) => {
  // State declarations
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [billSaved, setBillSaved] = useState(false);
  const [savedBillId, setSavedBillId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Basic bill information
  const [billData, setBillData] = useState({
    patientId: '',
    contactDetails: '',
    billNumber: generateBillNumber(),
    billDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'Cash',
    discount: 0,
    consultationFee: 500,
    amountPaid: 0,
    paymentStatus: 'Full Payment',
  });

  // Bill items including procedures, medicines, etc.
  const [billItems, setBillItems] = useState<BillItem[]>([]);

  // State for PDF generation and stock updates
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState(false);
  const [stockUpdateResults] = useState<StockUpdateResult[]>([]);

  // State for handling new procedure
  const [newProcedure, setNewProcedure] = useState({
    description: '',
    quantity: 1,
    unitPrice: 0,
  });

  // Calculate totals using useCallback
  const calculateTotals = useCallback(() => {
    const itemsTotal = billItems.reduce((sum, item) => sum + item.total, 0);
    const subtotal = itemsTotal + billData.consultationFee;
    const discountAmount = (subtotal * billData.discount) / 100;
    const totalAmount = subtotal - discountAmount;
    return { itemsTotal, subtotal, discountAmount, totalAmount };
  }, [billItems, billData.consultationFee, billData.discount]);

  const totals = calculateTotals();

  // Auto-populate contact details with patient phone number
  useEffect(() => {
    if (patientData.phoneNumber && !billData.contactDetails) {
      setBillData(prev => ({
        ...prev,
        contactDetails: patientData.phoneNumber || ''
      }));
    }
  }, [patientData.phoneNumber, billData.contactDetails]);

  // Update amount paid when total changes - only for Full Payment status
  useEffect(() => {
    setBillData(prev => {
      // Only auto-update if payment status is Full Payment
      if (prev.paymentStatus === 'Full Payment') {
        return {
          ...prev,
          amountPaid: totals.totalAmount
        };
      }
      // For Partial Payment, ensure it doesn't exceed total
      if (prev.paymentStatus === 'Partial Payment') {
        return {
          ...prev,
          amountPaid: Math.min(prev.amountPaid, totals.totalAmount)
        };
      }
      // For Payment Pending, keep it at 0
      return prev;
    });
  }, [totals.totalAmount]);

  // Handle bill generation
  const handleGenerateBill = useCallback(async () => {
    try {
      setGeneratedPdf(false);
      const fullBillData = {
        clinic: {
          name: "Shahi Dental Clinic",
        },
        patient: {
          ...patientData,
          contactDetails: billData.contactDetails,
        },
        invoice: {
          number: billData.billNumber,
          date: billData.billDate,
          paymentMethod: billData.paymentMethod,
          paymentStatus: billData.paymentStatus,
        },
        items: billItems.map(item => ({
          ...item,
          total: item.quantity * item.unitPrice
        })),
        financials: {
          consultationFee: billData.consultationFee,
          subtotal: totals.subtotal,
          discountPercent: billData.discount,
          discountAmount: totals.discountAmount,
          total: totals.totalAmount,
          amountPaid: billData.amountPaid,
          balanceDue: Math.max(totals.totalAmount - billData.amountPaid, 0)
        },
        teeth: selectedTeeth.map(tooth => `#${tooth.id}`).join(', '),
        diagnosis,
      };

      // Call the API to generate the PDF
      const response = await fetch('/api/generate-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fullBillData),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate bill: ${response.statusText}`);
      }

      const blob = await response.blob();
      setPdfUrl(URL.createObjectURL(blob));
      setGeneratedPdf(true);
    } catch (error) {
      console.error('Error generating bill:', error);
      setSaveError('Failed to generate bill. Please try again.');
    }
  }, [billData, billItems, diagnosis, patientData, selectedTeeth, totals]);
  // Form validation
  const validateForm = useCallback(() => {
    if (billItems.length === 0) {
      return 'Please add at least one item to the bill';
    }
    if (totals.totalAmount <= 0) {
      return 'Total amount must be greater than 0';
    }
    return null;
  }, [billItems.length, totals.totalAmount]);

  // Handle saving the bill
  const handleSaveBill = useCallback(async () => {
    try {
      const validationError = validateForm();
      if (validationError) {
        setSaveError(validationError);
        return;
      }

      setIsSaving(true);
      setSaveError(null);

      const paidAmount = parseFloat(String(billData.amountPaid)) || 0;

      const paymentStatus = paidAmount >= totals.totalAmount ? 'PAID' :
        paidAmount > 0 ? 'PARTIAL' : 'PENDING';

      const allBillItems = [
        ...billItems,
        {
          description: 'Consultation Fee',
          quantity: 1,
          unit_price: billData.consultationFee,
          total: billData.consultationFee,
          itemType: 'consultation' as const
        }
      ];

      // Get patient ID from reference number if it exists
      let effectivePatientId = null;
      if (!patientData.reference_number) {
        throw new Error('Patient reference number is missing. Please save the prescription first before generating a bill.');
      }

      try {
        const patient = await getPatientByReference(patientData.reference_number);
        if (patient && patient.id) {
          effectivePatientId = patient.id;
        } else {
          throw new Error(`No patient found with reference number ${patientData.reference_number}`);
        }
      } catch (error) {
        console.error('Error getting patient by reference:', error);
        throw new Error('Cannot create bill: Failed to retrieve patient information. Please refresh the page and try again.');
      }

      if (!effectivePatientId) {
        throw new Error('Cannot create bill: Patient ID could not be determined.');
      }

      const billUpdateData = {
        prescription_id: prescriptionId,
        patient_id: effectivePatientId,
        reference_number: patientData.reference_number,
        bill_number: billData.billNumber,
        bill_date: billData.billDate,
        payment_method: billData.paymentMethod,
        discount_percent: billData.discount,
        discount_amount: totals.discountAmount,
        total_amount: totals.totalAmount,
        paid_amount: paidAmount,
        payment_status: paymentStatus as 'PAID' | 'PARTIAL' | 'PENDING',
        items: allBillItems,
        notes: notes || '',
        updated_at: new Date().toISOString()
      };

      console.log('Creating bill with data:', billUpdateData);

      let savedBill;
      let existingBill = null;

      try {
        existingBill = await getBillByPrescriptionId(prescriptionId);
      } catch (error) {
        // Bill doesn't exist yet, will create new one
        console.log('No existing bill found, will create new one');
      }

      if (existingBill && existingBill.id) {
        savedBill = await updateBill(existingBill.id, billUpdateData);
      } else {
        savedBill = await createBill(billUpdateData as any);
      }

      if (!savedBill) throw new Error('Failed to save bill: No response from server');

      setBillSaved(true);
      setSavedBillId(savedBill.id || null);

      // Update billNumber with the server-assigned sequential number
      if (savedBill.bill_number) {
        setBillData(prev => ({ ...prev, billNumber: savedBill.bill_number! }));
      }

      // Update form state with saved data
      if (savedBill && Array.isArray(savedBill.items)) {
        setBillItems(
          savedBill.items
            .filter((item: BillItemFromDB) => item.itemType !== 'consultation')
            .map((item: BillItemFromDB) => ({
              ...item,
              id: item.id || Math.random(),
              quantity: parseFloat(String(item.quantity)),
              unitPrice: parseFloat(String(item.unit_price)),
              total: parseFloat(String(item.total || (item.quantity * item.unit_price)))
            }))
        );

        const consultFee = savedBill.items
          .find((item: BillItemFromDB) => item.itemType === 'consultation');

        setBillData(prev => ({
          ...prev,
          consultationFee: parseFloat(String(consultFee?.unit_price || 500)),
          amountPaid: parseFloat(String(savedBill.paid_amount || 0)),
          paymentStatus: savedBill.payment_status,
        }));
      }

      await handleGenerateBill();
      alert('Bill saved successfully! You can now print or download the bill.');

    } catch (error) {
      console.error('Error saving bill:', error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save bill. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [billData, billItems, handleGenerateBill, notes, patientData.reference_number, prescriptionId, totals.totalAmount, validateForm]);

  // Handle input changes for form fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'discount') {
      const discountValue = parseFloat(value) || 0;
      // Limit discount to 0-100%
      const clampedDiscount = Math.min(Math.max(discountValue, 0), 100);
      setBillData(prev => ({
        ...prev,
        [name]: clampedDiscount,
      }));
    } else if (name === 'consultationFee') {
      const feeValue = parseFloat(value) || 0;
      setBillData(prev => ({
        ...prev,
        [name]: feeValue,
      }));
    } else if (name === 'amountPaid') {
      // Handle amount paid - ensure it doesn't exceed total
      const amountValue = parseFloat(value) || 0;
      const { totalAmount } = calculateTotals();
      // Limit amount paid to total amount
      const clampedAmount = Math.min(Math.max(amountValue, 0), totalAmount);
      setBillData(prev => ({
        ...prev,
        [name]: clampedAmount,
        paymentStatus: clampedAmount >= totalAmount ? 'Full Payment' :
          clampedAmount > 0 ? 'Partial Payment' : 'Payment Pending'
      }));
    } else if (name === 'paymentStatus') {
      const { totalAmount } = calculateTotals();
      setBillData(prev => ({
        ...prev,
        [name]: value,
        amountPaid: value === 'Full Payment' ? totalAmount :
          value === 'Payment Pending' ? 0 : prev.amountPaid
      }));
    } else {
      setBillData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  // Handle changes in new procedure form
  const handleNewProcedureChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === 'description') {
      // If selecting from dropdown, update price too
      const selectedProcedure = defaultDentalProcedures.find(proc => proc.name === value);
      if (selectedProcedure) {
        setNewProcedure(prev => ({
          ...prev,
          description: value,
          unitPrice: selectedProcedure.price,
        }));
      } else {
        setNewProcedure(prev => ({
          ...prev,
          description: value,
        }));
      }
    } else {
      const numValue = name === 'quantity' ? Math.max(1, parseInt(value) || 1) : parseFloat(value) || 0;
      setNewProcedure(prev => ({
        ...prev,
        [name]: numValue,
      }));
    }
  };

  // Add a new procedure to the bill
  const addProcedure = () => {
    if (newProcedure.description && newProcedure.unitPrice > 0) {
      const newItem: BillItem = {
        id: billItems.length + 1,
        description: newProcedure.description,
        quantity: newProcedure.quantity,
        unitPrice: newProcedure.unitPrice,
        total: newProcedure.quantity * newProcedure.unitPrice,
        itemType: 'procedure'
      };
      setBillItems([...billItems, newItem]);
      setNewProcedure({
        description: '',
        quantity: 1,
        unitPrice: 0,
      });
    }
  };

  // Remove a bill item
  const removeBillItem = (id: number) => {
    setBillItems(billItems.filter(item => item.id !== id));
  };

  // Update an existing bill item
  const updateBillItem = (id: number, field: string, value: number | string) => {
    setBillItems(prevItems =>
      prevItems.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate total if quantity or unitPrice changes
          if (field === 'quantity' || field === 'unitPrice') {
            updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };


  const handlePrint = useCallback(() => {
    if (savedBillId) {
      const queryParams = new URLSearchParams({
        billId: savedBillId,
        print: 'true'
      }).toString();
      const printWindow = window.open(`/api/generate-bill?${queryParams}`, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => {
          printWindow.print();
        });
      }
    }
  }, [savedBillId]);

  const handlePrintableBill = useCallback(() => {
    if (savedBillId) {
      window.open(`/print-bill?billId=${savedBillId}`, '_blank');
    }
  }, [savedBillId]);

  const handleDownload = useCallback(() => {
    if (savedBillId) {
      const queryParams = new URLSearchParams({
        billId: savedBillId,
        download: 'true'
      }).toString();
      window.open(`/api/generate-bill?${queryParams}`, '_blank');
    }
  }, [savedBillId]);

  // UI rendering code
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-blue-700">Generate Bill</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 transition"
        >
          Back to Prescription
        </button>
      </div>

      {/* Success Message */}
      {generatedPdf && (
        <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          <p className="font-medium">Bill generated successfully! You can now download or print it.</p>
        </div>
      )}

      {/* Stock Update Results */}
      {stockUpdateResults.length > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Medicine Stock Update Status:</h4>
          <div className="space-y-2">
            {stockUpdateResults.map((result, index) => (
              <div
                key={index}
                className={`p-2 rounded ${result.status === 'success' ? 'bg-green-100 text-green-700' :
                    result.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                  }`}
              >
                <p className="font-medium">{result.name}: {result.message}</p>
                {result.medicine && (
                  <p className="text-sm">Current stock: {result.medicine.quantity}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Clinic Information */}
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-100">
          <div className="flex justify-between items-center">            <div>              <h3 className="text-2xl font-bold text-blue-800">Shahi Dental Clinic</h3>
            <p className="text-gray-600">Professional Dental Care Services</p>
          </div>
            <div className="text-right">
              <p><strong>Bill No:</strong> {billData.billNumber}</p>
              <p><strong>Date:</strong> {new Date(billData.billDate).toLocaleDateString()}</p>
            </div>
          </div>
        </div>

        {/* Patient Information */}
        <div className="bg-green-50 p-6 rounded-lg border border-green-100">
          <h3 className="text-xl font-semibold mb-4 text-green-800">Patient Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">            <div>
            <p><strong>Name:</strong> {patientData.name}</p>
            <p><strong>Age/Sex:</strong> {patientData.age} / {patientData.sex}</p>
            <p><strong>Visit Date:</strong> {new Date(patientData.date).toLocaleDateString()}</p>
            {patientData.reference_number && (
              <p className="mt-2 font-medium text-blue-700">
                <strong>Patient Reference:</strong> {patientData.reference_number}
              </p>
            )}
          </div>
            <div>

              <label className="block text-sm font-medium text-gray-700 mt-4 mb-1">Contact Details</label>
              <input
                type="text"
                name="contactDetails"
                value={billData.contactDetails}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
                placeholder="Phone Number or Email"
              />
            </div>
          </div>
        </div>

        {/* Medical Information (Brief) */}
        <div className="bg-purple-50 p-6 rounded-lg border border-purple-100">
          <h3 className="text-xl font-semibold mb-4 text-purple-800">Treatment Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p><strong>Diagnosis:</strong> {diagnosis || 'N/A'}</p>
              {selectedTeeth.length > 0 && (
                <p><strong>Teeth Treated:</strong> {selectedTeeth.map(tooth => `#${tooth.id}`).join(', ')}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Consultation Fee (₹)</label>
              <input
                type="number"
                name="consultationFee"
                value={billData.consultationFee}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Bill Items Table */}
        <div className="bg-amber-50 p-6 rounded-lg border border-amber-100">
          <h3 className="text-xl font-semibold mb-4 text-amber-800">Bill Items</h3>

          {/* Add New Procedure Section */}
          <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-700 mb-3">Add Dental Procedure</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Procedure</label>
                <select
                  name="description"
                  value={newProcedure.description}
                  onChange={handleNewProcedureChange}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Procedure</option>
                  {defaultDentalProcedures.map(proc => (
                    <option key={proc.id} value={proc.name}>{proc.name}</option>
                  ))}
                  <option value="Custom">Custom Procedure</option>
                </select>

                {newProcedure.description === 'Custom' && (
                  <input
                    type="text"
                    placeholder="Enter custom procedure name"
                    className="mt-2 block w-full p-3 border border-gray-300 rounded-lg"
                    onChange={(e) => setNewProcedure({ ...newProcedure, description: e.target.value })}
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={newProcedure.quantity}
                  onChange={handleNewProcedureChange}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  name="unitPrice"
                  value={newProcedure.unitPrice}
                  onChange={handleNewProcedureChange}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
                  min="0"
                />
              </div>
              <div className="md:col-span-4 flex justify-end">
                <button
                  type="button"
                  onClick={addProcedure}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                  disabled={!newProcedure.description || newProcedure.unitPrice <= 0}
                >
                  Add Item
                </button>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S.No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price (₹)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total (₹)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {billItems.map((item, index) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 whitespace-nowrap">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateBillItem(item.id, 'description', e.target.value)}
                        className="w-full p-1 border border-gray-300 rounded"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateBillItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 p-1 border border-gray-300 rounded"
                        min="1"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateBillItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-24 p-1 border border-gray-300 rounded"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {item.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <button
                        onClick={() => removeBillItem(item.id)}
                        className="text-red-600 hover:text-red-900 focus:outline-none"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Consultation Fee Row */}
                <tr className="bg-blue-50">
                  <td className="px-4 py-3 whitespace-nowrap">{billItems.length + 1}</td>
                  <td className="px-4 py-3 whitespace-nowrap font-medium">Consultation Fee</td>
                  <td className="px-4 py-3 whitespace-nowrap">1</td>
                  <td className="px-4 py-3 whitespace-nowrap">{billData.consultationFee.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{billData.consultationFee.toFixed(2)}</td>
                  <td className="px-4 py-3 whitespace-nowrap"></td>
                </tr>
              </tbody>
              <tfoot className="bg-gray-50">
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-medium">Subtotal:</td>
                  <td colSpan={2} className="px-4 py-3 font-medium">₹ {totals.subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-medium">Discount:</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      name="discount"
                      value={billData.discount}
                      onChange={handleInputChange}
                      className="w-16 p-1 border border-gray-300 rounded text-right"
                      min="0"
                      max="100"
                    /> %
                  </td>
                  <td colSpan={2} className="px-4 py-3 font-medium">₹ {totals.discountAmount.toFixed(2)}</td>
                </tr>
                <tr className="bg-amber-100">
                  <td colSpan={4} className="px-4 py-3 text-right font-bold">Total Amount Payable:</td>
                  <td colSpan={2} className="px-4 py-3 font-bold text-lg">₹ {(totals.subtotal - totals.discountAmount).toFixed(2)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="px-4 py-3 text-right font-medium">Amount Paid:</td>
                  <td colSpan={2} className="px-4 py-3 font-medium">₹ {billData.amountPaid.toFixed(2)}</td>
                </tr>
                <tr className={billData.amountPaid < (totals.subtotal - totals.discountAmount) ? "bg-red-50" : "bg-green-50"}>
                  <td colSpan={4} className="px-4 py-3 text-right font-bold">
                    {billData.amountPaid >= (totals.subtotal - totals.discountAmount) ? "Balance:" : "Balance Due:"}
                  </td>
                  <td colSpan={2} className={`px-4 py-3 font-bold text-lg ${billData.amountPaid >= (totals.subtotal - totals.discountAmount) ? "text-green-600" : "text-red-600"
                    }`}>
                    ₹ {Math.max((totals.subtotal - totals.discountAmount) - billData.amountPaid, 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-teal-50 p-6 rounded-lg border border-teal-100">
          <h3 className="text-xl font-semibold mb-4 text-teal-800">Payment Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                name="paymentMethod"
                value={billData.paymentMethod}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="Cash">Cash</option>
                <option value="Card">Card</option>
                <option value="UPI">UPI</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
              <input
                type="date"
                name="billDate"
                value={billData.billDate}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
              />
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                name="paymentStatus"
                value={billData.paymentStatus}
                onChange={handleInputChange}
                className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
              >
                <option value="Full Payment">Full Payment</option>
                <option value="Partial Payment">Partial Payment</option>
                <option value="Payment Pending">Payment Pending</option>
              </select>
            </div>

            {/* Amount Paid - only visible if Partial Payment is selected */}
            {billData.paymentStatus === 'Partial Payment' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid (₹)</label>
                <input
                  type="number"
                  name="amountPaid"
                  value={billData.amountPaid}
                  onChange={handleInputChange}
                  className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
                  min="0"
                  max={totals.totalAmount}
                />
              </div>
            )}
          </div>
        </div>
        {/* Notes Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1 block w-full p-3 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Add any additional notes or remarks for this bill..."
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-8 mb-4">
          {!billSaved ? (
            <button
              type="button"
              onClick={handleSaveBill}
              disabled={isSaving || billItems.length === 0}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving...
                </>
              ) : (
                'Save Bill'
              )}
            </button>
          ) : (
            <>
              {/* Print Button */}
              <button
                type="button"
                onClick={handlePrintableBill}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print Bill
              </button>

              {/* Download Button */}
              <button
                type="button"
                onClick={handleDownload}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Bill
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
              >
                Back to Prescription
              </button>
            </>
          )}

          {!billSaved && (
            <button
              type="button"
              onClick={onBack}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition"
            >
              Back to Prescription
            </button>
          )}
        </div>

        {/* Success Message */}
        {billSaved && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Bill saved successfully!</span>
            </div>
            <p className="mt-1 text-sm text-green-600">You can now print or download the bill.</p>
          </div>
        )}

        {saveError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {saveError}
          </div>
        )}
      </div>

      {/* Hidden iframe for PDF preview/loading */}
      {pdfUrl && (
        <div className="hidden">
          <iframe
            src={pdfUrl}
            title="Bill PDF"
          />
        </div>
      )}
    </div>);
};

export default BillForm;