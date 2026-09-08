import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/ui/error-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useRcaAssignees } from '@/hooks/useRcas'
import { rcaError } from '@/lib/rcaApi'
import {
  correctiveActionStatuses,
  referenceId,
  type CorrectiveAction,
  type CreateCorrectiveActionPayload,
  type UpdateCorrectiveActionPayload,
} from '@/types/rca'

const schema = z.object({
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  assignedTo: z.string().min(1, 'Select an active administrator'),
  dueDate: z
    .string()
    .min(1, 'Due date is required')
    .refine(
      (value) => !Number.isNaN(new Date(value).getTime()),
      'Enter a valid due date',
    ),
  status: z.enum(correctiveActionStatuses),
})
type Values = z.infer<typeof schema>
function localDate(value?: string) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
export function CorrectiveActionFormDialog({
  action,
  onClose,
  onCreate,
  onUpdate,
}: {
  action?: CorrectiveAction
  onClose: () => void
  onCreate: (payload: CreateCorrectiveActionPayload) => Promise<unknown>
  onUpdate: (payload: UpdateCorrectiveActionPayload) => Promise<unknown>
}) {
  const users = useRcaAssignees()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: action?.title ?? '',
      description: action?.description ?? '',
      assignedTo: referenceId(action?.assignedTo),
      dueDate: localDate(action?.dueDate),
      status: action?.status ?? 'Pending',
    },
  })
  const busy = form.formState.isSubmitting
  const selected = form.watch('assignedTo')
  const submit = async (values: Values) => {
    if (!users.data?.some((user) => user.id === values.assignedTo)) {
      form.setError('assignedTo', {
        message: 'Select an active administrator from the list',
      })
      return
    }
    const payload: CreateCorrectiveActionPayload = {
      title: values.title,
      description: values.description,
      assignedTo: values.assignedTo,
      dueDate:
        action && values.dueDate === localDate(action.dueDate)
          ? action.dueDate
          : new Date(values.dueDate).toISOString(),
    }
    try {
      if (action) await onUpdate({ ...payload, status: values.status })
      else await onCreate(payload)
      onClose()
    } catch (error) {
      form.setError('root', { message: rcaError(error) })
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {action
              ? 'Edit tracked corrective action'
              : 'Add tracked corrective action'}
          </DialogTitle>
          <DialogDescription>
            Assign operational work to an active administrator and track its due
            date and progress.
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(submit)}
          className="space-y-4"
        >
          <fieldset disabled={busy} className="space-y-4">
            <FormItem>
              <FormLabel htmlFor="action-title" required>
                Title
              </FormLabel>
              <Input id="action-title" {...form.register('title')} />
              <FormMessage>{form.formState.errors.title?.message}</FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="action-description" required>
                Description
              </FormLabel>
              <Textarea
                id="action-description"
                rows={4}
                {...form.register('description')}
              />
              <FormMessage>
                {form.formState.errors.description?.message}
              </FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="action-assignee" required>
                Assigned administrator
              </FormLabel>
              {users.isPending ? (
                <LoadingSpinner />
              ) : users.isError ? (
                <ErrorState
                  description={rcaError(users.error)}
                  onRetry={() => void users.refetch()}
                />
              ) : (
                <>
                  <select
                    id="action-assignee"
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    {...form.register('assignedTo')}
                  >
                    <option value="">Select administrator</option>
                    {selected &&
                      !users.data?.some((user) => user.id === selected) && (
                        <option value={selected}>
                          Current assignee unavailable — choose an administrator
                        </option>
                      )}
                    {users.data?.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.email})
                      </option>
                    ))}
                  </select>
                  {!users.data?.length && (
                    <p className="text-sm text-muted-foreground">
                      No active administrators are available.
                    </p>
                  )}
                </>
              )}
              <FormMessage>
                {form.formState.errors.assignedTo?.message}
              </FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="action-due" required>
                Due date (local time)
              </FormLabel>
              <Input
                id="action-due"
                type="datetime-local"
                {...form.register('dueDate')}
              />
              <FormMessage>
                {form.formState.errors.dueDate?.message}
              </FormMessage>
            </FormItem>
            {action ? (
              <FormItem>
                <FormLabel htmlFor="action-status">Status</FormLabel>
                <select
                  id="action-status"
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  {...form.register('status')}
                >
                  {correctiveActionStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </FormItem>
            ) : (
              <p className="text-sm text-muted-foreground">
                New tracked actions start as Pending.
              </p>
            )}
          </fieldset>
          {form.formState.errors.root && (
            <FormMessage role="alert">
              {form.formState.errors.root.message}
            </FormMessage>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={busy || users.isPending || users.isError}
            >
              {busy ? 'Saving…' : 'Save action'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
