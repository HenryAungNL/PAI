import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Receipt, RotateCcw, Search } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAdminOrders, useRefundOrder, type AdminOrderFilters } from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { formatDate, formatPrice, orderStatusLabels } from "@/lib/utils";
import type { Order, OrderStatus } from "@/types";

const PAGE_SIZE = 12;

const statusVariant: Record<OrderStatus, "success" | "warning" | "danger" | "secondary" | "default"> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  expired: "danger",
  refunded: "secondary",
  partially_refunded: "secondary",
};

const statusTabs = [
  { value: "", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "pending", label: "Pending" },
  { value: "partially_refunded", label: "Partial refunds" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

export function AdminOrdersPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "";
  const search = params.get("search") ?? "";
  const page = Number(params.get("page") ?? "1") || 1;

  const filters: AdminOrderFilters = useMemo(
    () => ({ status: status || undefined, search: search || undefined, page }),
    [status, search, page],
  );
  const orders = useAdminOrders(filters);
  const results = orders.data?.results ?? [];

  const [refundOrder, setRefundOrder] = useState<Order | null>(null);

  const update = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Orders & refunds"
        description="Issue full or partial refunds. Revenue figures only include verified payments."
      />

      <div className="mb-5 flex flex-wrap gap-1 border-b border-border">
        {statusTabs.map((tab) => {
          const active = tab.value === status;
          return (
            <button
              key={tab.value}
              onClick={() => update("status", tab.value)}
              className={
                "relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors " +
                (active
                  ? "border-b-2 border-primary text-primary"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="mb-5 max-w-sm">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            type="search"
            value={search}
            onChange={(e) => update("search", e.target.value)}
            placeholder="Search by student or course…"
            aria-label="Search orders"
            className="pl-10"
          />
        </div>
      </div>

      {orders.isLoading ? (
        <Card className="p-5">
          <TableSkeleton rows={6} cols={6} />
        </Card>
      ) : orders.isError ? (
        <ErrorState message="We could not load orders." onRetry={() => orders.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState icon={Receipt} title="No orders found" description="Nothing matches these filters." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>Order</TH>
                  <TH>Student</TH>
                  <TH>Course</TH>
                  <TH className="text-right">Amount</TH>
                  <TH className="text-right">Refunded</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {results.map((order) => {
                  const refundable = order.amount_cents - order.refunded_amount_cents;
                  return (
                    <TR key={order.id}>
                      <TD>
                        <p className="font-medium text-foreground">#{order.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(order.paid_at ?? order.created_at)}
                        </p>
                      </TD>
                      <TD>
                        {order.student ? (
                          <div className="min-w-0">
                            <p className="truncate text-sm text-foreground">{order.student.full_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{order.student.email}</p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TD>
                      <TD>
                        <p className="line-clamp-1 text-sm text-foreground">{order.course_title}</p>
                      </TD>
                      <TD className="text-right font-medium">
                        {formatPrice(order.amount_cents, order.currency)}
                      </TD>
                      <TD className="text-right">
                        {order.refunded_amount_cents > 0 ? (
                          <span className="text-danger">
                            −{formatPrice(order.refunded_amount_cents, order.currency)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD>
                        <Badge variant={statusVariant[order.status]}>
                          {orderStatusLabels[order.status] ?? order.status}
                        </Badge>
                      </TD>
                      <TD>
                        <div className="flex justify-end">
                          {refundable > 0 ? (
                            <Button variant="outline" size="sm" onClick={() => setRefundOrder(order)}>
                              <RotateCcw />
                              Refund
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Fully refunded</span>
                          )}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={orders.data?.count ?? 0}
            onPageChange={(p) => update("page", String(p), false)}
          />
        </>
      )}

      <RefundModal order={refundOrder} onClose={() => setRefundOrder(null)} />
    </div>
  );
}

function RefundModal({ order, onClose }: { order: Order | null; onClose: () => void }) {
  const refund = useRefundOrder();
  const max = order ? order.amount_cents - order.refunded_amount_cents : 0;
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<number | null>(null);

  if (order && order.id !== lastId) {
    setLastId(order.id);
    setAmount((max / 100).toFixed(max % 100 === 0 ? 0 : 2));
    setReason("");
    setError(null);
  }

  if (!order) return null;

  const cents = Math.round(Number(amount || "0") * 100);

  const onConfirm = () => {
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a refund amount greater than zero.");
      return;
    }
    if (cents > max) {
      setError(`The maximum refundable amount is ${formatPrice(max, order.currency)}.`);
      return;
    }
    refund.mutate(
      { orderId: order.id, amount_cents: cents, reason },
      {
        onSuccess: () => {
          toast.success("Refund issued.");
          onClose();
        },
        onError: (err) => setError(err instanceof ApiError ? err.message : "We could not issue this refund."),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Issue refund"
      description={`Order #${order.id} · ${order.course_title}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={refund.isPending}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={refund.isPending} data-autofocus>
            Refund {cents > 0 ? formatPrice(cents, order.currency) : ""}
          </Button>
        </>
      }
    >
      <div className="rounded-lg bg-surface p-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Paid</span>
          <span className="font-medium text-foreground">{formatPrice(order.amount_cents, order.currency)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-muted-foreground">Already refunded</span>
          <span className="font-medium text-foreground">
            {formatPrice(order.refunded_amount_cents, order.currency)}
          </span>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-border pt-1">
          <span className="font-medium text-foreground">Refundable</span>
          <span className="font-semibold text-foreground">{formatPrice(max, order.currency)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="refund-amount">Refund amount</Label>
        <Input
          id="refund-amount"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-invalid={Boolean(error)}
        />
        <FieldError>{error}</FieldError>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="refund-reason">Reason (optional)</Label>
        <Textarea
          id="refund-reason"
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Recorded in the audit log."
        />
      </div>
    </Modal>
  );
}
