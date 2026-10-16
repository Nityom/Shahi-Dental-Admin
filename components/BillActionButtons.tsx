'use client';

import React from 'react';
import { Button } from "@/components/ui/button";

interface BillActionButtonsProps {
  billId: string;
  onDownload?: () => void;
  onPrint?: () => void;
}

export const BillActionButtons: React.FC<BillActionButtonsProps> = ({
  billId,
  onDownload,
  onPrint
}) => {
  const generateBillPDF = async () => {
    try {
      // Open in new tab
      window.open(`/api/generate-bill?billId=${billId}`, '_blank');
    } catch (error) {
      console.error('Error generating bill PDF:', error);
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else {
      const link = document.createElement('a');
      link.href = `/api/generate-bill?billId=${billId}&download=true`;
      link.download = `bill-${billId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      const printWindow = window.open(`/api/generate-bill?billId=${billId}`, '_blank');
      printWindow?.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handlePrintableBill = () => {
    window.open(`/print-bill?billId=${billId}`, '_blank');
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <Button
        onClick={handlePrintableBill}
        className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Print Bill
      </Button>
      
      <Button
        onClick={handleDownload}
        className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
          />
        </svg>
        Download Bill
      </Button>

      <Button
        onClick={handlePrint}
        className="bg-blue-400 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded flex items-center gap-2"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
          />
        </svg>
        Print Bill
      </Button>
    </div>
  );
};

export default BillActionButtons;
