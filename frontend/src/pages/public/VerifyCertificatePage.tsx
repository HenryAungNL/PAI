import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Award, BadgeCheck, Search, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { useVerifyCertificate } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";

export function VerifyCertificatePage() {
  const { code: routeCode } = useParams<{ code: string }>();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(routeCode ?? params.get("code") ?? "");
  const activeCode = routeCode ?? params.get("code") ?? "";

  const result = useVerifyCertificate(activeCode || undefined);

  useEffect(() => {
    if (routeCode) setInput(routeCode);
  }, [routeCode]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params);
    if (input.trim()) next.set("code", input.trim());
    else next.delete("code");
    setParams(next);
  };

  return (
    <div className="container max-w-3xl py-10 lg:py-16">
      <header className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary">
          <Award className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Verify a certificate
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
          Enter a certificate code to confirm that a PAI certificate is genuine.
        </p>
      </header>

      <Card className="mt-8 p-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="cert-code">Certificate code</Label>
            <Input
              id="cert-code"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. PAI-XXXX-XXXX"
              autoComplete="off"
            />
          </div>
          <Button type="submit">
            <Search />
            Verify
          </Button>
        </form>
      </Card>

      {activeCode && (
        <div className="mt-6">
          {result.isLoading ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : result.isError ? (
            <div className="rounded-xl border border-border bg-card p-6 text-center">
              <ShieldX className="mx-auto h-10 w-10 text-danger" aria-hidden />
              <h2 className="mt-3 text-lg font-semibold text-foreground">No matching certificate</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We could not find a certificate with the code{" "}
                <span className="font-mono font-medium text-foreground">{activeCode}</span>. Check the code and
                try again.
              </p>
            </div>
          ) : result.data?.valid ? (
            <Card className="border-success/30 p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-green-50 text-success">
                  <BadgeCheck className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Certificate verified</h2>
                  <p className="text-sm text-muted-foreground">This certificate is genuine and on record.</p>
                </div>
              </div>
              <dl className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
                <Detail label="Student" value={result.data.certificate.student_name} />
                <Detail label="Course" value={result.data.certificate.course_title} />
                <Detail label="Issued" value={formatDate(result.data.certificate.issued_at)} />
                <Detail label="Score" value={`${result.data.certificate.final_score_percent}%`} />
                <Detail label="Certificate code" value={result.data.certificate.code} mono />
              </dl>
            </Card>
          ) : (
            <ErrorState title="Certificate not found" message={`The code ${activeCode} is not valid.`} />
          )}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={mono ? "mt-1 font-mono text-sm font-medium text-foreground" : "mt-1 text-sm font-medium text-foreground"}>
        {value}
      </dd>
    </div>
  );
}
