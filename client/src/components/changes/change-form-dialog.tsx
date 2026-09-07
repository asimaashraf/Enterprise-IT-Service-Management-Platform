import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { Asset } from '@/types/asset'
import { changeRisks, changeTypes, type Change, type ChangeRisk, type ChangeType, type CreateChangePayload, type UpdateChangePayload } from '@/types/change'

const formSchema = z.object({
  changeId: z.string().trim().min(1, 'Change ID is required'),
  title: z.string().trim().min(1, 'Title is required'),
  description: z.string().trim().min(1, 'Description is required'),
  type: z.enum(changeTypes as [ChangeType, ...ChangeType[]]),
  risk: z.enum(changeRisks as [ChangeRisk, ...ChangeRisk[]]),
  affectedAssets: z.array(z.string()),
  plannedStartAt: z.string(),
  plannedEndAt: z.string(),
  rollbackPlan: z.string(),
}).refine(
  (data) => !data.plannedStartAt || !data.plannedEndAt || new Date(data.plannedEndAt) > new Date(data.plannedStartAt),
  { path: ['plannedEndAt'], message: 'Planned end must be after planned start' },
)

type FormData = z.infer<typeof formSchema>

interface ChangeFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  change: Change | null
  assets: Asset[]
  submitting: boolean
  onCreate: (payload: CreateChangePayload) => void
  onUpdate: (payload: UpdateChangePayload) => void
}

const toDateTimeInput = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (part: number) => String(part).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const toIsoDate = (value: string) => value ? new Date(value).toISOString() : undefined

export function ChangeFormDialog({ open, onOpenChange, change, assets, submitting, onCreate, onUpdate }: ChangeFormDialogProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { changeId: '', title: '', description: '', type: 'Normal', risk: 'Medium', affectedAssets: [], plannedStartAt: '', plannedEndAt: '', rollbackPlan: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      changeId: change?.changeId ?? '',
      title: change?.title ?? '',
      description: change?.description ?? '',
      type: change?.type ?? 'Normal',
      risk: change?.risk ?? 'Medium',
      affectedAssets: change?.affectedAssets?.map((asset) => asset._id) ?? [],
      plannedStartAt: toDateTimeInput(change?.plannedStartAt),
      plannedEndAt: toDateTimeInput(change?.plannedEndAt),
      rollbackPlan: change?.rollbackPlan ?? '',
    })
  }, [change, form, open])

  const submit = (data: FormData) => {
    const sharedPayload = {
      title: data.title.trim(),
      description: data.description.trim(),
      type: data.type,
      risk: data.risk,
      affectedAssets: data.affectedAssets,
      plannedStartAt: toIsoDate(data.plannedStartAt),
      plannedEndAt: toIsoDate(data.plannedEndAt),
      rollbackPlan: data.rollbackPlan.trim() || undefined,
    }
    if (change) onUpdate(sharedPayload)
    else onCreate({ changeId: data.changeId.trim(), ...sharedPayload })
  }

  const selectedAssets = form.watch('affectedAssets')
  const toggleAsset = (assetId: string) => {
    form.setValue('affectedAssets', selectedAssets.includes(assetId) ? selectedAssets.filter((id) => id !== assetId) : [...selectedAssets, assetId], { shouldValidate: true })
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto"><DialogHeader><DialogTitle>{change ? 'Edit Change Request' : 'Create Change Request'}</DialogTitle><DialogDescription>{change ? 'Workflow status and assignment are managed through their dedicated actions.' : 'Submit a controlled change request for review.'}</DialogDescription></DialogHeader><Form form={form} id="change-form" onSubmit={form.handleSubmit(submit)}><div className="grid gap-4 sm:grid-cols-2"><FormItem><FormLabel required>Change ID</FormLabel><Input {...form.register('changeId')} disabled={Boolean(change)} />{form.formState.errors.changeId && <FormMessage>{form.formState.errors.changeId.message}</FormMessage>}</FormItem><FormItem><FormLabel required>Title</FormLabel><Input {...form.register('title')} />{form.formState.errors.title && <FormMessage>{form.formState.errors.title.message}</FormMessage>}</FormItem><FormItem><FormLabel required>Type</FormLabel><Select value={form.watch('type')} onValueChange={(value) => form.setValue('type', value as ChangeType, { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{changeTypes.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></FormItem><FormItem><FormLabel required>Risk</FormLabel><Select value={form.watch('risk')} onValueChange={(value) => form.setValue('risk', value as ChangeRisk, { shouldValidate: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{changeRisks.map((risk) => <SelectItem key={risk} value={risk}>{risk}</SelectItem>)}</SelectContent></Select></FormItem><FormItem><FormLabel>Planned start</FormLabel><Input type="datetime-local" {...form.register('plannedStartAt')} /></FormItem><FormItem><FormLabel>Planned end</FormLabel><Input type="datetime-local" {...form.register('plannedEndAt')} />{form.formState.errors.plannedEndAt && <FormMessage>{form.formState.errors.plannedEndAt.message}</FormMessage>}</FormItem></div><FormItem className="mt-4"><FormLabel required>Description</FormLabel><Textarea rows={4} {...form.register('description')} />{form.formState.errors.description && <FormMessage>{form.formState.errors.description.message}</FormMessage>}</FormItem><FormItem className="mt-4"><FormLabel>Affected assets</FormLabel><div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">{assets.length === 0 ? <p className="text-sm text-muted-foreground">No authorized assets are available.</p> : assets.map((asset) => <label key={asset._id} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={selectedAssets.includes(asset._id)} onChange={() => toggleAsset(asset._id)} /><span>{asset.assetId} — {asset.name}</span></label>)}</div></FormItem><FormItem className="mt-4"><FormLabel>Rollback plan</FormLabel><Textarea rows={3} {...form.register('rollbackPlan')} /></FormItem></Form><DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button><Button type="submit" form="change-form" disabled={submitting}>{submitting ? 'Saving…' : change ? 'Save Changes' : 'Create Change'}</Button></DialogFooter></DialogContent></Dialog>
}
