import { useMemo, useState } from "react";
import { ScrollText, Search } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { useAuditLogs, type AuditLogFilters } from "@/hooks/useApi";
import { formatDateTime } from "@/lib/utils";
import type { AuditLogEntry } from "@/types";

const PAGE_SIZE = 20;

function actionTone(action: string): "success" | "danger" | "warning" | "secondary" {
  if (/(deleted|rejected|suspended|unapproved)/.test(action)) return "danger";
  if (/(approved|created|reactivated)/.test(action)) return "success";
  if (/(updated|moderated|refunded|submitted)/.test(action)) return "warning";
  return "secondary";
}

export function AdminAuditPage() {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [objectType, setObjectType] = useState("");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<AuditLogEntry | null>(null);

  const filters: AuditLogFilters = useMemo(
    () => ({
      search: search || undefined,
      action: action || undefined,
      object_type: objectType || undefined,
      page,
    }),
    [search, action, objectType, page],
  );
  const logs = useAuditLogs(filters);
  const results = logs.data?.results ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Audit log"
        description="An immutable record of every administrative and instructor action."
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="relative sm:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search actor, object…"
              aria-label="Search audit log"
              className="pl-10"
            />
          </div>
          <Input
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by action (e.g. course.approved)"
            aria-label="Filter by action"
          />
          <Input
            value={objectType}
            onChange={(e) => {
              setObjectType(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by object type (e.g. Course)"
            aria-label="Filter by object type"
          />
        </div>
      </Card>

      {logs.isLoading ? (
        <Card className="p-5">
          <TableSkeleton rows={8} cols={5} />
        </Card>
      ) : logs.isError ? (
        <ErrorState message="We could not load the audit log." onRetry={() => logs.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState icon={ScrollText} title="No activity found" description="Nothing matches these filters." />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Actor</TH>
                  <TH>Action</TH>
                  <TH>Object</TH>
                  <TH>IP</TH>
                </TR>
              </THead>
              <TBody>
                {results.map((entry) => (
                  <TR key={entry.id} className="cursor-pointer" onClick={() => setDetail(entry)}>
                    <TD className="whitespace-nowrap text-muted-foreground">{formatDateTime(entry.created_at)}</TD>
                    <TD>
                      <p className="text-sm text-foreground">{entry.actor_name}</p>
                      {entry.actor_email && <p className="text-xs text-muted-foreground">{entry.actor_email}</p>}
                    </TD>
                    <TD>
                      <Badge variant={actionTone(entry.action)}>{entry.action}</Badge>
                    </TD>
                    <TD>
                      <p className="text-sm text-foreground">{entry.object_repr || entry.object_type}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.object_type}
                        {entry.object_id ? ` #${entry.object_id}` : ""}
                      </p>
                    </TD>
                    <TD className="whitespace-nowrap text-xs text-muted-foreground">{entry.ip_address ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Pagination page={page} pageSize={PAGE_SIZE} total={logs.data?.count ?? 0} onPageChange={setPage} />
        </>
      )}

      <Modal
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.action}
        description={detail ? `${detail.actor_name} · ${formatDateTime(detail.created_at)}` : ""}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <DetailRow label="Object" value={`${detail.object_type}${detail.object_id ? ` #${detail.object_id}` : ""}`} />
            <DetailRow label="Representation" value={detail.object_repr || "—"} />
            <DetailRow label="IP address" value={detail.ip_address ?? "—"} />
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Metadata</p>
              <pre className="mt-1 max-h-64 overflow-auto rounded-lg bg-neutral-900 p-3 text-xs text-neutral-100 scrollbar-thin">
                {JSON.stringify(detail.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
