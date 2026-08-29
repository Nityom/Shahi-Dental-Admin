'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintableExtractionDues from '@/components/PrintableExtractionDues';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "");

function PrintDuesContent() {
  const searchParams = useSearchParams();
  const billId = searchParams.get('billId');
  const signatureParam = searchParams.get('signature') || 'sign.png';
  const doctorNameParam = searchParams.get('doctorName') || 'Dr. Kautilya Swaroop';

  const [billData, setBillData] = useState<any>(null);
  const [paymentTransactions, setPaymentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillData = async () => {
      if (!billId) {
        setError('No bill ID provided');
        setLoading(false);
        return;
      }

      try {
        const bill = await convex.query(api.bills.getById, { id: billId as any });

        if (!bill) {
          throw new Error('Bill record not found');
        }

        const items = Array.isArray(bill.items)
          ? bill.items.map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unit_price ?? item.unitPrice) || 0,
              unit: item.unit || 'EACH',
              total: parseFloat(item.total) || (parseFloat(item.quantity) * parseFloat(item.unit_price ?? item.unitPrice)),
              itemType: item.itemType || item.item_type || 'procedure',
              date: item.date,
            }))
          : [];

        const total = bill.total_amount || 0;
        const amountPaid = bill.paid_amount || 0;
        const balance = bill.balance_amount ?? Math.max(total - amountPaid, 0);

        const formatDate = (ts: number | string | undefined) => {
          if (!ts) return new Date().toLocaleDateString('en-GB');
          const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
          return isNaN(date.getTime()) ? new Date().toLocaleDateString('en-GB') : date.toLocaleDateString('en-GB');
        };

        setBillData({
          billNumber: (bill as any).bill_number || bill._id,
          billDate: formatDate(bill._creationTime),
          referenceNumber: bill.reference_number,
          patientName: (bill as any).patient_name || 'N/A',
          patientPhone: (bill as any).phone_number || '',
          patientAge: (bill as any).patient_age?.toString() || '',
          patientSex: (bill as any).patient_sex || '',
          items,
          subtotal: total + ((bill as any).discount_amount || 0),
          discount: (bill as any).discount_amount || 0,
          total,
          amountPaid,
          balance,
          notes: bill.notes,
        });

        // Fetch payment transactions
        try {
          const transactions = await convex.query(api.payment_transactions.listByBill, { bill_id: billId });
          setPaymentTransactions(
            transactions.map((t: any) => ({
              amount: t.amount,
              payment_date: t.payment_date,
              payment_method: t.payment_method,
              notes: t.notes,
            }))
          );
        } catch (txError) {
          console.warn('Could not fetch payment transactions:', txError);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load bill dues data');
      } finally {
        setLoading(false);
      }
    };

    fetchBillData();
  }, [billId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Generating Dues Statement...</p>
        </div>
      </div>
    );
  }

  if (error || !billData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center bg-white p-8 rounded-lg shadow-md max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dues Report</h2>
          <p className="text-gray-600 mb-4">{error || 'Bill not found'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white">
      <PrintableExtractionDues
        billNumber={billData.billNumber}
        billDate={billData.billDate}
        referenceNumber={billData.referenceNumber}
        patientName={billData.patientName}
        patientPhone={billData.patientPhone}
        patientAge={billData.patientAge}
        patientSex={billData.patientSex}
        items={billData.items}
        subtotal={billData.subtotal}
        discount={billData.discount}
        total={billData.total}
        amountPaid={billData.amountPaid}
        balance={billData.balance}
        showPrintButton={true}
        signature={signatureParam}
        doctorName={doctorNameParam}
        paymentTransactions={paymentTransactions}
        clinicalNotes={billData.notes}
      />
    </div>
  );
}

export default function PrintDuesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
      <PrintDuesContent />
    </Suspense>
  );
}
