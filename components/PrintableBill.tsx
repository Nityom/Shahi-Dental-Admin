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
  date?: string;
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

  const formattedBillNumber = (billNumber || '').replace(/^KSD-INV/i, 'SDC-INV').replace(/^KSD-/i, 'SDC-');

  // If items > 5, split evenly across 2 pages so both pages look balanced & complete
  const isMultiPage = (items?.length || 0) > 5;
  const halfIndex = isMultiPage ? Math.ceil(items.length / 2) : (items?.length || 0);
  const page1Items = (items || []).slice(0, halfIndex);
  const page2Items = isMultiPage ? (items || []).slice(halfIndex) : [];

  const renderItemsTable = (itemList: BillItem[]) => (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-t-2 border-b-2 border-gray-800 bg-gray-50/50">
          <th className="text-left py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800">ITEMS/SERVICES</th>
          <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-24">DATE</th>
          <th className="text-center py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-20">QTY</th>
          <th className="text-right py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-24">RATE</th>
          <th className="text-right py-2 px-2 text-xs font-bold uppercase tracking-wider text-gray-800 w-28">AMOUNT</th>
        </tr>
      </thead>
      <tbody>
        {itemList.map((item, index) => (
          <tr key={item.id || index} className="border-b border-gray-200">
            <td className="py-2 px-2 text-sm font-medium text-gray-900">{item.description}</td>
            <td className="py-2 px-2 text-xs text-center text-gray-600">
              {item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-'}
            </td>
            <td className="py-2 px-2 text-xs text-center text-gray-800 font-medium">
              {item.quantity} {item.unit || (item.itemType === 'medicine' ? 'PCS' : 'EACH')}
            </td>
            <td className="py-2 px-2 text-sm text-right text-gray-800">₹{item.unitPrice.toLocaleString('en-IN')}</td>
            <td className="py-2 px-2 text-sm text-right font-semibold text-gray-900">₹{item.total.toLocaleString('en-IN')}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderTotalsAndSignature = () => (
    <div className="bill-footer-section mt-4 pt-2">
      {/* Totals Section */}
      <div className="flex justify-between items-start gap-4 mb-4">
        <div className="w-1/2 pt-1">
          <div className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-1">TERMS AND CONDITIONS</div>
          <div className="text-[11px] text-gray-600 leading-relaxed">{termsAndConditions}</div>
        </div>

        <div className="w-5/12">
          <div className="border-t-2 border-gray-800 pt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-gray-700">SUBTOTAL</span>
              <span className="font-semibold text-gray-900">{formatCurrency(subtotal)}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-xs text-red-600">
                <span>Discount</span>
                <span>- {formatCurrency(discount)}</span>
              </div>
            )}

            <div className="flex justify-between border-t border-gray-300 pt-1.5 text-sm font-bold text-gray-900">
              <span>Total Amount</span>
              <span>{formatCurrency(total)}</span>
            </div>

            {paymentTransactions.length > 0 ? (
              paymentTransactions.map((txn, i) => (
                <div key={i} className="flex justify-between text-xs text-gray-600">
                  <span>
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
                  <span className="font-medium text-gray-800">{formatCurrency(txn.amount)}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-xs text-gray-700">
                <span>Received Amount</span>
                <span>{formatCurrency(amountPaid)}</span>
              </div>
            )}

            <div className="flex justify-between border-t-2 border-gray-800 pt-1.5 text-sm font-bold">
              <span className="text-gray-900">Balance</span>
              <span className={balance > 0 ? 'text-red-600' : 'text-emerald-700'}>{formatCurrency(balance)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Amount in Words */}
      <div className="mb-4 border-t border-gray-300 pt-2 bg-gray-50/50 p-2 rounded">
        <div className="text-xs">
          <span className="font-bold text-gray-800">Total Amount (in words): </span>
          <span className="text-gray-700 italic">{numberToWords(total)}</span>
        </div>
      </div>

      {/* Signature Section */}
      <div className="mt-4 pt-2">
        <div className="flex justify-end">
          <div className="text-center min-w-[180px]">
            <div className="mb-1 h-14 flex items-center justify-center">
              <img
                src={`/${signature}`}
                alt="Signature"
                className="max-h-12 w-auto object-contain"
              />
            </div>
            <div className="border-t border-gray-800 pt-1 text-xs font-semibold text-gray-900">
              <div>{doctorName}</div>
              <div className="text-[11px] text-gray-600 font-normal">Shahi Dental Clinic</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderHeader = () => (
    <>
      {/* Header Section */}
      <div className="pb-3 mb-3 border-b border-gray-300">
        <div className="flex justify-between items-start">
          <div className="text-left">
            <div className="text-xs text-gray-600 mb-1">BILL OF SUPPLY</div>
            <div className="text-xs border border-gray-400 px-2 py-0.5 inline-block font-medium">
              ORIGINAL FOR RECIPIENT
            </div>
          </div>
        </div>

        <div className="mt-2 text-center">
          <div className="flex items-center justify-center mb-2">
            <img
              src="/dental_logo.webp"
              alt="Shahi Dental Logo"
              className="h-14 mr-3 logo-print object-contain"
            />
          </div>
          <p className="text-xs text-gray-800 font-medium">
            Juran Chhapra Main Rd, in front of Road Number 2, Juran Chapra, Brahmapura, Muzaffarpur, Bihar 842001
          </p>
          <p className="text-xs text-gray-700 mt-0.5">Mobile: 9525048993 &nbsp;|&nbsp; Reg. No. 7329/A</p>
        </div>
      </div>

      {/* Invoice Info Section */}
      <div className="pb-2 mb-3">
        <div className="flex justify-between items-center mb-2">
          <div>
            <span className="text-sm font-semibold text-gray-800">Invoice No.: </span>
            <span className="text-sm font-bold text-gray-900">{formattedBillNumber}</span>
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-800">Invoice Date: </span>
            <span className="text-sm font-medium">{billDate}</span>
          </div>
        </div>

        {/* Bill To Section */}
        <div className="bg-white p-3 rounded border border-gray-300">
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">BILL TO</div>
          <div className="text-sm">
            <div className="font-bold text-gray-900">{patientName}</div>
            {patientPhone && <div className="text-xs text-gray-600">Mobile: {patientPhone}</div>}
            {(patientAge || patientSex) && (
              <div className="text-xs text-gray-600">
                {patientAge && `Age: ${patientAge}`}
                {patientAge && patientSex && ' | '}
                {patientSex && `Gender: ${patientSex}`}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-white py-4 px-2 sm:px-4 text-gray-900">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm 10mm 12mm;
          }

          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            width: 100% !important;
          }

          .no-print {
            display: none !important;
          }

          .printable-page {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            min-height: 265mm !important;
          }

          .page-break-after {
            page-break-after: always !important;
            break-after: page !important;
          }

          table {
            width: 100% !important;
          }

          .logo-print {
            filter: brightness(1.05) !important;
          }
        }

        @media screen {
          body {
            background: #ffffff !important;
          }

          .printable-page {
            background: #ffffff;
            border: 1px solid #e5e7eb;
            margin: 0 auto 28px auto;
            max-width: 210mm;
            width: 100%;
            padding: 10mm 14mm;
            min-height: 275mm;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
        }
      `}</style>

      {!isMultiPage ? (
        /* SINGLE PAGE BILL */
        <div className="printable-page bg-white">
          <div>
            {renderHeader()}

            {/* Items Table */}
            <div className="mb-4">
              {renderItemsTable(page1Items)}
            </div>

            {/* Totals + Words + Signature */}
            {renderTotalsAndSignature()}
          </div>

          <div className="mt-auto pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex justify-between">
            <span>Valid system-generated tax invoice / bill of supply</span>
            <span>Page 1 of 1</span>
          </div>
        </div>
      ) : (
        /* BALANCED MULTI-PAGE BILL */
        <>
          {/* PAGE 1 */}
          <div className="printable-page bg-white page-break-after">
            <div>
              {renderHeader()}

              {/* Table with First Half of Items */}
              <div className="mb-4">
                {renderItemsTable(page1Items)}
              </div>
            </div>

            {/* Bottom Continuation Banner */}
            <div className="mt-auto pt-3 border-t border-gray-300 text-xs text-gray-600 flex justify-between items-center">
              <span className="font-semibold text-blue-700 italic">Continued on Page 2...</span>
              <span>Page 1 of 2</span>
            </div>
          </div>

          {/* PAGE 2 */}
          <div className="printable-page bg-white">
            <div>
              {/* Exact Same Full Header as Page 1 */}
              {renderHeader()}

              {/* Table with Second Half of Items */}
              <div className="mb-4">
                {renderItemsTable(page2Items)}
              </div>

              {/* Totals + Words + Signature */}
              {renderTotalsAndSignature()}
            </div>

            {/* Bottom Page 2 Footer */}
            <div className="mt-auto pt-3 border-t border-gray-300 text-[10px] text-gray-500 flex justify-between">
              <span>Valid system-generated tax invoice / bill of supply</span>
              <span>Page 2 of 2</span>
            </div>
          </div>
        </>
      )}

      {showPrintButton && (
        <div className="no-print flex justify-center mt-6 mb-4">
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-md transition-colors"
          >
            Print Bill
          </button>
        </div>
      )}
    </div>
  );
};

export default PrintableBill;
