'use client';

import React, { useEffect, useState } from 'react';

interface BillItem {
  id?: number;
  description: string;
  quantity: number;
  unitPrice: number;
  unit?: string;
  total: number;
  itemType?: 'medicine' | 'procedure' | 'consultation' | 'other';
}

interface PaymentTransaction {
  amount: number;
  payment_date: string;
  payment_method?: string;
}

interface PrintableBillProps {
  billNumber: string;
  billDate: string;
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
  paymentTransactions?: PaymentTransaction[];
  doctorName?: string;
}

const PrintableBill: React.FC<PrintableBillProps> = ({
  billNumber,
  billDate,
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
  termsAndConditions = 'All disputes are subject to Muzaffarpur jurisdiction only',
  showPrintButton = true,
  signature = 'sign.png',
  doctorName = 'Dr. Kautilya Swaroop',
  paymentTransactions = [],
}) => {
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
    if (paise > 0) {
      words += ' and ' + convertIndianNumbering(paise) + ' Paise';
    }
    return words + ' Only';
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-bill-container,
          .printable-bill-container * {
            visibility: visible;
          }
          .printable-bill-container {
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
          .page-break {
            page-break-after: always;
          }
          .print-border {
            border-color: #f3f4f6 !important;
          }
          .ks-grey {
            color: #6B7280 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .clinic-blue {
            color: #1E63D5 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .logo-print {
            filter: brightness(1.2) !important;
          }
        }

        @page {
          size: A4;
          margin: 15mm;
        }

        .print-preview {
          background: white;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
          margin: 20px auto;
          max-width: 210mm;
          padding: 20mm;
        }
      `}</style>

      <div className="printable-bill-container print-preview">
        {/* Header Section */}
        <div className="pb-4 mb-4">
          <div className="flex justify-between items-start">
            <div className="text-left">
              <div className="text-xs text-gray-600 mb-2">BILL OF SUPPLY</div>
              <div className="text-xs border border-gray-300 px-2 py-1 inline-block">
                ORIGINAL FOR RECIPIENT
              </div>
            </div>
            
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center mb-3">
              <img 
                src="/dental_logo.svg" 
                alt="KS Dental Logo" 
                className="h-16 w-16 mr-3 logo-print"
              />
              <h1 className="text-4xl font-bold">
                <span className="ks-grey" style={{color: '#6B7280'}}>KS</span>
                <span className="clinic-blue" style={{color: '#1E63D5'}}> Dental & Aesthetic Clinic</span>
              </h1>
            </div>
            <p className="text-xs text-gray-700">
             Kalambagh road, Lenin Chowk, Muzaffarpur, Bihar 842001, India 
            </p>
            <p className="text-xs text-gray-700 mt-1">Mobile: 9525048993 &nbsp;|&nbsp; Reg. No. 7329/A</p>
          </div>
          <div className="mt-4 border-t border-gray-200 print-border"></div>
        </div>

        {/* Invoice Info Section */}
        <div className="pb-3 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-sm font-semibold">Invoice No.: </span>
              <span className="text-sm">{billNumber}</span>
            </div>
            <div>
              <span className="text-sm font-semibold">Invoice Date: </span>
              <span className="text-sm">{billDate}</span>
            </div>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="mb-4">
          <div className="text-sm font-semibold mb-1">BILL TO</div>
          <div className="text-sm">
            <div className="font-semibold">{patientName}</div>
            {patientPhone && <div className="text-gray-600">Mobile: {patientPhone}</div>}
            {(patientAge || patientSex) && (
              <div className="text-gray-600">
                {patientAge && `Age: ${patientAge}`}
                {patientAge && patientSex && ' | '}
                {patientSex && `Gender: ${patientSex}`}
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-6">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-t-2 border-b-2 border-gray-800">
                <th className="text-left py-2 px-2 text-sm font-semibold">ITEMS/SERVICES</th>
                <th className="text-center py-2 px-2 text-sm font-semibold w-24">QTY</th>
                <th className="text-right py-2 px-2 text-sm font-semibold w-28">RATE</th>
                <th className="text-right py-2 px-2 text-sm font-semibold w-32">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id || index} className="border-b border-gray-300">
                  <td className="py-2 px-2 text-sm">{item.description}</td>
                  <td className="py-2 px-2 text-sm text-center">
                    {item.quantity} {item.unit || (item.itemType === 'medicine' ? 'PCS' : 'EACH')}
                  </td>
                  <td className="py-2 px-2 text-sm text-right">{item.unitPrice.toLocaleString('en-IN')}</td>
                  <td className="py-2 px-2 text-sm text-right">{item.total.toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-between mb-6">
          <div className="w-1/2">
            <div className="text-sm font-semibold mb-2">TERMS AND CONDITIONS</div>
            <div className="text-xs text-gray-700">{termsAndConditions}</div>
          </div>

          <div className="w-5/12">
            <div className="border-t-2 border-gray-800 pt-2">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-semibold">SUBTOTAL</span>
                <span className="text-sm font-semibold">{formatCurrency(subtotal)}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Discount</span>
                  <span className="text-sm">- {formatCurrency(discount)}</span>
                </div>
              )}

              <div className="flex justify-between mb-2 border-t border-gray-400 pt-2">
                <span className="text-sm font-bold">Total Amount</span>
                <span className="text-sm font-bold">{formatCurrency(total)}</span>
              </div>

              {paymentTransactions.length > 0 ? (
                paymentTransactions.map((txn, i) => (
                  <div key={i} className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">
                      Received on {(() => {
                        const d = new Date(txn.payment_date);
                        if (isNaN(d.getTime())) return txn.payment_date;
                        const dd = String(d.getDate()).padStart(2, '0');
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const yy = String(d.getFullYear()).slice(-2);
                        return `${dd}-${mm}-${yy}`;
                      })()}
                      {txn.payment_method ? ` (${txn.payment_method})` : ''}
                    </span>
                    <span className="text-sm">{formatCurrency(txn.amount)}</span>
                  </div>
                ))
              ) : (
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Received Amount</span>
                  <span className="text-sm">{formatCurrency(amountPaid)}</span>
                </div>
              )}

              <div className="flex justify-between border-t-2 border-gray-800 pt-2">
                <span className="text-sm font-bold">Balance</span>
                <span className="text-sm font-bold">{formatCurrency(balance)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Amount in Words */}
        <div className="mb-8 border-t border-gray-300 pt-3">
          <div className="text-sm">
            <span className="font-semibold">Total Amount (in words): </span>
            <span>{numberToWords(total)}</span>
          </div>
        </div>

        {/* Signature Section */}
        <div className="mt-12 pt-8">
          <div className="flex justify-end">
            <div className="text-center">
              <div className="mb-4 h-20 flex items-center justify-center">
                <img 
                  src={`/${signature}`} 
                  alt="Signature" 
                  className="max-h-16 w-auto object-contain"
                />
              </div>
              <div className="border-t border-gray-800 pt-2 text-sm font-semibold">
                <div>{doctorName}</div>
                <div>KS Dental & Aesthetic Clinic</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPrintButton && (
        <div className="no-print flex justify-center mt-6 mb-4">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition-colors"
          >
            Print Bill
          </button>
        </div>
      )}
    </>
  );
};

export default PrintableBill;
