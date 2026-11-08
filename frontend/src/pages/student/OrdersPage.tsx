import { Link } from "react-router-dom";
import { Receipt, RotateCcw } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useMyOrders } from "@/hooks/useApi";
import { formatDate, formatPrice, orderStatusLabels } from "@/lib/utils";
import type { OrderStatus } from "@/types";

const statusVariant: Record<OrderStatus, "success" | "warning" | "danger" | "secondary" | "default"> = {
  paid: "success",
  pending: "warning",
  failed: "danger",
  expired: "danger",
  refunded: "secondary",
  partially_refunded: "secondary",
};

export function OrdersPage() {
  const orders = useMyOrders();
  const list = orders.data ?? [];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Purchase history"
        description="Receipts for every course you've purchased, including any refunds."
      />

      {orders.isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState message="We could not load your orders." onRetry={() => orders.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No purchases yet"
          description="When you buy a course, the receipt will show up here."
          action={
            <Link to="/courses">
              <Button>Browse courses</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-4">
          {list.map((order) => (
            <li key={order.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{order.course_title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Order #{order.id} · {order.paid_at ? `Paid ${formatDate(order.paid_at)}` : `Created ${formatDate(order.created_at)}`}
                    </p>
                  </div>
                  <Badge variant={statusVariant[order.status]}>{orderStatusLabels[order.status] ?? order.status}</Badge>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Amount</dt>
                    <dd className="mt-0.5 font-semibold text-foreground">
                      {formatPrice(order.amount_cents, order.currency)}
                    </dd>
                  </div>
                  {order.refunded_amount_cents > 0 && (
                    <>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Refunded</dt>
                        <dd className="mt-0.5 font-semibold text-danger">
                          −{formatPrice(order.refunded_amount_cents, order.currency)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Net</dt>
                        <dd className="mt-0.5 font-semibold text-foreground">
                          {formatPrice(order.net_amount_cents, order.currency)}
                        </dd>
                      </div>
                    </>
                  )}
                </dl>

                {order.refunds.length > 0 && (
                  <div className="mt-4 rounded-lg bg-surface p-3">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                      Refunds
                    </p>
                    <ul className="space-y-1.5">
                      {order.refunds.map((refund) => (
                        <li key={refund.id} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {formatDate(refund.created_at)}
                            {refund.reason ? ` · ${refund.reason}` : ""}
                          </span>
                          <span className="font-medium text-foreground">
                            {formatPrice(refund.amount_cents, refund.currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {order.course && (
                  <div className="mt-4">
                    <Link to={`/dashboard/course/${order.course}`}>
                      <Button size="sm" variant="outline">
                        Go to course
                      </Button>
                    </Link>
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
