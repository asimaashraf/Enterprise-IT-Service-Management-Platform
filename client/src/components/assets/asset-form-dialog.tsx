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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
  Asset,
  AssetCategory,
  CreateAssetPayload,
  UpdateAssetPayload,
} from '@/types/asset'

const assetCategories: AssetCategory[] = [
  'Laptop',
  'Desktop',
  'Server',
  'Switch',
  'Router',
  'License',
  'Mobile Device',
]

const assetFormSchema = z
  .object({
    assetId: z.string().trim().min(1, 'Asset ID is required'),
    name: z.string().trim().min(1, 'Name is required'),
    category: z.enum(assetCategories as [AssetCategory, ...AssetCategory[]]),
    description: z.string().optional(),
    purchaseDate: z.string().optional(),
    purchasePrice: z
      .string()
      .refine(
        (value) => value === '' || (!Number.isNaN(Number(value)) && Number(value) >= 0),
        'Purchase price must be zero or greater',
      ),
    warrantyProvider: z.string().optional(),
    warrantyStartDate: z.string().optional(),
    warrantyEndDate: z.string().optional(),
  })
  .refine(
    (data) =>
      !data.warrantyStartDate ||
      !data.warrantyEndDate ||
      data.warrantyEndDate >= data.warrantyStartDate,
    {
      message: 'Warranty end date must be on or after the start date',
      path: ['warrantyEndDate'],
    },
  )

type AssetFormData = z.infer<typeof assetFormSchema>

interface AssetFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset | null
  submitting: boolean
  onCreate: (payload: CreateAssetPayload) => void
  onUpdate: (payload: UpdateAssetPayload) => void
}

const toDateInput = (value?: string) => (value ? value.slice(0, 10) : '')

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  submitting,
  onCreate,
  onUpdate,
}: AssetFormDialogProps) {
  const form = useForm<AssetFormData>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      assetId: '',
      name: '',
      category: 'Laptop',
      description: '',
      purchaseDate: '',
      purchasePrice: '',
      warrantyProvider: '',
      warrantyStartDate: '',
      warrantyEndDate: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      assetId: asset?.assetId ?? '',
      name: asset?.name ?? '',
      category: asset?.category ?? 'Laptop',
      description: asset?.description ?? '',
      purchaseDate: toDateInput(asset?.purchaseDate),
      purchasePrice: asset?.purchasePrice?.toString() ?? '',
      warrantyProvider: asset?.warrantyProvider ?? '',
      warrantyStartDate: toDateInput(asset?.warrantyStartDate),
      warrantyEndDate: toDateInput(asset?.warrantyEndDate),
    })
  }, [asset, form, open])

  const submit = (data: AssetFormData) => {
    const sharedPayload = {
      name: data.name,
      category: data.category,
      description: data.description?.trim() || undefined,
      purchaseDate: data.purchaseDate || undefined,
      purchasePrice: data.purchasePrice === '' ? undefined : Number(data.purchasePrice),
      warrantyProvider: data.warrantyProvider?.trim() || undefined,
      warrantyStartDate: data.warrantyStartDate || undefined,
      warrantyEndDate: data.warrantyEndDate || undefined,
    }
    if (asset) {
      onUpdate(sharedPayload)
      return
    }
    onCreate({ assetId: data.assetId, ...sharedPayload })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? 'Edit Asset' : 'Create Asset'}</DialogTitle>
          <DialogDescription>
            Assignment and lifecycle changes are managed through their dedicated actions.
          </DialogDescription>
        </DialogHeader>
        <Form form={form} id="asset-form" onSubmit={form.handleSubmit(submit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormItem>
              <FormLabel htmlFor="asset-id" required>Asset ID</FormLabel>
              <Input
                id="asset-id"
                {...form.register('assetId')}
                disabled={Boolean(asset)}
                aria-invalid={Boolean(form.formState.errors.assetId)}
              />
              {form.formState.errors.assetId && <FormMessage>{form.formState.errors.assetId.message}</FormMessage>}
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="asset-name" required>Name</FormLabel>
              <Input id="asset-name" {...form.register('name')} aria-invalid={Boolean(form.formState.errors.name)} />
              {form.formState.errors.name && <FormMessage>{form.formState.errors.name.message}</FormMessage>}
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="asset-category" required>Category</FormLabel>
              <Select
                value={form.watch('category')}
                onValueChange={(value) => form.setValue('category', value as AssetCategory, { shouldValidate: true })}
              >
                <SelectTrigger id="asset-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assetCategories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="asset-purchase-price">Purchase price</FormLabel>
              <Input id="asset-purchase-price" type="number" min="0" step="0.01" {...form.register('purchasePrice')} />
              {form.formState.errors.purchasePrice && <FormMessage>{form.formState.errors.purchasePrice.message}</FormMessage>}
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="asset-purchase-date">Purchase date</FormLabel>
              <Input id="asset-purchase-date" type="date" {...form.register('purchaseDate')} />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="asset-warranty-provider">Warranty provider</FormLabel>
              <Input id="asset-warranty-provider" {...form.register('warrantyProvider')} />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="asset-warranty-start">Warranty start date</FormLabel>
              <Input id="asset-warranty-start" type="date" {...form.register('warrantyStartDate')} />
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="asset-warranty-end">Warranty end date</FormLabel>
              <Input id="asset-warranty-end" type="date" {...form.register('warrantyEndDate')} />
              {form.formState.errors.warrantyEndDate && <FormMessage>{form.formState.errors.warrantyEndDate.message}</FormMessage>}
            </FormItem>
          </div>
          <FormItem className="mt-4">
            <FormLabel htmlFor="asset-description">Description</FormLabel>
            <Textarea id="asset-description" rows={3} {...form.register('description')} />
          </FormItem>
        </Form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button type="submit" form="asset-form" disabled={submitting}>{submitting ? 'Saving…' : asset ? 'Save Changes' : 'Create Asset'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
