import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSelector } from "react-redux";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useEligibleOperationalAssignees } from "@/hooks/useEligibleOperationalAssignees";
import type { RootState } from "@/store/store";
import {
  getServiceRequestUserId,
  getServiceRequestUserDisplay,
  type ServiceRequest,
  type ServiceRequestStatus,
  type UpdateServiceRequestPayload,
} from "@/types/serviceRequest";
import {
  serviceRequestPriorityOptions,
  serviceRequestTypeOptions,
  updateServiceRequestSchema,
  type UpdateServiceRequestFormData,
} from "./service-request-form";

export function ServiceRequestEditDialog({
  open,
  onOpenChange,
  serviceRequest,
  onSubmit,
  isLoading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceRequest: ServiceRequest | null;
  onSubmit: (payload: UpdateServiceRequestPayload) => Promise<void>;
  isLoading?: boolean;
}) {
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.role === "admin";
  const isRequester =
    getServiceRequestUserId(serviceRequest?.requestedBy) === user?.id;
  const canEditBasics = isAdmin || isRequester;
  const [status, setStatus] = useState<ServiceRequestStatus | "">("");
  const [assignedTo, setAssignedTo] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const statuses = useMemo((): ServiceRequestStatus[] => {
    if (!serviceRequest) return [];
    if (isAdmin) {
      if (serviceRequest.status === "Pending")
        return ["Approved", "Rejected", "Cancelled"];
      if (serviceRequest.status === "Approved")
        return serviceRequest.assignedTo || assignedTo
          ? ["In Progress", "Cancelled"]
          : ["Cancelled"];
      if (serviceRequest.status === "In Progress")
        return ["Completed", "Cancelled"];
      return [];
    }
    const options: ServiceRequestStatus[] = [];
    if (
      isRequester &&
      !["Completed", "Rejected"].includes(serviceRequest.status)
    )
      options.push("Cancelled");
    return options;
  }, [assignedTo, isAdmin, isRequester, serviceRequest]);
  const {
    data: eligibleAssignees = [],
    isLoading: isLoadingAssignees,
    isError: isAssigneeError,
  } = useEligibleOperationalAssignees(isAdmin && open);
  const form = useForm<UpdateServiceRequestFormData>({
    resolver: zodResolver(updateServiceRequestSchema),
    defaultValues: { title: "", description: "", priority: "Medium" },
  });
  useEffect(() => {
    if (open && serviceRequest) {
      form.reset({
        title: serviceRequest.title,
        description: serviceRequest.description,
        type: serviceRequest.type,
        priority: serviceRequest.priority,
      });
      setStatus("");
      setAssignedTo("");
      setRejectionReason("");
    }
  }, [open, serviceRequest, form]);
  if (!serviceRequest) return null;
  const submit = async (data: UpdateServiceRequestFormData) => {
    const payload: UpdateServiceRequestPayload = canEditBasics ? data : {};
    if (isAdmin && assignedTo) payload.assignedTo = assignedTo;
    if (status) {
      payload.status = status;
      if (status === "Rejected") payload.rejectionReason = rejectionReason;
    }
    await onSubmit(payload);
    onOpenChange(false);
  };
  const canSave = canEditBasics || isAdmin || statuses.length > 0;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Service Request
          </DialogTitle>
          <DialogDescription>
            Available actions reflect the signed-in user’s role and relationship
            to this request.
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          id="service-request-edit-form"
          onSubmit={form.handleSubmit(submit)}
        >
          <div className="space-y-4">
            {canEditBasics ? (
              <>
                <FormItem>
                  <FormLabel required>Title</FormLabel>
                  <FormControl>
                    <Input {...form.register("title")} />
                  </FormControl>
                  {form.formState.errors.title && (
                    <FormMessage>
                      {form.formState.errors.title.message}
                    </FormMessage>
                  )}
                </FormItem>
                <FormItem>
                  <FormLabel required>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...form.register("description")} />
                  </FormControl>
                  {form.formState.errors.description && (
                    <FormMessage>
                      {form.formState.errors.description.message}
                    </FormMessage>
                  )}
                </FormItem>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormItem>
                    <FormLabel required>Request Type</FormLabel>
                    <FormControl>
                      <Select
                        value={form.watch("type") ?? ""}
                        onValueChange={(value) =>
                          form.setValue(
                            "type",
                            value as UpdateServiceRequestFormData["type"],
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceRequestTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Select
                        value={form.watch("priority") ?? ""}
                        onValueChange={(value) =>
                          form.setValue(
                            "priority",
                            value as UpdateServiceRequestFormData["priority"],
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceRequestPriorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                You can only perform workflow actions available below.
              </p>
            )}
            {isAdmin && (
              <FormItem>
                <FormLabel>Assignee</FormLabel>
                <FormControl>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Leave assignment unchanged" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingAssignees && <SelectItem value="__loading__" disabled>Loading eligible assignees...</SelectItem>}
                      {!isLoadingAssignees && eligibleAssignees.length === 0 && <SelectItem value="__empty__" disabled>No eligible support members are available.</SelectItem>}
                      {eligibleAssignees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employee.name} ({employee.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <p className="text-xs text-muted-foreground">Current assignee: {getServiceRequestUserDisplay(serviceRequest.assignedTo)}</p>
                {isAssigneeError && <p className="text-xs text-destructive">Eligible assignees could not be loaded. Retry after resolving the connection issue.</p>}
              </FormItem>
            )}
            {statuses.length > 0 && (
              <FormItem>
                <FormLabel>Status action</FormLabel>
                <FormControl>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(value as ServiceRequestStatus)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Leave status unchanged" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
              </FormItem>
            )}
            {status === "Rejected" && (
              <FormItem>
                <FormLabel required>Rejection reason</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(event) => setRejectionReason(event.target.value)}
                  />
                </FormControl>
                {!rejectionReason.trim() && (
                  <FormMessage>A rejection reason is required.</FormMessage>
                )}
              </FormItem>
            )}
          </div>
        </Form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="service-request-edit-form"
            disabled={
              isLoading ||
              !canSave ||
              (status === "Rejected" && !rejectionReason.trim())
            }
          >
            {isLoading && <LoadingSpinner size={16} className="mr-2" />}Save
            Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
