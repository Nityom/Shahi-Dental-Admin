'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PrintableBill from '@/components/PrintableBill';
import { ConvexHttpClient } from 'convex/browser';
// @ts-ignore
import { api } from '@/convex/_generated/api';

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
if (!convexUrl) throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured.');
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
  signature: string;
  doctorName: string;
  paymentTransactions: { amount: number; payment_date: string; payment_method?: string }[];
}

function StatementContent() {
  const searchParams = useSearchParams();
  const billIdsParam = searchParams.get('billIds') || '';
  const signatureParam = searchParams.get('signature') || 'sign.png';
  const doctorNameParam = searchParams.get('doctorName') || 'Dr. Kautilya Swaroop';
  const [bills, setBills] = useState<BillData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [overallTotal, setOverallTotal] = useState(0);
  const [overallPaid, setOverallPaid] = useState(0);
  const [overallBalance, setOverallBalance] = useState(0);
  const [patientName, setPatientName] = useState('');

  useEffect(() => {
    const fetchBills = async () => {
      const ids = billIdsParam.split(',').filter(Boolean);
      if (ids.length === 0) {
        setError('No bill IDs provided');
        setLoading(false);
        return;
      }

      try {
        const formatDate = (ts: number | string | undefined) => {
          if (!ts) return new Date().toLocaleDateString('en-GB');
          const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
          return isNaN(date.getTime()) ? new Date().toLocaleDateString('en-GB') : date.toLocaleDateString('en-GB');
        };

        const fetched = await Promise.all(
          ids.map((id) => convex.query(api.bills.getById, { id: id as any }))
        );

        // Resolve doctor_name from each bill's linked prescription
        const doctorNameForBill = async (bill: any): Promise<{ signature: string; doctorName: string }> => {
          try {
            if (bill.prescription_id) {
              const rx = await convex.query(api.prescriptions.getById, { id: bill.prescription_id as any });
              if (rx?.doctor_name) {
                const isAnjali = rx.doctor_name.toLowerCase().includes('anjali');
                return {
                  signature: isAnjali ? 'sign1.png' : 'sign.png',
                  doctorName: rx.doctor_name,
                };
              }
            }
          } catch {}
          return { signature: signatureParam, doctorName: doctorNameParam };
        };

        const billDataList: BillData[] = await Promise.all(
          fetched
            .filter((bill): bill is NonNullable<typeof bill> => !!bill)
            .map(async (bill) => {
              const { signature, doctorName } = await doctorNameForBill(bill);

              // Fetch payment transactions for this bill
              let paymentTransactions: { amount: number; payment_date: string; payment_method?: string }[] = [];
              try {
                const txns = await convex.query(api.payment_transactions.listByBill, { bill_id: bill._id as string });
                if (Array.isArray(txns)) {
                  paymentTransactions = txns.map((t: any) => ({
                    amount: t.amount,
                    payment_date: t.payment_date,
                    payment_method: t.payment_method,
                  }));
                }
              } catch {}

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

              return {
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
              signature,
              doctorName,
              paymentTransactions,
            };
          })
        );

        setBills(billDataList);
        if (billDataList.length > 0) setPatientName(billDataList[0].patientName);

        const totTotal = billDataList.reduce((s, b) => s + b.total, 0);
        const totPaid = billDataList.reduce((s, b) => s + b.amountPaid, 0);
        const totBalance = billDataList.reduce((s, b) => s + b.balance, 0);
        setOverallTotal(totTotal);
        setOverallPaid(totPaid);
        setOverallBalance(totBalance);
      } catch (err) {
        console.error('Error fetching bills:', err);
        setError(err instanceof Error ? err.message : 'Failed to load bills');
      } finally {
        setLoading(false);
      }
    };

    fetchBills();
  }, [billIdsParam]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bills...</p>
        </div>
      </div>
    );
  }

  if (error || bills.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error || 'No bills found'}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-after: always; }
        }
      `}</style>

      {/* Overall Summary — no-print */}
      <div className="no-print max-w-3xl mx-auto mt-6 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h2 className="text-lg font-bold text-blue-800 mb-3">
          Statement for {patientName} — {bills.length} Bill{bills.length > 1 ? 's' : ''}
        </h2>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div className="bg-white rounded p-3 border">
            <div className="text-xs text-gray-500">Total Billed</div>
            <div className="font-bold text-lg">₹{overallTotal.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-white rounded p-3 border">
            <div className="text-xs text-gray-500">Total Paid</div>
            <div className="font-bold text-lg text-green-600">₹{overallPaid.toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-white rounded p-3 border">
            <div className="text-xs text-gray-500">Balance Due</div>
            <div className={`font-bold text-lg ${overallBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              ₹{overallBalance.toLocaleString('en-IN')}
            </div>
          </div>
        </div>
        <button
          onClick={() => window.print()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
        >
          Print All Bills
        </button>
      </div>

      {/* Bills */}
      {bills.map((bill, index) => (
        <div key={index} className={index < bills.length - 1 ? 'page-break' : ''}>
          <PrintableBill
            {...bill}
            signature={bill.signature}
            doctorName={bill.doctorName}
            paymentTransactions={bill.paymentTransactions}
            showPrintButton={false}
          />
        </div>
      ))}

      <div className="no-print flex justify-center mt-6 mb-8">
        <button
          onClick={() => window.print()}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg"
        >
          Print All Bills
        </button>
      </div>
    </>
  );
}

export default function StatementPage() {
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
      <StatementContent />
    </Suspense>
  );
}
