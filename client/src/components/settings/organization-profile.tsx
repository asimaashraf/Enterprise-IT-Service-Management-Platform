import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Pencil } from 'lucide-react'
import { useOrganization, useUpdateOrganization } from '@/hooks/useOrganization'
import { useSettingsScope } from '@/hooks/useSettingsScope'
import { settingsError } from '@/lib/settingsApi'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ErrorState } from '@/components/ui/error-state'
import { EmptyState } from '@/components/ui/empty-state'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import type { Organization } from '@/types/organization'

const schema = z.object({
  name: z.string().trim().min(1, 'Organization name is required'),
  slug: z.string().trim().min(1, 'Slug is required').toLowerCase(),
  description: z.string().trim(),
})

function ProfileContent({
  organization,
  isAdmin,
}: {
  organization: Organization
  isAdmin: boolean
}) {
  const [editing, setEditing] = useState(false)
  const mutation = useUpdateOrganization(() => setEditing(false))
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: organization.name,
      slug: organization.slug,
      description: organization.description ?? '',
    },
  })
  const startEditing = () => {
    form.reset({
      name: organization.name,
      slug: organization.slug,
      description: organization.description ?? '',
    })
    mutation.reset()
    setEditing(true)
  }
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>
            {isAdmin
              ? 'Manage your organization’s name and description.'
              : 'Your organization’s information. Contact an administrator for changes.'}
          </CardDescription>
        </div>
        {isAdmin && !editing && (
          <Button variant="outline" size="sm" onClick={startEditing}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit profile
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        {editing && isAdmin ? (
          <Form
            form={form}
            onSubmit={form.handleSubmit((payload) => mutation.mutate(payload))}
          >
            <fieldset disabled={mutation.isPending} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormItem>
                  <FormLabel htmlFor="organization-name" required>
                    Organization name
                  </FormLabel>
                  <Input
                    id="organization-name"
                    {...form.register('name')}
                    aria-invalid={!!form.formState.errors.name}
                    aria-describedby="organization-name-error"
                  />
                  <FormMessage id="organization-name-error">
                    {form.formState.errors.name?.message}
                  </FormMessage>
                </FormItem>
                <FormItem>
                  <FormLabel htmlFor="organization-slug" required>
                    Slug
                  </FormLabel>
                  <Input
                    id="organization-slug"
                    {...form.register('slug')}
                    aria-invalid={!!form.formState.errors.slug}
                    aria-describedby="organization-slug-hint organization-slug-error"
                  />
                  <p
                    id="organization-slug-hint"
                    className="text-xs text-muted-foreground"
                  >
                    Saved in lowercase.
                  </p>
                  <FormMessage id="organization-slug-error">
                    {form.formState.errors.slug?.message}
                  </FormMessage>
                </FormItem>
              </div>
              <FormItem>
                <FormLabel htmlFor="organization-description">
                  Description
                </FormLabel>
                <Textarea
                  id="organization-description"
                  rows={3}
                  {...form.register('description')}
                />
              </FormItem>
              {mutation.isError && (
                <FormMessage role="alert">
                  {settingsError(mutation.error)}
                </FormMessage>
              )}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!form.formState.isDirty || mutation.isPending}
                >
                  {mutation.isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </fieldset>
          </Form>
        ) : (
          <dl className="grid gap-4 text-sm md:grid-cols-2">
            <div className="min-w-0">
              <dt className="text-muted-foreground">Organization name</dt>
              <dd className="mt-1 break-words font-medium">
                {organization.name}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-muted-foreground">Slug</dt>
              <dd className="mt-1 break-all font-medium">
                {organization.slug}
              </dd>
            </div>
            <div className="min-w-0 md:col-span-2">
              <dt className="text-muted-foreground">Description</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">
                {organization.description || 'No description provided.'}
              </dd>
            </div>
          </dl>
        )}
        {(organization.createdAt || organization.updatedAt) && (
          <dl className="flex flex-wrap gap-x-8 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
            {organization.createdAt && (
              <div>
                <dt>Created</dt>
                <dd>{new Date(organization.createdAt).toLocaleString()}</dd>
              </div>
            )}
            {organization.updatedAt && (
              <div>
                <dt>Last updated</dt>
                <dd>{new Date(organization.updatedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        )}
      </CardContent>
    </Card>
  )
}

export function OrganizationProfile() {
  const scope = useSettingsScope()
  const query = useOrganization()
  if (!scope.enabled)
    return (
      <EmptyState
        title="Organization unavailable"
        description="An authenticated organization session is required."
      />
    )
  if (query.isPending)
    return (
      <div className="rounded-lg border p-8">
        <LoadingSpinner label="Loading organization profile" />
      </div>
    )
  if (query.isError)
    return (
      <ErrorState
        description={settingsError(query.error)}
        onRetry={() => query.refetch()}
      />
    )
  if (!query.data)
    return (
      <EmptyState
        title="Organization not found"
        description="Contact your administrator for assistance."
      />
    )
  return (
    <ProfileContent
      key={JSON.stringify(scope.key)}
      organization={query.data}
      isAdmin={scope.isAdmin}
    />
  )
}
