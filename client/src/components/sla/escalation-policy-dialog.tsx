import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UserListItem } from '@/types/auth'
import type { CreateEscalationPolicyPayload, EscalationPolicy, UpdateEscalationPolicyPayload } from '@/types/incident'
import type { SupportTeam } from '@/types/supportTeam'

const priorities = ['Low', 'Medium', 'High', 'Critical'] as const
const levels = ['Level 1', 'Level 2', 'Level 3'] as const

const schema = z.object({
  name: z.string().trim().min(1, 'Policy name is required'),
  priority: z.enum(priorities),
  escalationLevel: z.enum(levels),
  thresholdMinutes: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1, 'Threshold must be at least one minute'),
  targetType: z.enum(['User', 'SupportTeam']),
  targetId: z.string().min(1, 'Choose an escalation target'),
  isActive: z.boolean(),
})
type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  policy: EscalationPolicy | null
  users: UserListItem[]
  teams: SupportTeam[]
  submitting: boolean
  onCreate: (payload: CreateEscalationPolicyPayload) => void
  onUpdate: (payload: UpdateEscalationPolicyPayload) => void
}

export function EscalationPolicyDialog({ open, onOpenChange, policy, users, teams, submitting, onCreate, onUpdate }: Props) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', priority: 'High', thresholdMinutes: '30', targetType: 'User', targetId: '', isActive: true },
  })

  useEffect(() => {
    if (!open) return
    const targetType = policy?.targetType ?? 'User'
    const targetId = targetType === 'User' ? policy?.targetUser?._id ?? '' : policy?.targetTeam?._id ?? ''
    form.reset({
      name: policy?.name ?? '',
      priority: policy?.priority ?? 'High',
      escalationLevel: policy?.escalationLevel,
      thresholdMinutes: policy?.thresholdMinutes.toString() ?? '30',
      targetType,
      targetId,
      isActive: policy?.isActive ?? true,
    })
  }, [form, open, policy])

  const targetType = form.watch('targetType')
  const submit = (data: FormData) => {
    const target = data.targetType === 'User' ? { targetUser: data.targetId } : { targetTeam: data.targetId }
    const payload = { name: data.name.trim(), priority: data.priority, escalationLevel: data.escalationLevel, thresholdMinutes: Number(data.thresholdMinutes), targetType: data.targetType, isActive: data.isActive, ...target }
    if (policy) onUpdate(payload)
    else {
      const { isActive: _isActive, ...createPayload } = payload
      onCreate(createPayload)
    }
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{policy ? 'Edit Escalation Policy' : 'Create Escalation Policy'}</DialogTitle><DialogDescription>Escalation targets are validated by the backend against the current organization.</DialogDescription></DialogHeader><Form form={form} id="escalation-policy-form" onSubmit={form.handleSubmit(submit)}><div className="space-y-4"><FormItem><FormLabel required>Policy name</FormLabel><Input {...form.register('name')} />{form.formState.errors.name && <FormMessage>{form.formState.errors.name.message}</FormMessage>}</FormItem><div className="grid gap-4 sm:grid-cols-2"><FormItem><FormLabel required>Priority</FormLabel><Select value={form.watch('priority')} onValueChange={(value) => form.setValue('priority', value as FormData['priority'], { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{priorities.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></FormItem><FormItem><FormLabel required>Escalation level</FormLabel><Select value={form.watch('escalationLevel')} onValueChange={(value) => form.setValue('escalationLevel', value as FormData['escalationLevel'], { shouldValidate: true })}><SelectTrigger><SelectValue placeholder="Select escalation level" /></SelectTrigger><SelectContent>{levels.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>{form.formState.errors.escalationLevel && <FormMessage>{form.formState.errors.escalationLevel.message}</FormMessage>}</FormItem></div><FormItem><FormLabel required>Threshold (minutes)</FormLabel><Input type="number" min="1" step="1" {...form.register('thresholdMinutes')} />{form.formState.errors.thresholdMinutes && <FormMessage>{form.formState.errors.thresholdMinutes.message}</FormMessage>}</FormItem><div className="grid gap-4 sm:grid-cols-2"><FormItem><FormLabel required>Target type</FormLabel><Select value={targetType} onValueChange={(value) => { form.setValue('targetType', value as FormData['targetType']); form.setValue('targetId', '', { shouldValidate: true }) }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="User">User</SelectItem><SelectItem value="SupportTeam">Support Team</SelectItem></SelectContent></Select></FormItem><FormItem><FormLabel required>{targetType === 'User' ? 'Target user' : 'Target support team'}</FormLabel><Select value={form.watch('targetId')} onValueChange={(value) => form.setValue('targetId', value, { shouldValidate: true })}><SelectTrigger><SelectValue placeholder={`Select ${targetType === 'User' ? 'a user' : 'a support team'}`} /></SelectTrigger><SelectContent>{targetType === 'User' ? users.filter((user) => user.isActive).map((user) => <SelectItem key={user.id} value={user.id}>{user.name} ({user.email})</SelectItem>) : teams.filter((team) => team.isActive).map((team) => <SelectItem key={team._id} value={team._id}>{team.name}</SelectItem>)}</SelectContent></Select>{form.formState.errors.targetId && <FormMessage>{form.formState.errors.targetId.message}</FormMessage>}</FormItem></div>{policy && <FormItem><FormLabel>Active status</FormLabel><Button type="button" variant={form.watch('isActive') ? 'default' : 'outline'} onClick={() => form.setValue('isActive', !form.getValues('isActive'))}>{form.watch('isActive') ? 'Active' : 'Inactive'}</Button></FormItem>}</div></Form><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button><Button type="submit" form="escalation-policy-form" disabled={submitting}>{submitting ? 'Saving…' : policy ? 'Save Changes' : 'Create Policy'}</Button></DialogFooter></DialogContent></Dialog>
}
