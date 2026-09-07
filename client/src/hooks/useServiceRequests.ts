import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { serviceRequestApi } from "@/lib/serviceRequestApi";
import type {
  CreateServiceRequestPayload,
  ServiceRequest,
  UpdateServiceRequestPayload,
} from "@/types/serviceRequest";

export const serviceRequestKeys = {
  all: ["service-requests"] as const,
  detail: (id: string) => ["service-requests", id] as const,
};

export function useServiceRequests() {
  return useQuery({
    queryKey: serviceRequestKeys.all,
    queryFn: serviceRequestApi.list,
  });
}

export function useServiceRequest(id: string) {
  return useQuery({
    queryKey: serviceRequestKeys.detail(id),
    queryFn: () => serviceRequestApi.get(id),
    enabled: Boolean(id),
  });
}

function useServiceRequestMutation<T>(
  mutationFn: (value: T) => Promise<ServiceRequest>,
  successMessage: (data: ServiceRequest) => string,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: serviceRequestKeys.all });
      queryClient.setQueryData(serviceRequestKeys.detail(data._id), data);
      toast.success(successMessage(data));
    },
    onError: (error: Error) =>
      toast.error("Service request action failed", {
        description: error.message,
      }),
  });
}

export function useCreateServiceRequest() {
  return useServiceRequestMutation(
    (payload: CreateServiceRequestPayload) => serviceRequestApi.create(payload),
    (data) => `Request ${data.requestId} created`,
  );
}

export function useUpdateServiceRequest() {
  return useServiceRequestMutation(
    ({ id, payload }: { id: string; payload: UpdateServiceRequestPayload }) =>
      serviceRequestApi.update(id, payload),
    (data) => `Request ${data.requestId} updated`,
  );
}

export function useDeleteServiceRequest() {
  return useServiceRequestMutation(
    (id: string) => serviceRequestApi.delete(id),
    (data) => `Request ${data.requestId} deleted`,
  );
}
