import { z } from "zod";

export const serviceRequestTypeOptions = [
  { label: "Software", value: "Software Installation" },
  { label: "Hardware", value: "Hardware Purchase" },
  { label: "Email", value: "Email Access" },
  { label: "VPN", value: "VPN Access" },
  { label: "Account", value: "Account Creation" },
  { label: "Password Reset", value: "Password Reset" },
  { label: "Cloud Resource", value: "Cloud Resource Request" },
] as const;

export const serviceRequestPriorityOptions = [
  { label: "Low", value: "Low" },
  { label: "Medium", value: "Medium" },
  { label: "High", value: "High" },
  { label: "Critical", value: "Critical" },
] as const;

export const createServiceRequestSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  type: z.enum([
    "Software Installation",
    "Hardware Purchase",
    "Email Access",
    "VPN Access",
    "Account Creation",
    "Password Reset",
    "Cloud Resource Request",
  ]),
  priority: z.enum(["Low", "Medium", "High", "Critical"]).optional(),
});

export const updateServiceRequestSchema = createServiceRequestSchema;
export type CreateServiceRequestFormData = z.infer<
  typeof createServiceRequestSchema
>;
export type UpdateServiceRequestFormData = z.infer<
  typeof updateServiceRequestSchema
>;
