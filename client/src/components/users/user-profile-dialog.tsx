import { useForm } from 'react-hook-form'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
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
import { Badge } from '@/components/ui/badge'
import { useSettingsScope } from '@/hooks/useSettingsScope'
import { useInvalidateUsers } from '@/hooks/useUsers'
import { userApi } from '@/lib/userApi'
import { settingsError } from '@/lib/settingsApi'
import { store } from '@/store'
import { setCredentials } from '@/store/authSlice'
import type { UserListItem, UpdateUserProfilePayload } from '@/types/auth'

const schema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
})

export function UserProfileDialog({
  user,
  onClose,
}: {
  user: UserListItem
  onClose: () => void
}) {
  const scope = useSettingsScope()
  const invalidate = useInvalidateUsers()
  const form = useForm<UpdateUserProfilePayload>({
    resolver: zodResolver(schema),
    defaultValues: { name: user.name, email: user.email },
  })
  const mutation = useMutation({
    mutationFn: (payload: UpdateUserProfilePayload) => {
      scope.assertAdmin()
      return userApi.updateProfile(user.id, payload)
    },
    onSuccess: async (updated) => {
      if (!scope.isCurrent()) return
      const auth = store.getState().auth
      if (auth.user?.id === updated.id && auth.token) {
        // Refresh self display fields only; role/status remain dedicated actions.
        store.dispatch(
          setCredentials({
            token: auth.token,
            user: { ...auth.user, name: updated.name, email: updated.email },
          }),
        )
      }
      await invalidate()
      if (!scope.isCurrent()) return
      toast.success('User profile updated')
      onClose()
    },
    onError: (error) => {
      if (scope.isCurrent()) toast.error(settingsError(error))
    },
  })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose()
      }}
    >
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit user profile</DialogTitle>
          <DialogDescription>
            Update name and email. Role and status are managed through separate
            actions.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">
            {user.role === 'admin' ? 'ADMIN' : 'EMPLOYEE'}
          </Badge>
          <Badge variant="secondary">
            {user.isActive ? 'Active' : 'Disabled'}
          </Badge>
        </div>
        <Form
          form={form}
          id="user-profile-form"
          onSubmit={form.handleSubmit((payload) => mutation.mutate(payload))}
          noValidate
        >
          <fieldset disabled={mutation.isPending} className="space-y-4">
            <FormItem>
              <FormLabel htmlFor="user-profile-name" required>
                Name
              </FormLabel>
              <Input
                id="user-profile-name"
                autoComplete="name"
                {...form.register('name')}
                aria-invalid={!!form.formState.errors.name}
                aria-describedby="user-profile-name-error"
              />
              <FormMessage id="user-profile-name-error">
                {form.formState.errors.name?.message}
              </FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="user-profile-email" required>
                Email
              </FormLabel>
              <Input
                id="user-profile-email"
                type="email"
                autoComplete="email"
                {...form.register('email')}
                aria-invalid={!!form.formState.errors.email}
                aria-describedby="user-profile-email-error"
              />
              <FormMessage id="user-profile-email-error">
                {form.formState.errors.email?.message}
              </FormMessage>
            </FormItem>
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
            disabled={mutation.isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="user-profile-form"
            disabled={mutation.isPending || !form.formState.isDirty}
          >
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
