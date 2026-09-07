import apiClient from "@/lib/apiClient";
import type {
  ApiEnvelope,
  CreateServiceRequestPayload,
  ServiceRequest,
  UpdateServiceRequestPayload,
} from "@/types/serviceRequest";

const unwrap = <T>(response: { data: unknown }): T => {
  const envelope = response.data as ApiEnvelope<T>;
  if (!envelope.success || envelope.data === undefined)
    throw new Error(envelope.message || "Request failed");
  return envelope.data;
};

export const serviceRequestApi = {
  async list(): Promise<ServiceRequest[]> {
    return unwrap(
      await apiClient.get<ApiEnvelope<ServiceRequest[]>>("/service-requests"),
    );
  },
  async get(id: string): Promise<ServiceRequest> {
    return unwrap(
      await apiClient.get<ApiEnvelope<ServiceRequest>>(
        `/service-requests/${id}`,
      ),
    );
  },
  async create(payload: CreateServiceRequestPayload): Promise<ServiceRequest> {
    return unwrap(
      await apiClient.post<ApiEnvelope<ServiceRequest>>(
        "/service-requests",
        payload,
      ),
    );
  },
  async update(
    id: string,
    payload: UpdateServiceRequestPayload,
  ): Promise<ServiceRequest> {
    return unwrap(
      await apiClient.put<ApiEnvelope<ServiceRequest>>(
        `/service-requests/${id}`,
        payload,
      ),
    );
  },
  async delete(id: string): Promise<ServiceRequest> {
    return unwrap(
      await apiClient.delete<ApiEnvelope<ServiceRequest>>(
        `/service-requests/${id}`,
      ),
    );
  },
};
