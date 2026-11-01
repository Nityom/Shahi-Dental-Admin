"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { paymentTransactionService, CreatePaymentData } from "@/services/payment-transactions";
import { billService, Bill } from "@/services/bills";

interface AddPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  patientId: string;
  balanceAmount: number;
  onPaymentAdded: () => void;
  bill?: Bill;
  items?: any[];
}

export default function AddPaymentDialog({
  open,
  onOpenChange,
  billId,
  patientId,
  balanceAmount,
  onPaymentAdded,
  bill,
  items,
}: AddPaymentDialogProps) {
  const safeBalanceAmount = Number(balanceAmount) || 0;
  const [formData, setFormData] = useState<CreatePaymentData>({
    bill_id: billId,
    patient_id: patientId,
    amount: safeBalanceAmount,
    payment_method: "Cash",
    payment_date: new Date().toISOString().split("T")[0],
    notes: "Full settlement of remaining dues",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [billItems, setBillItems] = useState<any[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string | number>>(new Set());
  const [isPayAll, setIsPayAll] = useState<boolean>(true);

  const initItems = useCallback((rawItems: any[]) => {
    const ensured = rawItems.map((it, idx) => ({
      ...it,
      id: it.id !== undefined && it.id !== null ? it.id : `item-${idx + 1}`,
    }));
    setBillItems(ensured);

    // Default to selecting all items or full balance
    const allIds = new Set<string | number>(ensured.map((i) => i.id));
    setSelectedItemIds(allIds);
    setIsPayAll(true);
    setFormData((prev) => ({
      ...prev,
      bill_id: billId,
      patient_id: patientId,
      amount: safeBalanceAmount,
      notes: "Full settlement of remaining dues",
    }));
  }, [billId, patientId, safeBalanceAmount]);

  // Load items when dialog opens
  useEffect(() => {
    if (!open) return;

    if (items && Array.isArray(items) && items.length > 0) {
      initItems(items);
    } else if (bill && Array.isArray(bill.items) && bill.items.length > 0) {
      initItems(bill.items);
    } else if (billId) {
      billService.getById(billId).then((fetchedBill) => {
        if (fetchedBill && Array.isArray(fetchedBill.items)) {
          initItems(fetchedBill.items);
        } else {
          setBillItems([]);
        }
      });
    }
  }, [open, billId, bill, items, initItems]);

  const toggleSelectAll = (checked: boolean) => {
    setIsPayAll(checked);
    if (checked) {
      const allIds = new Set(billItems.map((i) => i.id));
      setSelectedItemIds(allIds);
      setFormData((prev) => ({
        ...prev,
        amount: safeBalanceAmount,
        notes: "Full settlement of remaining dues",
      }));
    } else {
      setSelectedItemIds(new Set());
      setFormData((prev) => ({
        ...prev,
        amount: 0,
        notes: "",
      }));
    }
  };

  const toggleItem = (itemId: string | number) => {
    const next = new Set(selectedItemIds);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedItemIds(next);

    const isAll = billItems.length > 0 && billItems.every((i) => next.has(i.id));
    setIsPayAll(isAll);

    // Sum of selected items (capped at safeBalanceAmount)
    const selectedSum = billItems
      .filter((i) => next.has(i.id))
      .reduce((s, i) => s + (Number(i.total) || 0), 0);

    const cappedAmount = Math.min(selectedSum, safeBalanceAmount);
    const billDateStr = bill?.created_at ? formatDate(bill.created_at) : "";
    const selectedNames = billItems
      .filter((i) => next.has(i.id))
      .map((i) => {
        const d = i.date ? formatDate(i.date) : billDateStr;
        return d ? `${i.description} (${d})` : i.description;
      });

    setFormData((prev) => ({
      ...prev,
      amount: cappedAmount,
      notes: selectedNames.length > 0 ? `Payment for: ${selectedNames.join(", ")}` : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.amount <= 0) {
      setError("Payment amount must be greater than zero");
      return;
    }

    if (formData.amount > safeBalanceAmount) {
      setError(`Payment amount cannot exceed balance amount (₹${safeBalanceAmount.toFixed(2)})`);
      return;
    }

    try {
      setLoading(true);

      await paymentTransactionService.create({
        ...formData,
        bill_id: billId,
        patient_id: patientId,
        amount: Number(formData.amount),
      });

      // Update item paid status on the bill if possible
      if (billItems.length > 0) {
        try {
          const updatedItems = billItems.map((it) => ({
            ...it,
            is_paid: selectedItemIds.has(it.id) || it.is_paid,
          }));
          await billService.update(billId, {
            items: updatedItems,
          });
        } catch (itemErr) {
          console.warn("Could not update item paid status on bill:", itemErr);
        }
      }

      onPaymentAdded();
      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Error adding payment:", err);
      if (err instanceof Error) {
        setError(err.message || "Failed to add payment");
      } else {
        setError("Failed to add payment");
      }
    } finally {
      setLoading(false);
    }
  };

  // Item categories
  const consultationItems = billItems.filter(
    (i) => i.item_type === "consultation" || (i.description || "").toLowerCase().includes("consultation")
  );
  const xrayItems = billItems.filter(
    (i) =>
      !consultationItems.includes(i) &&
      (i.item_type === "xray" ||
        (i.description || "").toLowerCase().includes("iopar") ||
        (i.description || "").toLowerCase().includes("x-ray") ||
        (i.description || "").toLowerCase().includes("xray") ||
        (i.description || "").toLowerCase().includes("opg") ||
        (i.description || "").toLowerCase().includes("cbct"))
  );
  const medicineItems = billItems.filter((i) => i.item_type === "medicine");
  const procedureItems = billItems.filter(
    (i) =>
      !consultationItems.includes(i) &&
      !xrayItems.includes(i) &&
      !medicineItems.includes(i)
  );

  const formatDate = (dateString?: string | number) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return String(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const renderItemRow = (item: any, bgActive: string, borderActive: string, textActive: string, icon: string) => {
    const isChecked = selectedItemIds.has(item.id);
    const itemDateStr = item.date ? formatDate(item.date) : (bill?.created_at ? formatDate(bill.created_at) : "");

    return (
      <label
        key={item.id}
        className={`flex items-start justify-between p-2 rounded-lg border text-xs cursor-pointer select-none transition ${
          isChecked
            ? `${bgActive} ${borderActive} font-semibold ${textActive}`
            : "bg-white border-gray-200 hover:bg-gray-50 text-gray-800"
        }`}
      >
        <div className="flex items-start gap-2 min-w-0 pr-2">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => toggleItem(item.id)}
            className="mt-0.5 h-3.5 w-3.5 rounded border-gray-300 text-blue-600 cursor-pointer shrink-0"
          />
          <div className="truncate">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="truncate">{icon} {item.description}</span>
              {item.is_paid ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded">
                  PAID ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                  PENDING
                </span>
              )}
            </div>
            {itemDateStr && (
              <span className="block text-[11px] text-gray-500 font-mono mt-0.5">
                📅 {itemDateStr}
              </span>
            )}
          </div>
        </div>
        <span className="font-bold shrink-0">₹{Number(item.total).toLocaleString("en-IN")}</span>
      </label>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-gray-900">
            Record Installment Payment
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-600">
            Select which treatment or dues the customer is paying for. Outstanding Balance:{" "}
            <span className="font-bold text-rose-600">₹{safeBalanceAmount.toLocaleString("en-IN")}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {error}
            </div>
          )}

          {/* Treatment Selection with Checkboxes */}
          {billItems.length > 0 && (
            <div className="space-y-2.5">
              {/* Pay Full Balance Master Toggle */}
              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPayAll}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs sm:text-sm font-bold text-blue-900 block">
                      Pay Full Remaining Balance
                    </span>
                    <span className="text-[11px] text-blue-700">Clear all pending treatments & dues</span>
                  </div>
                </label>
                <span className="text-xs sm:text-sm font-bold text-blue-900">
                  ₹{safeBalanceAmount.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Or Select Treatment Customer is Paying For:
                </p>

                {/* Consultation */}
                {consultationItems.map((item) =>
                  renderItemRow(item, "bg-purple-50/50", "border-purple-300", "text-purple-950", "🩺")
                )}

                {/* X-Ray / Investigations */}
                {xrayItems.map((item) =>
                  renderItemRow(item, "bg-indigo-50/50", "border-indigo-300", "text-indigo-950", "🩻")
                )}

                {/* Treatment Done (Procedures) */}
                {procedureItems.map((item) =>
                  renderItemRow(item, "bg-emerald-50/50", "border-emerald-300", "text-emerald-950", "🦷")
                )}

                {/* Medicines */}
                {medicineItems.map((item) =>
                  renderItemRow(item, "bg-amber-50/50", "border-amber-300", "text-amber-950", "💊")
                )}
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <Label htmlFor="amount" className="text-xs font-bold text-gray-800">
                Installment Amount Customer is Paying *
              </Label>
              <span className="text-[11px] text-gray-500">
                Max: ₹{safeBalanceAmount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 font-bold text-emerald-700 text-sm">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={safeBalanceAmount}
                value={formData.amount || ""}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setFormData({ ...formData, amount: val });
                }}
                className="pl-8 text-sm font-bold text-emerald-700 border-2 border-emerald-500 focus:ring-emerald-400"
                placeholder="Enter amount"
                required
              />
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_method" className="text-xs font-bold text-gray-800">
              Payment Method *
            </Label>
            <Select
              value={formData.payment_method}
              onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
            >
              <SelectTrigger id="payment_method" className="text-xs sm:text-sm">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Cash">Cash</SelectItem>
                <SelectItem value="UPI">UPI / QR (Google Pay / PhonePe / Paytm)</SelectItem>
                <SelectItem value="Card">Debit / Credit Card</SelectItem>
                <SelectItem value="Net Banking">Net Banking</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Date */}
          <div className="space-y-1.5">
            <Label htmlFor="payment_date" className="text-xs font-bold text-gray-800">
              Payment Date *
            </Label>
            <Input
              id="payment_date"
              type="date"
              value={formData.payment_date}
              onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              className="text-xs sm:text-sm"
              required
            />
          </div>

          {/* Notes / Treatment Allocation */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs font-bold text-gray-800">
              Payment Notes / Treatment Allocation
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="e.g. Payment for: Root Canal"
              rows={2}
              className="text-xs sm:text-sm"
            />
          </div>

          {/* Remaining Balance Preview */}
          <div className="p-2.5 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center text-xs">
            <span className="text-gray-600">Remaining Balance after this payment:</span>
            <span
              className={`font-bold ${
                safeBalanceAmount - (formData.amount || 0) <= 0
                  ? "text-emerald-700"
                  : "text-rose-600"
              }`}
            >
              ₹{Math.max(0, safeBalanceAmount - (formData.amount || 0)).toLocaleString("en-IN")}{" "}
              {safeBalanceAmount - (formData.amount || 0) <= 0 ? "(Fully Settled ✓)" : ""}
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.amount || formData.amount <= 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm"
            >
              {loading ? "Recording..." : `Confirm Payment (₹${Number(formData.amount || 0).toLocaleString("en-IN")})`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
