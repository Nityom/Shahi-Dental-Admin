'use client';

import React, { useEffect, useState } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';

interface BillItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  total: number;
  itemType?: string;
  date?: string;
}

interface PaymentTransaction {
  amount: number;
  payment_date: string;
  payment_method?: string;
  notes?: string;
}

export interface PrintableExtractionDuesProps {
  billNumber: string;
  billDate: string;
  referenceNumber?: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: string;
  patientSex?: string;
  items: BillItem[];
  subtotal: number;
  discount?: number;
  total: number;
  amountPaid?: number;
  balance?: number;
  termsAndConditions?: string;
  showPrintButton?: boolean;
  signature?: string;
  doctorName?: string;
  paymentTransactions?: PaymentTransaction[];
  clinicalNotes?: string;
}

export const PrintableExtractionDues: React.FC<PrintableExtractionDuesProps> = ({
  billNumber,
  billDate,
  referenceNumber,
  patientName,
  patientPhone,
  patientAge,
  patientSex,
  items,
  subtotal,
  discount = 0,
  total,
  amountPaid = 0,
  balance = 0,
  termsAndConditions = '1. Post-extraction instructions must be followed strictly for 24-48 hours. 2. Remaining balance must be settled during the follow-up/review appointment.',
  showPrintButton = true,
  signature = 'sign.png',
  doctorName = 'Dr. Kautilya Swaroop',
  paymentTransactions = [],
  clinicalNotes,
}) => {
  const getSignatureSrc = (sig?: string) => {
    if (!sig) return '/sign.png';
    if (sig.startsWith('data:') || sig.startsWith('http://') || sig.startsWith('https://')) {
      return sig;
    }
    return `/${sig.replace(/^\//, '')}`;
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const formatCurrency = (amount: number) => {
    return `₹ ${Math.round(amount).toLocaleString('en-IN')}`;
  };

  const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '');
      return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + convertLessThanThousand(n % 100) : '');
    };

    const convertIndianNumbering = (n: number): string => {
      if (n === 0) return 'Zero';
      const crore = Math.floor(n / 10000000);
      const lakh = Math.floor((n % 10000000) / 100000);
      const thousand = Math.floor((n % 100000) / 1000);
      const remainder = n % 1000;

      let result = '';
      if (crore > 0) result += convertLessThanThousand(crore) + ' Crore ';
      if (lakh > 0) result += convertLessThanThousand(lakh) + ' Lakh ';
      if (thousand > 0) result += convertLessThanThousand(thousand) + ' Thousand ';
      if (remainder > 0) result += convertLessThanThousand(remainder);
      return result.trim();
    };

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);
    let words = convertIndianNumbering(rupees) + ' Rupees';
    if (paise > 0) words += ' and ' + convertIndianNumbering(paise) + ' Paise';
    return words + ' Only';
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-dues-container,
          .printable-dues-container * {
            visibility: visible;
          }
          .printable-dues-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          .print-border {
            border-color: #e5e7eb !important;
          }
        }

        @page {
          size: A4;
          margin: 12mm;
        }

        .print-preview {
          background: white;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          margin: 20px auto;
          max-width: 210mm;
          padding: 16mm;
          border-radius: 8px;
        }
      `}</style>

      <div className="printable-dues-container print-preview font-sans text-gray-900">
        {/* Floating / Top Print Bar */}
        {showPrintButton && (
          <div className="no-print mb-6 flex items-center justify-between bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </button>
            <div className="flex items-center gap-3">
              <span className="text-xs text-blue-700 font-medium">Ready for high-resolution print</span>
              <button
                onClick={handlePrint}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md shadow transition"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Dues Report
              </button>
            </div>
          </div>
        )}

        {/* Clinic Header */}
        <div className="border-b-2 border-gray-900 pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-2.5 py-1 rounded tracking-wider uppercase">
                Extraction & Surgical Dues Statement
              </span>
              {referenceNumber && (
                <div className="text-xs text-gray-600 mt-2 font-mono">
                  Ref No: <span className="font-semibold text-gray-900">{referenceNumber}</span>
                </div>
              )}
            </div>
            <div className="text-right text-xs text-gray-600">
              <div>Bill/Receipt No: <strong className="text-gray-900 font-mono">{billNumber}</strong></div>
              <div>Date: <strong className="text-gray-900">{billDate}</strong></div>
            </div>
          </div>

          <div className="mt-4 text-center">
            <div className="flex items-center justify-center mb-1">
              <img
                src="/dental_logo.webp"
                alt="Shahi Dental Logo"
                className="h-14 mr-3 object-contain"
              />
            </div>
            <p className="text-xs text-gray-700 font-medium">
              Juran Chhapra Main Rd, in front of Road Number 2, Juran Chapra, Brahmapura, Muzaffarpur, Bihar 842001
            </p>
            <p className="text-xs text-gray-600 mt-0.5">Mobile: 9525048993 &nbsp;|&nbsp; Reg. No. 7329/A</p>
          </div>
        </div>

        {/* Patient Details Card */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3.5 mb-5">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Patient Details</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <div className="text-xs text-gray-500">Patient Name</div>
              <div className="font-bold text-gray-900">{patientName}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Phone Number</div>
              <div className="font-semibold text-gray-800">{patientPhone || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Age / Gender</div>
              <div className="font-semibold text-gray-800">
                {patientAge ? `${patientAge} Yrs` : ''} {patientSex ? `/ ${patientSex}` : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Attending Doctor</div>
              <div className="font-semibold text-blue-700">{doctorName}</div>
            </div>
          </div>
        </div>

        {/* Treatment & Extraction Details Table */}
        <div className="mb-5">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Treatment / Extraction Details & Charges
          </div>
          <table className="w-full border-collapse border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300 text-xs font-bold text-gray-700 uppercase">
                <th className="py-2.5 px-3 text-left w-12">#</th>
                <th className="py-2.5 px-3 text-left">Treatment / Procedure Description</th>
                <th className="py-2.5 px-3 text-center w-24">Date</th>
                <th className="py-2.5 px-3 text-center w-16">Qty</th>
                <th className="py-2.5 px-3 text-right w-24">Rate</th>
                <th className="py-2.5 px-3 text-right w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items && items.length > 0 ? (
                items.map((item, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-500 text-center">{index + 1}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-gray-900">{item.description}</div>
                      {item.itemType && item.itemType !== 'other' && (
                        <span className="inline-block text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">
                          {item.itemType}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-xs text-gray-600">{item.date || billDate}</td>
                    <td className="py-2.5 px-3 text-center text-gray-800">{item.quantity}</td>
                    <td className="py-2.5 px-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-500 text-sm">
                    No itemized procedures recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Financial Summary & Dues Callout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
          {/* Payment History Log */}
          <div className="border border-gray-200 rounded-lg p-3">
            <div className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Payment Installments Log
            </div>
            {paymentTransactions && paymentTransactions.length > 0 ? (
              <div className="space-y-1.5">
                {paymentTransactions.map((tx, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 p-1.5 rounded">
                    <div>
                      <span className="font-semibold text-gray-800">{formatCurrency(tx.amount)}</span>
                      <span className="text-gray-500 ml-1.5">via {tx.payment_method || 'Cash'}</span>
                    </div>
                    <div className="text-gray-500">{tx.payment_date}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500 italic py-2">
                {amountPaid > 0 ? `Total received so far: ${formatCurrency(amountPaid)}` : 'No prior installments received'}
              </div>
            )}
            {clinicalNotes && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="text-[11px] font-bold text-gray-500 uppercase">Notes</div>
                <p className="text-xs text-gray-700">{clinicalNotes}</p>
              </div>
            )}
          </div>

          {/* Dues & Balance Card */}
          <div className="bg-gradient-to-br from-gray-50 to-red-50 border-2 border-red-200 rounded-lg p-4 flex flex-col justify-between">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Total Treatment Fee:</span>
                <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700">
                  <span>Concession / Discount:</span>
                  <span className="font-medium">- {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Net Total:</span>
                <span className="font-semibold text-gray-900">{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 border-t border-gray-200 pt-1">
                <span>Total Amount Paid:</span>
                <span className="font-bold">{formatCurrency(amountPaid)}</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t-2 border-red-300">
              <div className="flex justify-between items-baseline">
                <span className="text-xs uppercase font-extrabold tracking-wider text-red-800">
                  Remaining Dues / Balance:
                </span>
                <span className="text-2xl font-black text-red-600">
                  {formatCurrency(balance)}
                </span>
              </div>
              <div className="text-[11px] font-medium text-gray-700 mt-1 italic text-right">
                Amount in Words: {numberToWords(balance)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer & Signature Section */}
        <div className="pt-4 border-t border-gray-300 text-xs">
          <div className="grid grid-cols-2 gap-6 items-end">
            <div>
              <div className="font-bold text-gray-800 mb-1">Instructions & Terms:</div>
              <p className="text-[11px] text-gray-600 leading-relaxed">{termsAndConditions}</p>
            </div>
            <div className="text-right">
              <div className="inline-block text-center min-w-[140px]">
                {signature && (
                  <img
                    src={getSignatureSrc(signature)}
                    alt="Doctor Signature"
                    className="h-10 mx-auto object-contain mb-1"
                  />
                )}
                <div className="border-t border-gray-800 pt-1 font-bold text-gray-900">
                  {doctorName}
                </div>
                <div className="text-[10px] text-gray-500">Authorized Signature & Seal</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintableExtractionDues;
