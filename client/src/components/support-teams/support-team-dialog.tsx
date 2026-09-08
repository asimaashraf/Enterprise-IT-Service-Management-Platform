import { useEffect } from 'react'
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
import type { UserListItem } from '@/types/auth'
import type {
  CreateSupportTeamPayload,
  SupportTeam,
  UpdateSupportTeamPayload,
} from '@/types/supportTeam'

const supportTeamSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  description: z.string().optional(),
  members: z.array(z.string()),
  isActive: z.boolean(),
})

type SupportTeamFormData = z.infer<typeof supportTeamSchema>

interface SupportTeamDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  team: SupportTeam | null
  candidates: UserListItem[]
  candidatesLoading: boolean
  candidatesError: boolean
  submitting: boolean
  onCreate: (payload: CreateSupportTeamPayload) => void
  onUpdate: (payload: UpdateSupportTeamPayload) => void
}

export function SupportTeamDialog({
  open,
  onOpenChange,
  team,
  candidates,
  candidatesLoading,
  candidatesError,
  submitting,
  onCreate,
  onUpdate,
}: SupportTeamDialogProps) {
  const form = useForm<SupportTeamFormData>({
    resolver: zodResolver(supportTeamSchema),
    defaultValues: { name: '', description: '', members: [], isActive: true },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: team?.name ?? '',
      description: team?.description ?? '',
      members: team?.members ?? [],
      isActive: team?.isActive ?? true,
    })
  }, [form, open, team])

  const submit = (data: SupportTeamFormData) => {
    if (submitting || candidatesLoading || candidatesError || data.members.some((id) => !candidates.some((candidate) => candidate.id === id))) {
      form.setError('members', { message: 'Choose available active administrators before saving.' })
      return
    }
    const sharedPayload = {
      name: data.name,
      description: data.description?.trim() ?? '',
      members: data.members,
    }
    if (team) {
      onUpdate({ ...sharedPayload, isActive: data.isActive })
      return
    }
    onCreate(sharedPayload)
  }

  const members = form.watch('members')
  const unavailableMembers = members.filter((id) => !candidates.some((candidate) => candidate.id === id))

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!submitting) onOpenChange(next) }}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{team ? 'Edit Support Team' : 'Create Support Team'}</DialogTitle>
          <DialogDescription>
            Only active administrators can be operational support team members.
          </DialogDescription>
        </DialogHeader>

        <Form form={form} id="support-team-form" onSubmit={form.handleSubmit(submit)}>
          <div className="space-y-4">
            <FormItem>
              <FormLabel required>Name</FormLabel>
              <Input {...form.register('name')} aria-invalid={!!form.formState.errors.name} />
              {form.formState.errors.name && <FormMessage>{form.formState.errors.name.message}</FormMessage>}
            </FormItem>

            <FormItem>
              <FormLabel>Description</FormLabel>
              <Textarea rows={3} {...form.register('description')} />
            </FormItem>

            {team && (
              <FormItem>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input type="checkbox" {...form.register('isActive')} />
                  Active support team
                </label>
              </FormItem>
            )}

            <FormItem>
              <FormLabel>Operational members</FormLabel>
              <p className="text-xs text-muted-foreground">
                Select active ADMIN users. The backend validates tenant scope and membership eligibility.
              </p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">
                {candidatesLoading && <p className="text-sm text-muted-foreground">Loading administrators…</p>}
                {candidatesError && <p className="text-sm text-destructive">Administrators could not be loaded.</p>}
                {!candidatesLoading && !candidatesError && candidates.length === 0 && (
                  <p className="text-sm text-muted-foreground">No active administrators are available.</p>
                )}
                {candidates.map((candidate) => (
                  <label key={candidate.id} className="flex cursor-pointer items-start gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={members.includes(candidate.id)}
                      onChange={(event) => {
                        const next = event.target.checked
                          ? [...members, candidate.id]
                          : members.filter((id) => id !== candidate.id)
                        form.setValue('members', next, { shouldDirty: true })
                      }}
                    />
                    <span>
                      <span className="block font-medium">{candidate.name}</span>
                      <span className="text-muted-foreground">{candidate.email}</span>
                    </span>
                  </label>
                ))}
                {!candidatesLoading && !candidatesError && unavailableMembers.map((id) => (
                  <label key={id} className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked disabled={submitting} onChange={() => form.setValue('members', members.filter((member) => member !== id), { shouldDirty: true })} />
                    <span className="break-all text-muted-foreground">Unavailable member ({id}). Remove this selection before saving; membership requires an active administrator.</span>
                  </label>
                ))}
              </div>
              {form.formState.errors.members && <FormMessage>{form.formState.errors.members.message}</FormMessage>}
            </FormItem>
          </div>
        </Form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" form="support-team-form" disabled={submitting || candidatesLoading || candidatesError || unavailableMembers.length > 0}>
            {submitting ? 'Saving…' : team ? 'Save Changes' : 'Create Team'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
