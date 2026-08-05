"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { paymentTransactionService, PaymentTransaction } from "@/services/payment-transactions";
import { Plus, Trash2 } from "lucide-react";
import { useIsAdmin } from "@/hooks/use-is-admin";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaymentHistoryProps {
  billId: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  onPaymentAdded?: () => void;
  onAddPaymentClick?: () => void;
}

export default function PaymentHistory({
  billId,
  totalAmount,
  paidAmount,
  balanceAmount,
  onPaymentAdded,
  onAddPaymentClick,
}: PaymentHistoryProps) {
  const safeBalanceAmount = Number(balanceAmount) || 0;
  const [payments, setPayments] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const { isAdmin } = useIsAdmin();

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const data = await paymentTransactionService.getByBillId(billId);
      setPayments(data);
    } catch (error) {
      console.error("Error fetching payments:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (billId) {
      fetchPayments();
    }
  }, [billId]);

  const handleDelete = async () => {
    if (!paymentToDelete) return;

    try {
      await paymentTransactionService.delete(paymentToDelete);
      await fetchPayments();
      if (onPaymentAdded) {
        onPaymentAdded();
      }
    } catch (error) {
      console.error("Error deleting payment:", error);
      alert("Failed to delete payment");
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const confirmDelete = (paymentId: string) => {
    setPaymentToDelete(paymentId);
    setDeleteDialogOpen(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Track all payments made for this bill</CardDescription>
            </div>
            {safeBalanceAmount > 0 && (
              <Button onClick={onAddPaymentClick} size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Payment Summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 rounded-lg border p-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(paidAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className="text-2xl font-bold text-orange-600">{formatCurrency(safeBalanceAmount)}</p>
            </div>
          </div>

          {/* Payment Transactions */}
          <div className="space-y-3">
            <h3 className="font-semibold">Transactions ({payments.length})</h3>
            
            {loading ? (
              <p className="text-center text-sm text-muted-foreground">Loading payments...</p>
            ) : payments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">No payments recorded yet</p>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold">{formatCurrency(Number(payment.amount))}</p>
                        <span className="text-xs text-muted-foreground">•</span>
                        <p className="text-sm text-muted-foreground">{payment.payment_method}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(payment.payment_date)}
                        {payment.notes && ` • ${payment.notes}`}
                      </p>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => confirmDelete(payment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the payment record and update the bill balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
