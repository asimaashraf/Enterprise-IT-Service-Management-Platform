import { useId, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AnalyticsDateParams } from '@/types/analytics'

export function DateRangeFilter({
  value,
  onApply,
}: {
  value: AnalyticsDateParams
  onApply: (range: AnalyticsDateParams) => void
}) {
  const id = useId()
  const [start, setStart] = useState(value.startDate ?? '')
  const [end, setEnd] = useState(value.endDate ?? '')
  const [error, setError] = useState('')
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!start || !end) {
      setError(
        'Choose both a start date and an end date, or select Reset to defaults.',
      )
      return
    }
    const from = new Date(`${start}T00:00:00Z`)
    const to = new Date(`${end}T00:00:00Z`)
    if (
      ![from, to].every((date) => Number.isFinite(date.getTime())) ||
      from.toISOString().slice(0, 10) !== start ||
      to.toISOString().slice(0, 10) !== end
    ) {
      setError('Enter valid calendar dates.')
      return
    }
    if (start > end) {
      setError('Start date must be on or before end date.')
      return
    }
    if ((to.getTime() - from.getTime()) / 86400000 + 1 > 366) {
      setError('Choose a range of 366 days or fewer.')
      return
    }
    setError('')
    onApply({ startDate: start, endDate: end })
  }
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <div className="w-full min-w-0 space-y-2 sm:w-auto sm:flex-1 sm:basis-40">
          <Label htmlFor={`${id}-start`}>Start date (UTC)</Label>
          <Input
            id={`${id}-start`}
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <div className="w-full min-w-0 space-y-2 sm:w-auto sm:flex-1 sm:basis-40">
          <Label htmlFor={`${id}-end`}>End date (UTC)</Label>
          <Input
            id={`${id}-end`}
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            aria-describedby={error ? `${id}-error` : undefined}
          />
        </div>
        <Button type="submit">Apply</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setStart('')
            setEnd('')
            setError('')
            onApply({})
          }}
        >
          Reset to defaults
        </Button>
      </form>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {value.startDate
          ? `Applied: ${value.startDate} to ${value.endDate}, inclusive UTC dates.`
          : 'Defaults: Incident Trends covers 30 UTC days; other metrics use their documented defaults.'}{' '}
        Your current organization only.
      </p>
    </div>
  )
}
