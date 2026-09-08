import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ClipboardPlus } from "lucide-react";
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
import {
  createServiceRequestSchema,
  serviceRequestPriorityOptions,
  serviceRequestTypeOptions,
  type CreateServiceRequestFormData,
} from "./service-request-form";

export function ServiceRequestCreateDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateServiceRequestFormData) => Promise<void>;
  isLoading?: boolean;
}) {
  const form = useForm<CreateServiceRequestFormData>({
    resolver: zodResolver(createServiceRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "Medium",
    },
  });
  useEffect(() => {
    if (open)
      form.reset({
        title: "",
        description: "",
        priority: "Medium",
      });
  }, [open, form]);
  const submit = async (data: CreateServiceRequestFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPlus className="h-5 w-5 text-primary" />
            Create Service Request
          </DialogTitle>
          <DialogDescription>
            Submit a request using the fields required by the service request
            API.
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          id="service-request-create-form"
          onSubmit={form.handleSubmit(submit)}
        >
          <div className="space-y-4">
            <FormItem>
              <FormLabel htmlFor="service-request-title" required>Title</FormLabel>
              <FormControl>
                <Input
                  id="service-request-title"
                  placeholder="Brief request summary"
                  {...form.register("title")}
                />
              </FormControl>
              {form.formState.errors.title && (
                <FormMessage>{form.formState.errors.title.message}</FormMessage>
              )}
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="service-request-description" required>Description</FormLabel>
              <FormControl>
                <Textarea
                  id="service-request-description"
                  rows={4}
                  placeholder="Describe what you need"
                  {...form.register("description")}
                />
              </FormControl>
              {form.formState.errors.description && (
                <FormMessage>
                  {form.formState.errors.description.message}
                </FormMessage>
              )}
            </FormItem>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormItem>
                <FormLabel htmlFor="service-request-type" required>Request Type</FormLabel>
                <FormControl>
                  <Select
                    value={form.watch("type") ?? ""}
                    onValueChange={(value) =>
                      form.setValue(
                        "type",
                        value as CreateServiceRequestFormData["type"],
                        { shouldValidate: true },
                      )
                    }
                  >
                    <SelectTrigger id="service-request-type">
                      <SelectValue placeholder="Select type" />
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
                {form.formState.errors.type && (
                  <FormMessage>
                    {form.formState.errors.type.message}
                  </FormMessage>
                )}
              </FormItem>
              <FormItem>
                <FormLabel htmlFor="service-request-priority">Priority</FormLabel>
                <FormControl>
                  <Select
                    value={form.watch("priority") ?? ""}
                    onValueChange={(value) =>
                      form.setValue(
                        "priority",
                        value as CreateServiceRequestFormData["priority"],
                      )
                    }
                  >
                    <SelectTrigger id="service-request-priority">
                      <SelectValue placeholder="Medium" />
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
            form="service-request-create-form"
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner size={16} className="mr-2" />}Create
            Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
