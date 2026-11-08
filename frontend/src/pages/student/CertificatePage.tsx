import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Award, BadgeCheck, Printer } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { useMyCertificates } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";

/**
 * Full-page, print-optimised certificate. Chrome is hidden with the shared
 * `.no-print` utility so "Print" produces a clean document (or PDF).
 */
export function CertificatePage() {
  const { code } = useParams<{ code: string }>();
  const certificates = useMyCertificates();
  const certificate = useMemo(
    () => (certificates.data ?? []).find((c) => c.code === code),
    [certificates.data, code],
  );

  if (certificates.isLoading) {
    return (
      <div className="container max-w-4xl py-12">
        <Skeleton className="h-[520px] rounded-2xl" />
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="container max-w-2xl py-16">
        <EmptyState
          icon={Award}
          title="Certificate not found"
          description="We couldn't find this certificate on your account. It may belong to another learner."
          action={
            <Link to="/dashboard/certificates">
              <Button>Back to certificates</Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-8">
      <div className="container max-w-4xl">
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/dashboard/certificates"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Back to certificates
          </Link>
          <Button onClick={() => window.print()}>
            <Printer />
            Print / Save as PDF
          </Button>
        </div>

        <article className="relative overflow-hidden rounded-2xl border border-border bg-white p-8 shadow-card sm:p-14">
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-primary-50"
            aria-hidden
          />
          <div className="relative">
            <div className="flex items-center justify-between">
              <Logo />
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-700">
                <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                Verified
              </span>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-primary">
                Certificate of Completion
              </p>
              <p className="mt-8 text-sm text-muted-foreground">This certifies that</p>
              <h1 className="mt-2 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
                {certificate.student_name}
              </h1>
              <p className="mt-6 text-sm text-muted-foreground">has successfully completed</p>
              <h2 className="mx-auto mt-2 max-w-2xl text-2xl font-bold tracking-tight text-foreground">
                {certificate.course_title}
              </h2>
            </div>

            <div className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-border pt-8 sm:flex-row">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issued</p>
                <p className="mt-1 font-semibold text-foreground">{formatDate(certificate.issued_at)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Final score</p>
                <p className="mt-1 font-semibold text-foreground">{certificate.final_score_percent}%</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Certificate code</p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">{certificate.code}</p>
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-muted-foreground">
              Verify this certificate at{" "}
              <span className="font-medium text-primary">pai.learning/verify/{certificate.code}</span>
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
