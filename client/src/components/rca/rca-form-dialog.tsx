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
import { useRcaIncidents, useRcaProblems } from '@/hooks/useRcas'
import { rcaError } from '@/lib/rcaApi'
import {
  problemLabel,
  referenceId,
  type RCA,
  type CreateRCAPayload,
  type UpdateRCAPayload,
} from '@/types/rca'

const idSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Select a valid record')
const schema = z.object({
  rcaId: z.string().trim().min(1, 'RCA ID is required'),
  problem: idSchema,
  rootCause: z.string().trim().min(1, 'Root cause is required'),
  investigation: z.string().trim().min(1, 'Investigation is required'),
  contributingFactors: z.string(),
  correctiveActions: z.string(),
  preventiveActions: z.string(),
  lessonsLearned: z.string(),
  relatedIncidents: z.array(idSchema),
})
type Values = z.infer<typeof schema>
const arrayFields = [
  ['contributingFactors', 'Contributing factors'],
  ['correctiveActions', 'Corrective action notes'],
  ['preventiveActions', 'Preventive actions'],
  ['lessonsLearned', 'Lessons learned'],
] as const
const lines = (value: string) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm'

export function RCAFormDialog({
  rca,
  onClose,
  onCreate,
  onUpdate,
}: {
  rca?: RCA
  onClose: () => void
  onCreate: (payload: CreateRCAPayload) => Promise<unknown>
  onUpdate: (payload: UpdateRCAPayload) => Promise<unknown>
}) {
  const problems = useRcaProblems()
  const incidents = useRcaIncidents()
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      rcaId: rca?.rcaId ?? '',
      problem: referenceId(rca?.problem),
      rootCause: rca?.rootCause ?? '',
      investigation: rca?.investigation ?? '',
      contributingFactors: rca?.contributingFactors?.join('\n') ?? '',
      correctiveActions: rca?.correctiveActions?.join('\n') ?? '',
      preventiveActions: rca?.preventiveActions?.join('\n') ?? '',
      lessonsLearned: rca?.lessonsLearned?.join('\n') ?? '',
      relatedIncidents:
        rca?.relatedIncidents?.map(referenceId).filter(Boolean) ?? [],
    },
  })
  const selected = form.watch('relatedIncidents')
  const selectedProblem = form.watch('problem')
  const busy = form.formState.isSubmitting
  const ready =
    !problems.isPending &&
    !problems.isError &&
    !incidents.isPending &&
    !incidents.isError
  const unavailable = selected.filter(
    (id) => !incidents.data?.some((incident) => incident._id === id),
  )
  const toggle = (id: string) =>
    form.setValue(
      'relatedIncidents',
      selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id],
      { shouldDirty: true, shouldValidate: true },
    )
  const submit = async (values: Values) => {
    if (!ready) return
    const payload: UpdateRCAPayload = {
      problem: values.problem,
      rootCause: values.rootCause,
      investigation: values.investigation,
      contributingFactors: lines(values.contributingFactors),
      correctiveActions: lines(values.correctiveActions),
      preventiveActions: lines(values.preventiveActions),
      lessonsLearned: lines(values.lessonsLearned),
      relatedIncidents: values.relatedIncidents,
    }
    try {
      if (rca) await onUpdate(payload)
      else
        await onCreate({
          ...payload,
          rcaId: values.rcaId,
          problem: values.problem,
          rootCause: values.rootCause,
          investigation: values.investigation,
          status: 'Draft',
        })
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
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{rca ? `Edit ${rca.rcaId}` : 'Create RCA'}</DialogTitle>
          <DialogDescription>
            {rca
              ? 'Update the investigation and related incidents.'
              : 'Start a Draft investigation for an existing Problem. One RCA is allowed per Problem.'}
          </DialogDescription>
        </DialogHeader>
        <Form
          form={form}
          onSubmit={form.handleSubmit(submit)}
          className="space-y-5"
        >
          <fieldset disabled={busy} className="space-y-5">
            {!rca && (
              <FormItem>
                <FormLabel htmlFor="rca-id" required>
                  RCA ID
                </FormLabel>
                <Input
                  id="rca-id"
                  placeholder="RCA-001"
                  {...form.register('rcaId')}
                />
                <FormMessage>
                  {form.formState.errors.rcaId?.message}
                </FormMessage>
              </FormItem>
            )}
            <FormItem>
              <FormLabel htmlFor="rca-problem" required>
                Problem
              </FormLabel>
              {problems.isPending ? (
                <LoadingSpinner />
              ) : problems.isError ? (
                <ErrorState
                  description={rcaError(problems.error)}
                  onRetry={() => void problems.refetch()}
                />
              ) : (
                <>
                  <select
                    id="rca-problem"
                    className={selectClass}
                    {...form.register('problem')}
                  >
                    <option value="">Select a Problem</option>
                    {selectedProblem &&
                      !problems.data?.some(
                        (problem) => problem._id === selectedProblem,
                      ) && (
                        <option value={selectedProblem}>
                          Current Problem unavailable — select a replacement
                        </option>
                      )}
                    {problems.data?.map((problem) => (
                      <option key={problem._id} value={problem._id}>
                        {problemLabel(problem)}
                      </option>
                    ))}
                  </select>
                  {!problems.data?.length && (
                    <p className="text-sm text-muted-foreground">
                      No Problems are available. A Problem must exist before an
                      RCA can be created.
                    </p>
                  )}
                </>
              )}
              <FormMessage>
                {form.formState.errors.problem?.message}
              </FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="rca-root" required>
                Root cause
              </FormLabel>
              <Textarea
                id="rca-root"
                rows={3}
                {...form.register('rootCause')}
              />
              <FormMessage>
                {form.formState.errors.rootCause?.message}
              </FormMessage>
            </FormItem>
            <FormItem>
              <FormLabel htmlFor="rca-investigation" required>
                Investigation
              </FormLabel>
              <Textarea
                id="rca-investigation"
                rows={5}
                {...form.register('investigation')}
              />
              <FormMessage>
                {form.formState.errors.investigation?.message}
              </FormMessage>
            </FormItem>
            <p className="text-sm text-muted-foreground">
              Enter one item per line below. Leave a field empty to clear all
              its items. Corrective action notes are separate from tracked
              actions with assignees and due dates.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {arrayFields.map(([field, label]) => (
                <FormItem key={field}>
                  <FormLabel htmlFor={`rca-${field}`}>{label}</FormLabel>
                  <Textarea
                    id={`rca-${field}`}
                    rows={4}
                    {...form.register(field)}
                  />
                  <FormMessage>
                    {form.formState.errors[field]?.message}
                  </FormMessage>
                </FormItem>
              ))}
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Related incidents</legend>
              {incidents.isPending ? (
                <LoadingSpinner />
              ) : incidents.isError ? (
                <ErrorState
                  description={rcaError(incidents.error)}
                  onRetry={() => void incidents.refetch()}
                />
              ) : (
                <>
                  <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border p-3">
                    {incidents.data?.map((incident) => (
                      <label
                        key={incident._id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selected.includes(incident._id)}
                          onChange={() => toggle(incident._id)}
                          className="mt-1"
                        />
                        <span>
                          {incident.incidentId} — {incident.title}{' '}
                          <span className="text-muted-foreground">
                            ({incident.status})
                          </span>
                        </span>
                      </label>
                    ))}
                    {unavailable.map((id) => (
                      <label
                        key={id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked
                          onChange={() => toggle(id)}
                        />
                        Unavailable incident ({id}) — uncheck to unlink
                      </label>
                    ))}
                    {!incidents.data?.length && !unavailable.length && (
                      <p className="text-sm text-muted-foreground">
                        No incidents available.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!selected.length}
                    onClick={() =>
                      form.setValue('relatedIncidents', [], {
                        shouldDirty: true,
                      })
                    }
                  >
                    Clear incident links
                  </Button>
                </>
              )}
              <FormMessage>
                {form.formState.errors.relatedIncidents?.message}
              </FormMessage>
            </fieldset>
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
            <Button type="submit" disabled={busy || !ready}>
              {busy ? 'Saving…' : rca ? 'Save changes' : 'Create Draft RCA'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
