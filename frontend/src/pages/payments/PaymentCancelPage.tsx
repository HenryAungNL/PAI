import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function PaymentCancelPage() {
  return (
    <div className="container flex min-h-[70vh] max-w-lg flex-col items-center justify-center py-16">
      <Card className="w-full p-8 text-center">
        <XCircle className="mx-auto h-12 w-12 text-neutral-400" aria-hidden />
        <h1 className="mt-5 text-2xl font-bold tracking-tight">Checkout cancelled</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          No payment was taken. Your basket is still waiting whenever you're ready.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button onClick={() => window.history.back()}>Return to course</Button>
          <Link to="/courses">
            <Button variant="outline">Browse courses</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
