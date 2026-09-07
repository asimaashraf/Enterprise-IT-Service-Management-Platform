import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ClipboardList, Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useSelector } from "react-redux";

import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import { FilterBar, type FilterOption } from "@/components/ui/filter-bar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorState } from "@/components/ui/error-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { ServiceRequestCreateDialog } from "@/components/service-requests/service-request-create-dialog";
import { ServiceRequestEditDialog } from "@/components/service-requests/service-request-edit-dialog";
import { ServiceRequestViewDialog } from "@/components/service-requests/service-request-view-dialog";
import {
  serviceRequestPriorityOptions,
  serviceRequestTypeOptions,
  type CreateServiceRequestFormData,
} from "@/components/service-requests/service-request-form";
import {
  useCreateServiceRequest,
  useDeleteServiceRequest,
  useServiceRequests,
  useUpdateServiceRequest,
} from "@/hooks/useServiceRequests";
import {
  getServiceRequestUserDisplay,
  normalizeServiceRequestStatus,
  type ServiceRequest,
  type ServiceRequestFilters,
  type UpdateServiceRequestPayload,
} from "@/types/serviceRequest";
import type { RootState } from "@/store/store";

const statusOptions: FilterOption[] = [
  "Pending",
  "Approved",
  "In Progress",
  "Completed",
  "Rejected",
  "Cancelled",
].map((value) => ({ label: value, value }));
const typeOptions: FilterOption[] = [
  { label: "All Types", value: "" },
  ...serviceRequestTypeOptions,
];
const priorityOptions: FilterOption[] = [
  { label: "All Priorities", value: "" },
  ...serviceRequestPriorityOptions,
];
const filterFields = [
  {
    key: "search",
    type: "search" as const,
    label: "Search",
    placeholder: "Search requests…",
  },
  {
    key: "status",
    type: "select" as const,
    label: "Status",
    options: [{ label: "All Statuses", value: "" }, ...statusOptions],
    placeholder: "Status",
  },
  {
    key: "type",
    type: "select" as const,
    label: "Type",
    options: typeOptions,
    placeholder: "Type",
  },
  {
    key: "priority",
    type: "select" as const,
    label: "Priority",
    options: priorityOptions,
    placeholder: "Priority",
  },
];

const displayDate = (value: string) =>
  format(new Date(value), "MMM d, yyyy HH:mm");

export function ServiceRequestsPage() {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === "admin";
  const {
    data: requests = [],
    isLoading,
    isError,
    refetch,
  } = useServiceRequests();
  const createMutation = useCreateServiceRequest();
  const updateMutation = useUpdateServiceRequest();
  const deleteMutation = useDeleteServiceRequest();
  const [filters, setFilters] = useState<ServiceRequestFilters>({
    search: "",
    status: "",
    type: "",
    priority: "",
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<ServiceRequest | null>(null);
  const [editTarget, setEditTarget] = useState<ServiceRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceRequest | null>(null);

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const search = filters.search.toLowerCase();
        if (
          search &&
          ![
            request.requestId,
            request.title,
            request.description,
            request.type,
          ].some((value) => value.toLowerCase().includes(search))
        )
          return false;
        return (
          (!filters.status || request.status === filters.status) &&
          (!filters.type || request.type === filters.type) &&
          (!filters.priority || request.priority === filters.priority)
        );
      }),
    [requests, filters],
  );

  const resetFilters = () =>
    setFilters({ search: "", status: "", type: "", priority: "" });
  const handleCreate = async (data: CreateServiceRequestFormData) => {
    await createMutation.mutateAsync(data);
  };
  const handleUpdate = async (payload: UpdateServiceRequestPayload) => {
    if (editTarget)
      await updateMutation.mutateAsync({ id: editTarget._id, payload });
  };
  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteMutation.mutateAsync(deleteTarget._id);
      setDeleteTarget(null);
    }
  };

  const columns = useMemo<ColumnDef<ServiceRequest>[]>(
    () => [
      {
        accessorKey: "requestId",
        header: "ID",
        cell: ({ row }) => (
          <span className="font-mono text-xs text-muted-foreground">
            {row.original.requestId}
          </span>
        ),
        size: 125,
      },
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.title}</p>
            <p className="text-xs text-muted-foreground">{row.original.type}</p>
          </div>
        ),
        size: 280,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            status={normalizeServiceRequestStatus(row.original.status)}
          >
            {row.original.status}
          </StatusBadge>
        ),
        size: 130,
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => (
          <StatusBadge status={row.original.priority.toLowerCase()}>
            {row.original.priority}
          </StatusBadge>
        ),
        size: 100,
      },
      {
        accessorKey: "requestedBy",
        header: "Requester",
        cell: ({ row }) => (
          <span className="text-sm">
            {getServiceRequestUserDisplay(row.original.requestedBy)}
          </span>
        ),
        size: 150,
      },
      {
        accessorKey: "assignedTo",
        header: "Assigned To",
        cell: ({ row }) => (
          <span className="text-sm">
            {getServiceRequestUserDisplay(row.original.assignedTo)}
          </span>
        ),
        size: 150,
      },
      {
        accessorKey: "createdAt",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {displayDate(row.original.createdAt)}
          </span>
        ),
        size: 150,
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              title="View request"
              onClick={() => setViewTarget(row.original)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Edit request"
              onClick={() => setEditTarget(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {isAdmin && (
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:text-destructive"
                title="Delete request (admin)"
                onClick={() => setDeleteTarget(row.original)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        size: 120,
      },
    ],
    [isAdmin],
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Service Requests"
        description="Submit, approve, assign, and track IT service requests."
        icon={ClipboardList}
        breadcrumbs={[{ label: "Service Requests" }]}
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Button>
        }
      />
      <FilterBar
        fields={filterFields}
        values={filters}
        onChange={(key, value) =>
          setFilters((current) => ({ ...current, [key]: value }))
        }
        onReset={resetFilters}
      />
      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner label="Loading service requests…" />
        </div>
      ) : isError ? (
        <ErrorState
          title="Failed to load service requests"
          description="There was a problem fetching service request data."
          onRetry={refetch}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRequests}
          emptyTitle="No service requests found"
          emptyDescription="No requests match your filters, or no requests have been created yet."
          onRetry={resetFilters}
        />
      )}
      <ServiceRequestCreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
        isLoading={createMutation.isPending}
      />
      <ServiceRequestViewDialog
        open={Boolean(viewTarget)}
        onOpenChange={(open) => !open && setViewTarget(null)}
        serviceRequest={viewTarget}
      />
      <ServiceRequestEditDialog
        open={Boolean(editTarget)}
        onOpenChange={(open) => !open && setEditTarget(null)}
        serviceRequest={editTarget}
        onSubmit={handleUpdate}
        isLoading={updateMutation.isPending}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service Request"
        description={
          deleteTarget
            ? `Are you sure you want to delete request ${deleteTarget.requestId}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Delete"
        confirmVariant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
