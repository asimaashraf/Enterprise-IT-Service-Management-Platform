import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { Incident, UpdateIncidentPayload } from '@/types/incident'
import {
  type CreateIncidentFormData,
  createIncidentSchema,
  incidentPriorityOptions,
  incidentSeverityOptions,
} from './incident-form'

interface IncidentFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incident?: Incident
  isAdmin: boolean
  currentUserId?: string
  onSubmit: (data: CreateIncidentFormData | UpdateIncidentPayload) => Promise<void>
  isLoading?: boolean
}

export function IncidentFormDialog({
  open,
  onOpenChange,
  incident,
  isAdmin: _isAdmin,
  onSubmit,
  isLoading = false,
}: IncidentFormDialogProps) {
  const isEdit = Boolean(incident)

  const form = useForm<CreateIncidentFormData>({
    resolver: zodResolver(createIncidentSchema),
    defaultValues: {
      title: incident?.title ?? '',
      description: incident?.description ?? '',
      priority: incident?.priority,
      severity: incident?.severity,
    },
  })

  // Reset form when dialog opens/closes or incident changes
  useEffect(() => {
    if (open) {
      form.reset({
        title: incident?.title ?? '',
        description: incident?.description ?? '',
        priority: incident?.priority,
        severity: incident?.severity,
      })
    }
  }, [open, incident, form])

  const handleSubmit = async (data: CreateIncidentFormData) => {
    await onSubmit(data)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            {isEdit ? 'Edit Incident' : 'Create Incident'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the incident details below.'
              : 'Fill in the details to report a new incident.'}
          </DialogDescription>
        </DialogHeader>

        {/* The shadcn Form component renders a native <form> and provides the RHF
            context to all children. Passing onSubmit={form.handleSubmit(handleSubmit)}
            wires the React Hook Form submission pipeline to the native form element. */}
        <Form form={form} id="incident-form" onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4">
            {/* Title */}
            <FormItem>
              <FormLabel htmlFor="incident-title" required>Title</FormLabel>
              <FormControl>
                <Input
                  id="incident-title"
                  placeholder="Brief summary of the incident"
                  {...form.register('title')}
                  aria-invalid={!!form.formState.errors.title}
                />
              </FormControl>
              {form.formState.errors.title && (
                <FormMessage>{form.formState.errors.title.message}</FormMessage>
              )}
            </FormItem>

            {/* Description */}
            <FormItem>
              <FormLabel htmlFor="incident-description" required>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the incident in detail…"
                  id="incident-description"
                  rows={4}
                  {...form.register('description')}
                  aria-invalid={!!form.formState.errors.description}
                />
              </FormControl>
              {form.formState.errors.description && (
                <FormMessage>{form.formState.errors.description.message}</FormMessage>
              )}
            </FormItem>

            {/* Priority */}
            <FormItem>
              <FormLabel htmlFor="incident-priority">Priority</FormLabel>
              <FormControl>
                <Select
                  value={form.watch('priority') ?? ''}
                  onValueChange={(v) => form.setValue('priority', v as CreateIncidentFormData['priority'], { shouldValidate: true })}
                >
                  <SelectTrigger id="incident-priority">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentPriorityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>

            {/* Severity */}
            <FormItem>
              <FormLabel htmlFor="incident-severity">Severity</FormLabel>
              <FormControl>
                <Select
                  value={form.watch('severity') ?? ''}
                  onValueChange={(v) => form.setValue('severity', v as CreateIncidentFormData['severity'], { shouldValidate: true })}
                >
                  <SelectTrigger id="incident-severity">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {incidentSeverityOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
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
            form="incident-form"
            disabled={isLoading}
          >
            {isLoading && <LoadingSpinner size={16} className="mr-2" />}
            {isEdit ? 'Save Changes' : 'Create Incident'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
