import { Link } from "react-router-dom";
import { Award, BadgeCheck, Download, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useMyCertificates } from "@/hooks/useApi";
import { formatDate } from "@/lib/utils";

export function CertificatesPage() {
  const certificates = useMyCertificates();
  const list = certificates.data ?? [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Certificates"
        description="Proof of the courses you've completed. Verify or print them any time."
      />

      {certificates.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : certificates.isError ? (
        <ErrorState message="We could not load your certificates." onRetry={() => certificates.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete every lesson in a course to unlock your certificate — it will appear here automatically."
          action={
            <Link to="/dashboard/learning">
              <Button>Go to my learning</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {list.map((certificate) => (
            <Card key={certificate.id} className="flex flex-col overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary">
                  <Award className="h-6 w-6" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="line-clamp-2 font-semibold text-foreground">{certificate.course_title}</h2>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-success">
                    <BadgeCheck className="h-4 w-4" aria-hidden />
                    Completed · {certificate.final_score_percent}%
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 border-t border-border px-5 py-4 text-sm">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Issued</dt>
                  <dd className="mt-0.5 text-foreground">{formatDate(certificate.issued_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Code</dt>
                  <dd className="mt-0.5 font-mono text-xs text-foreground">{certificate.code}</dd>
                </div>
              </dl>

              <div className="mt-auto flex flex-wrap gap-2 border-t border-border px-5 py-4">
                <Link to={`/certificate/${certificate.code}`}>
                  <Button size="sm">
                    <Download />
                    View &amp; print
                  </Button>
                </Link>
                <Link to={`/verify/${certificate.code}`}>
                  <Button size="sm" variant="outline">
                    <ExternalLink />
                    Public verification
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
