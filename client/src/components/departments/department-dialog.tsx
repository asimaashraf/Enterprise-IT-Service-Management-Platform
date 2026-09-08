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
import { useDepartmentMutation } from '@/hooks/useDepartments'
import { settingsError } from '@/lib/settingsApi'
import type { Department } from '@/types/department'

const schema = z.object({
  name: z.string().trim().min(1, 'Department name is required'),
  description: z.string().trim(),
  isActive: z.boolean(),
})

// Mounted per open/edit target so canceled values never carry into the next form.
export function DepartmentDialog({
  department,
  onClose,
}: {
  department: Department | null
  onClose: () => void
}) {
  const mutation = useDepartmentMutation(onClose)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: department?.name ?? '',
      description: department?.description ?? '',
      isActive: department?.isActive ?? true,
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {department ? 'Edit department' : 'Create department'}
          </DialogTitle>
          <DialogDescription>
            {department
              ? 'Update department information and availability.'
              : 'Add a department to your organization. New departments are active.'}
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          id="department-form"
          onSubmit={form.handleSubmit(({ name, description, isActive }) => {
            if (department)
              mutation.mutate({
                kind: 'update',
                id: department._id,
                payload: { name, description, isActive },
              })
            else
              mutation.mutate({
                kind: 'create',
                payload: { name, description },
              })
          })}
        >
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <FormItem>
              <FormLabel htmlFor="department-name" required>
                Name
              </FormLabel>
              <Input
                id="department-name"
                {...form.register('name')}
                aria-invalid={!!form.formState.errors.name}
                aria-describedby="department-name-error"
              />
              <FormMessage id="department-name-error">
                {form.formState.errors.name?.message}
              </FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="department-description">
                Description
              </FormLabel>
              <Textarea
                id="department-description"
                rows={3}
                {...form.register('description')}
              />
            </FormItem>
            {department && (
              <label className="flex items-center gap-2 text-sm font-medium">
                <input type="checkbox" {...form.register('isActive')} />
                Active department
              </label>
            )}
            {mutation.isError && (
              <FormMessage role="alert">
                {settingsError(mutation.error)}
              </FormMessage>
            )}
          </fieldset>
        </Form>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="department-form"
            disabled={
              mutation.isPending || (!!department && !form.formState.isDirty)
            }
          >
            {mutation.isPending
              ? 'Saving…'
              : department
                ? 'Save changes'
                : 'Create department'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
