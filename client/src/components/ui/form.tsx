import * as React from 'react'
import type * as LabelPrimitive from '@radix-ui/react-label'
import {
  type FieldPath,
  type FieldValues,
  useFormContext,
  UseFormReturn,
} from 'react-hook-form'

import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

// ============================================================
// Form — provides the RHF context via React context
// ============================================================
function createFormContext<
  TFieldValues extends FieldValues = FieldValues,
>() {
  return React.createContext<UseFormReturn<TFieldValues> | null>(null)
}

export interface FormProps<
  TFieldValues extends FieldValues = FieldValues,
> extends React.FormHTMLAttributes<HTMLFormElement> {
  /** The return value of useForm() — provides the RHF context to all children */
  form: UseFormReturn<TFieldValues>
  children?: React.ReactNode
}

/**
 * Form — wraps a standard HTML `<form>` and provides the RHF form instance
 * through context so that `useFormField` can be used in any child without
 * prop-drilling.
 */
function Form<TFieldValues extends FieldValues>({
  form,
  children,
  onSubmit,
  ...props
}: FormProps<TFieldValues>) {
  const ctx = React.useMemo(() => createFormContext<TFieldValues>(), [])
  return (
    <ctx.Provider value={form}>
      <form onSubmit={onSubmit} {...props}>
        {children}
      </form>
    </ctx.Provider>
  )
}

// ============================================================
// useFormField — returns RHF helpers for a named field
// ============================================================
/**
 * Hook that returns the form instance and validation error for a named field.
 * Use inside a component rendered inside `<Form>`.
 */
function useFormField<TName extends FieldPath<FieldValues>>(name: TName) {
  const { register, formState } = useFormContext<FieldValues>()
  const field = register(name)
  const error = formState.errors[name]?.message as string | undefined
  return { field, error }
}

// ============================================================
// FormItem — wraps a label + control + message
// ============================================================
const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('space-y-2', className)} {...props} />
))
FormItem.displayName = 'FormItem'

// ============================================================
// FormLabel
// ============================================================
const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & {
    required?: boolean
  }
>(({ className, required, children, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn(
      required && "after:content-['*'] after:text-destructive after:ml-0.5",
      className,
    )}
    {...props}
  >
    {children}
  </Label>
))
FormLabel.displayName = 'FormLabel'

// ============================================================
// FormControl — slot that accepts ref and spreads onto the input
// ============================================================
const FormControl = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn(className)} {...props} />
))
FormControl.displayName = 'FormControl'

// ============================================================
// FormMessage — shows validation or server error
// ============================================================
function FormMessage({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-destructive', className)} {...props}>
      {children}
    </p>
  )
}

export {
  Form,
  useFormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
}
