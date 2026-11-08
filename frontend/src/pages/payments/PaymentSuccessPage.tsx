import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useOrderStatus } from "@/hooks/useApi";
import { formatPrice } from "@/lib/utils";

/**
 * Post-checkout landing page. Access is only granted once the backend has
 * verified the payment (webhook or authenticated Stripe re-verification), so
 * this page polls the order status until it is confirmed.
 */
export function PaymentSuccessPage() {
  const [params] = useSearchParams();
  const orderId = params.get("order");
  const status = useOrderStatus(orderId);

  const order = status.data?.order;
  const enrolled = status.data?.enrolled ?? false;
  const verifying = !order || order.status === "pending" || (!enrolled && order.status !== "failed");

  return (
    <div className="container flex min-h-[70vh] max-w-lg flex-col items-center justify-center py-16">
      <Card className="w-full p-8 text-center">
        {status.isLoading || verifying ? (
          <>
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" aria-hidden />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              We're verifying your payment with Stripe. This usually takes a few seconds — you can safely leave
              this page and your access will be ready shortly.
            </p>
            <div className="mt-6 space-y-2">
              <Skeleton className="h-4 w-3/4 mx-auto" />
              <Skeleton className="h-4 w-1/2 mx-auto" />
            </div>
          </>
        ) : order?.status === "failed" || order?.status === "expired" ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-danger" aria-hidden />
            <h1 className="mt-5 text-2xl font-bold tracking-tight">Payment not completed</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment did not go through, so no charge was made.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button onClick={() => window.history.back()}>Try again</Button>
              <Link to="/courses">
                <Button variant="outline">Browse courses</Button>
              </Link>
            </div>
          </>
        ) : (
          <>
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-success">
              <CheckCircle2 className="h-9 w-9" aria-hidden />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight">You're enrolled! 🎉</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your payment was confirmed and access to <strong className="text-foreground">{order?.course_title}</strong>{" "}
              is now unlocked.
            </p>
            {order && (
              <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface px-3 py-2 text-sm">
                <Clock className="h-4 w-4 text-primary" aria-hidden />
                Paid {formatPrice(order.amount_cents, order.currency)}
              </p>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {order?.course && (
                <Link to={`/dashboard/course/${order.course}`}>
                  <Button>Start learning</Button>
                </Link>
              )}
              <Link to="/dashboard/learning">
                <Button variant="outline">My learning</Button>
              </Link>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
