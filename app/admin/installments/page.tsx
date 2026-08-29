'use client';

import { useState, useEffect, useMemo } from 'react';
import { billService, Bill } from '@/services/bills';
import { BillHistoryWithPayments } from '@/components/BillHistoryWithPayments';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function InstallmentsPage() {
  const [pendingBills, setPendingBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchPendingBills();
  }, []);

  const fetchPendingBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const allBills = await billService.getAll();
      
      // Debug: Check if patient info is coming through
      console.log('First bill sample:', allBills[0]);
      
      // Filter bills with pending or partial payments
      const pending = allBills.filter(
        (bill: Bill) => bill.payment_status === 'PARTIAL' || bill.payment_status === 'PENDING'
      );
      
      setPendingBills(pending);
    } catch (error) {
      console.error('Error fetching pending bills:', error);
      setError('Failed to load pending bills. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalPending = pendingBills.reduce((sum, bill) => sum + (Number(bill.balance_amount) || 0), 0);
  const totalCollected = pendingBills.reduce((sum, bill) => sum + (Number(bill.paid_amount) || 0), 0);
  const totalAmount = pendingBills.reduce((sum, bill) => sum + (Number(bill.total_amount) || 0), 0);

  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'EXTRACTION' | 'OTHER'>('ALL');

  const isExtractionBill = (bill: Bill) => {
    if (!bill.items || !Array.isArray(bill.items)) return false;
    return bill.items.some((item: any) => {
      const desc = (item.description || '').toLowerCase();
      return desc.includes('extraction') || desc.includes('tooth removal') || desc.includes('impaction') || desc.includes('surgical') || desc.includes('park');
    });
  };

  // Filter bills based on search query and category
  const filteredBills = useMemo(() => {
    let list = pendingBills;

    if (categoryFilter === 'EXTRACTION') {
      list = list.filter(isExtractionBill);
    } else if (categoryFilter === 'OTHER') {
      list = list.filter((b) => !isExtractionBill(b));
    }

    if (!searchQuery.trim()) {
      return list;
    }

    const query = searchQuery.toLowerCase();
    return list.filter((bill) => {
      const patientName = (bill.patient_name || '').toLowerCase();
      const phoneNumber = (bill.phone_number || '').toLowerCase();
      const billNumber = (bill.bill_number || '').toLowerCase();
      const referenceNumber = (bill.reference_number || '').toLowerCase();
      const billId = (bill.id || '').toLowerCase();

      return (
        patientName.includes(query) ||
        phoneNumber.includes(query) ||
        billNumber.includes(query) ||
        referenceNumber.includes(query) ||
        billId.includes(query)
      );
    });
  }, [pendingBills, searchQuery, categoryFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading pending payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-6 pt-6 pb-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Installments & Dues</h1>
          <p className="text-gray-600">
            Track all pending payments, installments, and print extraction/surgical dues statements
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              categoryFilter === 'ALL' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            All Pending Bills ({pendingBills.length})
          </button>
          <button
            onClick={() => setCategoryFilter('EXTRACTION')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              categoryFilter === 'EXTRACTION' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Extraction & Surgical Dues ({pendingBills.filter(isExtractionBill).length})
          </button>
          <button
            onClick={() => setCategoryFilter('OTHER')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
              categoryFilter === 'OTHER' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Other Treatments ({pendingBills.filter((b) => !isExtractionBill(b)).length})
          </button>
        </div>

        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by patient, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-3 text-sm h-9"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Bills</CardDescription>
            <CardTitle className="text-3xl text-orange-600">{pendingBills.length}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Total bills with balance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Amount</CardDescription>
            <CardTitle className="text-3xl text-blue-600">₹{totalAmount.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Sum of all pending bills</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Collected</CardDescription>
            <CardTitle className="text-3xl text-green-600">₹{totalCollected.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Payments received so far</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Pending</CardDescription>
            <CardTitle className="text-3xl text-red-600">₹{totalPending.toLocaleString()}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Outstanding balance</p>
          </CardContent>
        </Card>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Bills List with Payment History */}
      <div className="space-y-6">
        {filteredBills.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={searchQuery ? "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"}
                  />
                </svg>
                <h3 className="mt-2 text-xl font-semibold text-gray-900">
                  {searchQuery ? 'No matching bills found' : 'No pending payments!'}
                </h3>
                <p className="mt-1 text-gray-500">
                  {searchQuery 
                    ? `No bills match "${searchQuery}". Try a different search term.`
                    : 'All bills are fully paid. Great job! 🎉'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Pending Bills ({filteredBills.length})
              </h2>
              
              {/* Quick Overview Table */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Overview</CardTitle>
                  <CardDescription>Summary of all pending payments</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2 font-semibold">Patient</th>
                          <th className="text-left p-2 font-semibold">Phone</th>
                          <th className="text-right p-2 font-semibold">Total</th>
                          <th className="text-right p-2 font-semibold">Paid</th>
                          <th className="text-right p-2 font-semibold">Balance</th>
                          <th className="text-center p-2 font-semibold">Status</th>
                          <th className="text-center p-2 font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBills.map((bill) => (
                          <tr key={bill.id} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{bill.patient_name || 'N/A'}</td>
                            <td className="p-2 text-gray-600">{bill.phone_number || 'N/A'}</td>
                            <td className="p-2 text-right">₹{Number(bill.total_amount).toLocaleString()}</td>
                            <td className="p-2 text-right text-green-600">₹{Number(bill.paid_amount).toLocaleString()}</td>
                            <td className="p-2 text-right text-orange-600 font-semibold">₹{(Number(bill.balance_amount) || 0).toLocaleString()}</td>
                            <td className="p-2 text-center">
                              <span className={`px-2 py-1 text-xs font-semibold rounded ${
                                bill.payment_status === 'PAID' 
                                  ? 'bg-green-100 text-green-700' 
                                  : bill.payment_status === 'PARTIAL' 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-red-100 text-red-700'
                              }`}>
                                {bill.payment_status}
                              </span>
                            </td>
                            <td className="p-2 text-center">
                              <button
                                onClick={() => window.open(`/print-dues?billId=${bill.id}`, '_blank')}
                                className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded transition"
                                title="Print Dues Slip"
                              >
                                Print Dues
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <p className="text-sm text-gray-600 mb-4">
                Click "View Payment History" to see all transactions and add new payments
              </p>
            </div>
            
            <BillHistoryWithPayments 
              bills={filteredBills}
              onBillUpdated={fetchPendingBills}
            />
          </>
        )}
      </div>
    </div>
  );
}
