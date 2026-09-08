import * as React from 'react'
import { Search, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterField {
  /** Unique key for this filter */
  key: string
  /** Human-readable label */
  label: string
  /** 'search' renders a text input; 'select' renders a dropdown */
  type: 'search' | 'select'
  /** Options for 'select' type */
  options?: FilterOption[]
  /** Placeholder for the input/select */
  placeholder?: string
}

export interface FilterBarProps {
  /** Definition of available filters */
  fields: FilterField[]
  /** Current filter values, keyed by field key */
  values: { [key: string]: string }
  /** Called when a filter value changes */
  onChange: (key: string, value: string) => void
  /** Called when the user clicks the reset button */
  onReset?: () => void
  /** Debounce delay in ms for search fields (default 300) */
  debounceMs?: number
  className?: string
}

/**
 * FilterBar — a horizontal bar of search inputs and dropdown filters.
 *
 * Usage:
 * ```tsx
 * <FilterBar
 *   fields={[
 *     { key: 'search', type: 'search', label: 'Search', placeholder: 'Search incidents…' },
 *     { key: 'status', type: 'select', label: 'Status', options: [{ label: 'Open', value: 'open' }, …] },
 *   ]}
 *   values={filters}
 *   onChange={setFilters}
 *   onReset={() => setFilters({})}
 * />
 * ```
 */
export function FilterBar({
  fields,
  values,
  onChange,
  onReset,
  debounceMs = 300,
  className,
}: FilterBarProps) {
  // Track debounced search values locally before they propagate
  const [localSearch, setLocalSearch] = React.useState<Record<string, string>>({})

  // Sync local state when external values change (e.g. reset)
  React.useEffect(() => {
    const updated: Record<string, string> = {}
    fields.forEach((f) => {
      if (f.type === 'search') {
        updated[f.key] = values[f.key] ?? ''
      }
    })
    setLocalSearch(updated)
    // Only run when values reference changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(values)])

  const timersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleSearchChange = (key: string, raw: string) => {
    setLocalSearch((prev) => ({ ...prev, [key]: raw }))

    // Debounce the actual onChange call
    clearTimeout(timersRef.current[key])
    timersRef.current[key] = setTimeout(() => {
      onChange(key, raw)
    }, debounceMs)
  }

  const hasActiveFilters = fields.some((f) => values[f.key])

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3',
        className,
      )}
    >
      {fields.map((field) => {
        if (field.type === 'search') {
          return (
            <div key={field.key} className="relative flex w-full min-w-0 items-center sm:w-auto sm:flex-1 sm:basis-48">
              <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="h-9 w-full min-w-0 pl-9 pr-8"
                placeholder={field.placeholder ?? `Search ${field.label}…`}
                value={localSearch[field.key] ?? ''}
                onChange={(e) => handleSearchChange(field.key, e.target.value)}
                aria-label={field.label}
              />
              {localSearch[field.key] && (
                <button
                  type="button"
                  className="absolute right-2 flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    handleSearchChange(field.key, '')
                    onChange(field.key, '')
                  }}
                  aria-label={`Clear ${field.label} search`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        }

        if (field.type === 'select') {
          return (
            <Select
              key={field.key}
              value={values[field.key] ?? ''}
              onValueChange={(v) => onChange(field.key, v)}
            >
              <SelectTrigger className="h-9 w-full sm:w-40" aria-label={field.label}>
                <SelectValue placeholder={field.placeholder ?? field.label} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )
        }

        return null
      })}

      {onReset && hasActiveFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2 text-muted-foreground hover:text-foreground"
          onClick={onReset}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  )
}
