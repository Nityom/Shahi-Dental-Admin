import { formatDate } from "@/lib/utils";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { FileText, Download, Printer } from "lucide-react";

interface Bill {
  id: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  payment_status: 'PENDING' | 'PARTIAL' | 'PAID';
  created_at: string;
  reference_number?: string;
  notes?: string;
  items?: Array<{
    description?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
  }>;
}

interface BillSummaryProps {
  bill?: Bill;
}

export function BillSummary({ bill }: BillSummaryProps) {
  if (!bill) {
    return (
      <Card className="p-6">
        <div className="text-sm text-gray-500">No bill generated</div>
      </Card>
    );
  }

  // Always use the actual paid_amount and balance_amount from the bill
  const displayPaidAmount = bill.paid_amount;
  const displayBalanceAmount = bill.balance_amount;

  const handleGeneratePDF = () => {
    if (bill.id) {
      const queryParams = new URLSearchParams({
        billId: bill.id,
        totalAmount: bill.total_amount.toString(),
        paidAmount: displayPaidAmount.toString(),
        paymentStatus: bill.payment_status,
        balanceAmount: displayBalanceAmount.toString(),
        items: JSON.stringify(bill.items || []),
        referenceNumber: bill.reference_number || "",
        createdAt: bill.created_at,
        notes: bill.notes || "",
      }).toString();

      window.open(`/api/generate-bill?${queryParams}`, "_blank");
    }
  };

  const handleDownload = () => {
    if (bill.id) {
      const queryParams = new URLSearchParams({
        ...getQueryParams(),
        download: "true"
      }).toString();
      window.open(`/api/generate-bill?${queryParams}`, "_blank");
    }
  };

  const handlePrint = () => {
    if (bill.id) {
      const queryParams = new URLSearchParams({
        ...getQueryParams(),
        print: "true"
      }).toString();
      const printWindow = window.open(`/api/generate-bill?${queryParams}`, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handlePrintableBill = () => {
    if (bill.id) {
      window.open(`/print-bill?billId=${bill.id}`, '_blank');
    }
  };

  const getQueryParams = () => ({
    billId: bill.id,
    totalAmount: bill.total_amount.toString(),
    paidAmount: displayPaidAmount.toString(),
    paymentStatus: bill.payment_status,
    balanceAmount: displayBalanceAmount.toString(),
    items: JSON.stringify(bill.items || []),
    referenceNumber: bill.reference_number || "",
    createdAt: bill.created_at,
    notes: bill.notes || "",
  });

  return (
    <Card className="p-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bill Summary</h3>
          <p className="text-sm text-gray-500">{formatDate(bill.created_at)}</p>
        </div>
        {bill.payment_status === 'PENDING' && (
          <span className="text-red-600 font-medium">
            PENDING
          </span>
        )}
        {bill.payment_status === 'PARTIAL' && (
          <span className="text-yellow-600 font-medium">
            PARTIAL
          </span>
        )}
        {bill.payment_status === 'PAID' && (
          <span className="text-green-600 font-medium">
            PAID
          </span>
        )}
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Amount</span>
          <span className="font-medium">₹{bill.total_amount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-gray-600">Paid Amount</span>
          <span className="font-medium">₹{displayPaidAmount.toFixed(2)}</span>
        </div>

        {displayBalanceAmount > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Balance Due</span>
            <span className="font-medium text-red-600">₹{displayBalanceAmount.toFixed(2)}</span>
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end flex-wrap">
        <Button 
          onClick={handlePrintableBill} 
          variant="outline" 
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button 
          onClick={handleDownload} 
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download
        </Button>
        {/* <Button 
          onClick={handleGeneratePDF} 
          variant="outline" 
          className="flex items-center gap-2 text-gray-600"
        >
          <FileText className="h-4 w-4" />
          View PDF
        </Button> */}
      </div>
    </Card>
  );
}
