import { forwardRef, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  invalid?: boolean
}

/**
 * Password input with an accessible show/hide toggle.
 *
 * The toggle button is keyboard-focusable and uses
 * `aria-label` that mirrors the current state ("Show password"
 * vs "Hide password"). It is excluded from the form's
 * implicit submit by being `type="button"`.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, invalid, disabled, ...props }, ref) {
    const [visible, setVisible] = useState(false)

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? 'text' : 'password'}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          className={cn('pr-11', className)}
          {...props}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setVisible((v) => !v)}
          disabled={disabled}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" aria-hidden />
          ) : (
            <Eye className="h-4 w-4" aria-hidden />
          )}
        </Button>
      </div>
    )
  },
)
