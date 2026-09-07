import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Incident } from '@/types/incident'
import type { CreateSLAPayload } from '@/types/sla'

const weekdays = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 0, label: 'Sun' },
]

const schema = z.object({
  incidentId: z.string().min(1, 'Choose an incident'),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:mm'),
  timezone: z.string().trim().min(1, 'Timezone is required'),
  workingDays: z.array(z.number().int().min(0).max(6)).min(1, 'Choose at least one working day'),
}).refine((value) => value.endTime > value.startTime, { path: ['endTime'], message: 'End time must be after start time' })

type FormData = z.infer<typeof schema>

interface SLAConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidents: Incident[]
  submitting: boolean
  onSubmit: (payload: CreateSLAPayload) => void
}

export function SLACreateDialog({ open, onOpenChange, incidents, submitting, onSubmit }: SLAConfigDialogProps) {
  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { incidentId: '', startTime: '09:00', endTime: '17:00', timezone: 'Asia/Karachi', workingDays: [1, 2, 3, 4, 5] } })
  useEffect(() => { if (open) form.reset() }, [form, open])
  const toggleDay = (day: number) => {
    const current = form.getValues('workingDays')
    form.setValue('workingDays', current.includes(day) ? current.filter((value) => value !== day) : [...current, day], { shouldValidate: true })
  }
  const submit = (data: FormData) => onSubmit({ incidentId: data.incidentId, businessHours: { startTime: data.startTime, endTime: data.endTime, timezone: data.timezone.trim(), workingDays: data.workingDays } })

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Configure Incident SLA</DialogTitle><DialogDescription>Targets are determined by the selected incident’s priority using the backend SLA rules.</DialogDescription></DialogHeader><Form form={form} id="sla-config-form" onSubmit={form.handleSubmit(submit)}><div className="space-y-4"><FormItem><FormLabel required>Incident</FormLabel><Select value={form.watch('incidentId')} onValueChange={(value) => form.setValue('incidentId', value, { shouldValidate: true })}><SelectTrigger><SelectValue placeholder="Select an incident" /></SelectTrigger><SelectContent>{incidents.map((incident) => <SelectItem key={incident._id} value={incident._id}>{incident.incidentId} — {incident.title}</SelectItem>)}</SelectContent></Select>{form.formState.errors.incidentId && <FormMessage>{form.formState.errors.incidentId.message}</FormMessage>}</FormItem><div className="grid gap-4 sm:grid-cols-2"><FormItem><FormLabel required>Start time</FormLabel><Input type="time" {...form.register('startTime')} />{form.formState.errors.startTime && <FormMessage>{form.formState.errors.startTime.message}</FormMessage>}</FormItem><FormItem><FormLabel required>End time</FormLabel><Input type="time" {...form.register('endTime')} />{form.formState.errors.endTime && <FormMessage>{form.formState.errors.endTime.message}</FormMessage>}</FormItem></div><FormItem><FormLabel required>Timezone</FormLabel><Input placeholder="e.g. Asia/Karachi" {...form.register('timezone')} />{form.formState.errors.timezone && <FormMessage>{form.formState.errors.timezone.message}</FormMessage>}</FormItem><FormItem><FormLabel required>Working days</FormLabel><div className="flex flex-wrap gap-2">{weekdays.map((day) => <Button key={day.value} type="button" size="sm" variant={form.watch('workingDays').includes(day.value) ? 'default' : 'outline'} aria-pressed={form.watch('workingDays').includes(day.value)} onClick={() => toggleDay(day.value)}>{day.label}</Button>)}</div>{form.formState.errors.workingDays && <FormMessage>{form.formState.errors.workingDays.message}</FormMessage>}</FormItem></div></Form><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button><Button type="submit" form="sla-config-form" disabled={submitting || incidents.length === 0}>{submitting ? 'Configuring…' : 'Configure SLA'}</Button></DialogFooter></DialogContent></Dialog>
}
