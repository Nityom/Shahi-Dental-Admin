"use client";

import { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { formatDate } from "@/lib/utils";
import PaymentHistory from "./PaymentHistory";
import AddPaymentDialog from "./AddPaymentDialog";
import { ChevronDown, ChevronUp, Printer } from "lucide-react";
import { Bill } from "@/services/bills";

interface BillHistoryWithPaymentsProps {
  bills: Bill[];
  onBillUpdated?: () => void;
  defaultSignature?: string;
  defaultDoctorName?: string;
}

export function BillHistoryWithPayments({ bills, onBillUpdated, defaultSignature = 'sign.png', defaultDoctorName = 'Dr. Kautilya Swaroop' }: BillHistoryWithPaymentsProps) {
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<Set<string>>(new Set());

  if (!bills || bills.length === 0) {
    return (
      <Card className="p-4">
        <p className="text-sm text-gray-500">No bills found</p>
      </Card>
    );
  }

  // Overall totals
  const overallTotal = bills.reduce((s, b) => s + (b.total_amount || 0), 0);
  const overallPaid = bills.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const overallBalance = bills.reduce((s, b) => s + (Number(b.balance_amount) || 0), 0);

  const toggleSelect = (id: string) => {
    setSelectedBillIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const ids = bills.map((b) => b.id).filter(Boolean) as string[];
    setSelectedBillIds(new Set(ids));
  };

  const clearSelection = () => setSelectedBillIds(new Set());

  const handlePrintSelected = () => {
    const ids = Array.from(selectedBillIds);
    if (ids.length === 0) return;
    const params = new URLSearchParams({
      billIds: ids.join(','),
      signature: defaultSignature,
      doctorName: defaultDoctorName,
    });
    window.open(`/print-bill/statement?${params.toString()}`, '_blank');
  };

  const handlePrintAll = () => {
    const ids = bills.map((b) => b.id).filter(Boolean) as string[];
    const params = new URLSearchParams({
      billIds: ids.join(','),
      signature: defaultSignature,
      doctorName: defaultDoctorName,
    });
    window.open(`/print-bill/statement?${params.toString()}`, '_blank');
  };

  const toggleBillExpansion = (billId: string) => {
    setExpandedBillId(expandedBillId === billId ? null : billId);
  };

  const handleAddPaymentClick = (bill: Bill) => {
    setSelectedBill(bill);
    setShowAddPayment(true);
  };

  const handlePaymentAdded = () => {
    if (onBillUpdated) {
      onBillUpdated();
    }
    setShowAddPayment(false);
  };

  return (
    <>
      {/* Overall Summary */}
      <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-blue-800">Overall Bill Summary</h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAll} className="text-xs">
              Select All
            </Button>
            {selectedBillIds.size > 0 && (
              <Button size="sm" variant="outline" onClick={clearSelection} className="text-xs">
                Clear
              </Button>
            )}
            {selectedBillIds.size > 0 ? (
              <Button size="sm" onClick={handlePrintSelected} className="flex items-center gap-1 text-xs">
                <Printer className="h-3 w-3" />
                Print {selectedBillIds.size} Bill{selectedBillIds.size > 1 ? 's' : ''}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={handlePrintAll} className="flex items-center gap-1 text-xs">
                <Printer className="h-3 w-3" />
                Print All
              </Button>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          <div className="bg-white rounded p-2 border">
            <div className="text-xs text-gray-500">Total Billed</div>
            <div className="font-bold">₹{overallTotal.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-white rounded p-2 border">
            <div className="text-xs text-gray-500">Total Paid</div>
            <div className="font-bold text-green-600">₹{overallPaid.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-white rounded p-2 border">
            <div className="text-xs text-gray-500">Balance Due</div>
            <div className={`font-bold ${overallBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{overallBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {bills.map((bill) => {
          if (!bill.id) return null; // Skip bills without IDs
          
          const isExpanded = expandedBillId === bill.id;
          const hasBalance = (Number(bill.balance_amount) || 0) > 0;

          return (
            <div key={bill.id} className="space-y-2">
              <Card className={`p-4 ${selectedBillIds.has(bill.id!) ? 'ring-2 ring-blue-400' : ''}`}>
                <div className="flex justify-between items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedBillIds.has(bill.id!)}
                    onChange={() => bill.id && toggleSelect(bill.id)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 cursor-pointer flex-shrink-0"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">
                        {bill.bill_number || `Bill #${bill.id.slice(0, 8)}`}
                      </p>
                      {bill.payment_status && (
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          bill.payment_status === 'PAID' 
                            ? 'bg-green-100 text-green-700' 
                            : bill.payment_status === 'PARTIAL' 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {bill.payment_status}
                        </span>
                      )}
                    </div>
                    {bill.patient_name && (
                      <p className="text-sm font-medium text-gray-700">
                        {bill.patient_name}
                      </p>
                    )}
                    {bill.phone_number && (
                      <p className="text-sm text-gray-500">
                        📱 {bill.phone_number}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Created on {bill.created_at ? formatDate(bill.created_at) : 'N/A'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg">₹{bill.total_amount.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">Paid</p>
                    <p className="font-medium text-green-600">₹{bill.paid_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Balance</p>
                    <p className="font-medium text-orange-600">₹{(Number(bill.balance_amount) || 0).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    {hasBalance && (
                      <Button
                        size="sm"
                        onClick={() => handleAddPaymentClick(bill)}
                        className="mt-1"
                      >
                        Add Payment
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <div className="mt-3 pt-3 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => bill.id && toggleBillExpansion(bill.id)}
                    className="w-full"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Hide Payment History
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        View Payment History
                      </>
                    )}
                  </Button>
                </div>
              </Card>

              {/* Payment History Section (Expanded) */}
              {isExpanded && bill.id && (
                <div className="ml-4">
                  <PaymentHistory
                    billId={bill.id}
                    totalAmount={bill.total_amount}
                    paidAmount={bill.paid_amount}
                    balanceAmount={Number(bill.balance_amount) || 0}
                    onPaymentAdded={onBillUpdated || (() => {})}
                    onAddPaymentClick={() => handleAddPaymentClick(bill)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Payment Dialog */}
      {selectedBill && selectedBill.id && selectedBill.patient_id && (
        <AddPaymentDialog
          open={showAddPayment}
          onOpenChange={setShowAddPayment}
          billId={selectedBill.id}
          patientId={selectedBill.patient_id}
          balanceAmount={Number(selectedBill.balance_amount) || 0}
          onPaymentAdded={handlePaymentAdded}
        />
      )}
    </>
  );
}
