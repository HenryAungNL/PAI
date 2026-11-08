import { useMemo, useState } from "react";
import { BadgeCheck, Search, ShieldCheck, ShieldOff, SlidersHorizontal, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  useAdminUsers,
  useApproveInstructor,
  useSuspendUser,
  useUpdateAdminUser,
  type AdminUserFilters,
} from "@/hooks/useApi";
import { ApiError } from "@/lib/api";
import { formatDate } from "@/lib/utils";
import type { AdminUser, UserRole } from "@/types";

const PAGE_SIZE = 12;

export function AdminUsersPage() {
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [pendingInstructors, setPendingInstructors] = useState(false);
  const [page, setPage] = useState(1);

  const filters: AdminUserFilters = useMemo(
    () => ({
      role: role || undefined,
      status: status || undefined,
      search: search || undefined,
      pending_instructors: pendingInstructors || undefined,
      page,
    }),
    [role, status, search, pendingInstructors, page],
  );

  const users = useAdminUsers(filters);
  const results = users.data?.results ?? [];

  const [manage, setManage] = useState<AdminUser | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminUser | null>(null);

  const resetPage = () => setPage(1);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Users"
        description="Manage roles, approvals and account status across the platform."
        actions={
          <Button
            variant={pendingInstructors ? "default" : "outline"}
            onClick={() => {
              setPendingInstructors((v) => !v);
              resetPage();
            }}
          >
            <BadgeCheck />
            Pending instructors
          </Button>
        }
      />

      <Card className="mb-5 p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_180px_180px]">
          <div className="space-y-1.5">
            <Label htmlFor="user-search">Search</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                id="user-search"
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Name or email…"
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-role">Role</Label>
            <Select
              id="user-role"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                resetPage();
              }}
            >
              <option value="">All roles</option>
              <option value="student">Students</option>
              <option value="instructor">Instructors</option>
              <option value="admin">Admins</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="user-status">Status</Label>
            <Select
              id="user-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                resetPage();
              }}
            >
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </Card>

      {users.isLoading ? (
        <Card className="p-5">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        </Card>
      ) : users.isError ? (
        <ErrorState message="We could not load users." onRetry={() => users.refetch()} />
      ) : results.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No users found"
          description="Try adjusting your search or filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setRole("");
                setStatus("");
                setSearch("");
                setPendingInstructors(false);
                resetPage();
              }}
            >
              <SlidersHorizontal />
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <Table>
              <THead>
                <TR>
                  <TH>User</TH>
                  <TH>Role</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Courses</TH>
                  <TH className="text-right">Enrollments</TH>
                  <TH>Joined</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {results.map((user) => (
                  <TR key={user.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar || user.avatar_url} name={user.full_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{user.full_name}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="capitalize">{user.role}</TD>
                    <TD>
                      <div className="flex flex-wrap gap-1.5">
                        {user.is_suspended ? (
                          <Badge variant="danger">Suspended</Badge>
                        ) : user.is_active ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                        {user.role === "instructor" && (
                          <Badge variant={user.is_approved ? "success" : "warning"}>
                            {user.is_approved ? "Approved" : "Pending"}
                          </Badge>
                        )}
                      </div>
                    </TD>
                    <TD className="text-right">{user.course_count}</TD>
                    <TD className="text-right">{user.enrollment_count}</TD>
                    <TD className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDate(user.date_joined)}
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setManage(user)}>
                          <UserCog />
                          Manage
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={user.is_suspended ? "Reactivate" : "Suspend"}
                          className={user.is_suspended ? "text-success hover:bg-green-50" : "text-danger hover:bg-red-50"}
                          onClick={() => setSuspendTarget(user)}
                        >
                          {user.is_suspended ? <ShieldCheck /> : <ShieldOff />}
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={users.data?.count ?? 0}
            onPageChange={setPage}
          />
        </>
      )}

      <ManageUserModal user={manage} onClose={() => setManage(null)} />
      <SuspendUserDialog user={suspendTarget} onClose={() => setSuspendTarget(null)} />
    </div>
  );
}

function ManageUserModal({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const update = useUpdateAdminUser();
  const approve = useApproveInstructor();
  const [role, setRole] = useState<UserRole>("student");

  // Re-sync local state whenever a new user is opened.
  const [lastId, setLastId] = useState<number | null>(null);
  if (user && user.id !== lastId) {
    setLastId(user.id);
    setRole(user.role);
  }

  if (!user) return null;

  const onSaveRole = () => {
    update.mutate(
      { id: user.id, role },
      {
        onSuccess: () => toast.success("Role updated."),
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "Could not update role."),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Manage user"
      description={user.email}
      footer={<Button variant="outline" onClick={onClose}>Close</Button>}
    >
      <div className="flex items-center gap-3 rounded-lg bg-surface p-3">
        <Avatar src={user.avatar || user.avatar_url} name={user.full_name} />
        <div>
          <p className="font-medium text-foreground">{user.full_name}</p>
          <p className="text-xs capitalize text-muted-foreground">
            {user.role} · joined {formatDate(user.date_joined)}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manage-role">Role</Label>
        <div className="flex gap-2">
          <Select id="manage-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="student">Student</option>
            <option value="instructor">Instructor</option>
            <option value="admin">Admin</option>
          </Select>
          <Button onClick={onSaveRole} loading={update.isPending} disabled={role === user.role}>
            Update
          </Button>
        </div>
      </div>

      {user.role === "instructor" && (
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-medium text-foreground">Instructor approval</p>
            <p className="text-xs text-muted-foreground">
              {user.is_approved
                ? "This instructor is listed publicly."
                : "Not yet visible in the public instructor directory."}
            </p>
          </div>
          <Button
            size="sm"
            variant={user.is_approved ? "outline" : "default"}
            loading={approve.isPending}
            onClick={() =>
              approve.mutate(
                { id: user.id, approve: !user.is_approved },
                {
                  onSuccess: () =>
                    toast.success(user.is_approved ? "Instructor unapproved." : "Instructor approved."),
                  onError: (error) =>
                    toast.error(error instanceof ApiError ? error.message : "Could not update approval."),
                },
              )
            }
          >
            {user.is_approved ? "Revoke" : "Approve"}
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
        <span className="text-muted-foreground">Courses taught</span>
        <span className="font-semibold text-foreground">{user.course_count}</span>
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
        <span className="text-muted-foreground">Enrollments</span>
        <span className="font-semibold text-foreground">{user.enrollment_count}</span>
      </div>
    </Modal>
  );
}

function SuspendUserDialog({ user, onClose }: { user: AdminUser | null; onClose: () => void }) {
  const suspend = useSuspendUser();
  const [reason, setReason] = useState("");

  if (!user) return null;
  const suspending = !user.is_suspended;

  const onConfirm = () => {
    suspend.mutate(
      { id: user.id, suspend: suspending, reason: suspending ? reason : undefined },
      {
        onSuccess: () => {
          toast.success(suspending ? "User suspended." : "User reactivated.");
          setReason("");
          onClose();
        },
        onError: (error) => toast.error(error instanceof ApiError ? error.message : "Action failed."),
      },
    );
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={suspending ? "Suspend user" : "Reactivate user"}
      description={
        suspending
          ? `${user.full_name} will be unable to sign in until reactivated.`
          : `${user.full_name} will regain access to their account.`
      }
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={suspend.isPending}>
            Cancel
          </Button>
          <Button
            variant={suspending ? "danger" : "success"}
            onClick={onConfirm}
            loading={suspend.isPending}
            data-autofocus
          >
            {suspending ? "Suspend" : "Reactivate"}
          </Button>
        </>
      }
    >
      {suspending && (
        <div className="space-y-1.5">
          <Label htmlFor="suspend-reason">Reason (optional)</Label>
          <Textarea
            id="suspend-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Shared with the user and recorded in the audit log."
          />
        </div>
      )}
    </Modal>
  );
}
