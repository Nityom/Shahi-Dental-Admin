'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintableBill from '@/components/PrintableBill';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) {
  throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
}
const convex = new ConvexHttpClient(convexUrl);

interface BillItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  total: number;
  itemType?: 'medicine' | 'procedure' | 'consultation' | 'other';
}

interface BillData {
  billNumber: string;
  billDate: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: string;
  patientSex?: string;
  items: BillItem[];
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
}

function PrintBillContent() {
  const searchParams = useSearchParams();
  const billId = searchParams.get('billId');
  const signatureParam = searchParams.get('signature') || 'sign.png';
  const doctorNameParam = searchParams.get('doctorName') || 'Dr. Kautilya Swaroop';
  const [billData, setBillData] = useState<BillData | null>(null);
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
          throw new Error('Bill not found');
        }

        // Parse items
        const items = Array.isArray(bill.items)
          ? bill.items.map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: parseFloat(item.quantity) || 1,
              unitPrice: parseFloat(item.unit_price ?? item.unitPrice) || 0,
              unit: item.unit || (item.item_type === 'medicine' || item.itemType === 'medicine' ? 'PCS' : 'EACH'),
              total: parseFloat(item.total) || (parseFloat(item.quantity) * parseFloat(item.unit_price ?? item.unitPrice)),
              itemType: item.itemType || item.item_type || 'other',
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
        });

        // Fetch payment transactions for this bill
        try {
          const txns = await convex.query(api.payment_transactions.listByBill, { bill_id: billId as string });
          if (Array.isArray(txns)) {
            setPaymentTransactions(txns.map((t: any) => ({
              amount: t.amount,
              payment_date: t.payment_date,
              payment_method: t.payment_method,
            })));
          }
        } catch {}
      } catch (err) {
        console.error('Error fetching bill:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bill data');
      } finally {
        setLoading(false);
      }
    };

    fetchBillData();
  }, [billId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bill...</p>
        </div>
      </div>
    );
  }

  if (error || !billData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error || 'Bill not found'}</p>
        </div>
      </div>
    );
  }

  return <PrintableBill {...billData} signature={signatureParam} doctorName={doctorNameParam} paymentTransactions={paymentTransactions} />;
}

export default function PrintBillPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <PrintBillContent />
    </Suspense>
  );
}
