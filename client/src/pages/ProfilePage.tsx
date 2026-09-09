import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'sonner'
import { Pencil, UserCircle } from 'lucide-react'

import { PageHeader } from '@/components/ui/page-header'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useSettingsScope } from '@/hooks/useSettingsScope'
import { useOrganization } from '@/hooks/useOrganization'
import { useInvalidateUsers } from '@/hooks/useUsers'
import { settingsError } from '@/lib/settingsApi'
import { userApi } from '@/lib/userApi'
import {
  store,
  setCredentials,
  type AppDispatch,
  type RootState,
} from '@/store'
import type { UpdateUserProfilePayload } from '@/types/auth'

const profileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
})

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDate(value?: string) {
  if (!value) return 'Not available'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Not available'
    : date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
}

export function ProfilePage() {
  const user = useSelector((state: RootState) => state.auth.user)
  const dispatch = useDispatch<AppDispatch>()
  const scope = useSettingsScope()
  const invalidateUsers = useInvalidateUsers()
  const organization = useOrganization()
  const [editing, setEditing] = useState(false)
  const form = useForm<UpdateUserProfilePayload>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name ?? '', email: user?.email ?? '' },
  })
  const mutation = useMutation({
    mutationFn: (payload: UpdateUserProfilePayload) => {
      scope.assertAdmin()
      if (!user) throw new Error('Your session is not available.')
      return userApi.updateProfile(user.id, payload)
    },
    onSuccess: async (updated) => {
      if (!scope.isCurrent()) return
      const auth = store.getState().auth
      if (
        !auth.token ||
        !auth.user ||
        updated.id !== auth.user.id ||
        updated.organizationId !== auth.user.organizationId
      )
        return
      dispatch(
        setCredentials({
          token: auth.token,
          user: {
            ...auth.user,
            name: updated.name,
            email: updated.email,
            updatedAt: updated.updatedAt,
          },
        }),
      )
      await invalidateUsers()
      if (!scope.isCurrent()) return
      setEditing(false)
      toast.success('Profile updated')
    },
    onError: (error) => {
      if (scope.isCurrent()) toast.error(settingsError(error))
    },
  })

  if (!user) return null
  const isAdmin = user.role === 'admin'

  return (
    <div className="min-w-0 space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your personal account information."
        icon={UserCircle}
        actions={
          isAdmin && !editing ? (
            <Button
              variant="outline"
              onClick={() => {
                mutation.reset()
                form.reset({ name: user.name, email: user.email })
                setEditing(true)
              }}
            >
              <Pencil className="mr-2 h-4 w-4" />
              Edit profile
            </Button>
          ) : undefined
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 space-y-1">
            <h2 className="break-words text-xl font-semibold">{user.name}</h2>
            <p className="break-all text-sm text-muted-foreground">
              {user.email}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="default">{isAdmin ? 'ADMIN' : 'EMPLOYEE'}</Badge>
              {user.isActive !== undefined && (
                <Badge
                  variant={
                    user.isActive === false ? 'destructive' : 'secondary'
                  }
                >
                  {user.isActive === undefined
                    ? 'Not available'
                    : user.isActive
                      ? 'Active'
                      : 'Disabled'}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Update the personal details used across your workspace.'
              : 'Your account details are managed by your organization administrator.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {editing && isAdmin ? (
            <Form
              form={form}
              id="profile-form"
              onSubmit={form.handleSubmit((payload) =>
                mutation.mutate(payload),
              )}
              noValidate
            >
              <fieldset disabled={mutation.isPending} className="space-y-4">
                <FormItem>
                  <FormLabel htmlFor="profile-name" required>
                    Name
                  </FormLabel>
                  <Input
                    id="profile-name"
                    autoFocus
                    required
                    autoComplete="name"
                    {...form.register('name')}
                    aria-invalid={!!form.formState.errors.name}
                    aria-describedby="profile-name-error"
                  />
                  <FormMessage id="profile-name-error">
                    {form.formState.errors.name?.message}
                  </FormMessage>
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="profile-email" required>
                    Email
                  </FormLabel>
                  <Input
                    id="profile-email"
                    type="email"
                    required
                    autoComplete="email"
                    {...form.register('email')}
                    aria-invalid={!!form.formState.errors.email}
                    aria-describedby="profile-email-error"
                  />
                  <FormMessage id="profile-email-error">
                    {form.formState.errors.email?.message}
                  </FormMessage>
                </FormItem>
                {mutation.isError && (
                  <FormMessage role="alert">
                    {settingsError(mutation.error)}
                  </FormMessage>
                )}
              </fieldset>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    form.reset({ name: user.name, email: user.email })
                    setEditing(false)
                  }}
                  disabled={mutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  form="profile-form"
                  disabled={mutation.isPending || !form.formState.isDirty}
                >
                  {mutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </Form>
          ) : (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="mt-1 break-words font-medium">{user.name}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="mt-1 break-all font-medium">{user.email}</dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Role</dt>
                <dd className="mt-1 font-medium">
                  {isAdmin ? 'ADMIN' : 'EMPLOYEE'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">
                  {organization.data?.name ? 'Organization' : 'Organization ID'}
                </dt>
                <dd className="mt-1 break-all font-medium">
                  {organization.data?.name ?? user.organizationId}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Account status</dt>
                <dd className="mt-1 font-medium">
                  {user.isActive === undefined
                    ? 'Not available'
                    : user.isActive
                      ? 'Active'
                      : 'Disabled'}
                </dd>
              </div>
              <div className="min-w-0">
                <dt className="text-muted-foreground">Joined</dt>
                <dd className="mt-1 font-medium">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
