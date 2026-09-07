import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { UserListItem } from '@/types/auth'
import type { Asset } from '@/types/asset'

interface AssetAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  asset: Asset | null
  employees: UserListItem[]
  loadingEmployees: boolean
  employeesError: boolean
  submitting: boolean
  onAssign: (employeeId: string) => void
}

export function AssetAssignmentDialog({
  open,
  onOpenChange,
  asset,
  employees,
  loadingEmployees,
  employeesError,
  submitting,
  onAssign,
}: AssetAssignmentDialogProps) {
  const [employeeId, setEmployeeId] = useState('')

  useEffect(() => {
    if (open) setEmployeeId('')
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Asset</DialogTitle>
          <DialogDescription>
            Assign {asset?.assetId ?? 'this asset'} to an active employee in this organization.
          </DialogDescription>
        </DialogHeader>
        <Select value={employeeId} onValueChange={setEmployeeId}>
          <SelectTrigger><SelectValue placeholder="Select an employee" /></SelectTrigger>
          <SelectContent>
            {loadingEmployees && <SelectItem value="__loading__" disabled>Loading employees…</SelectItem>}
            {!loadingEmployees && employees.length === 0 && <SelectItem value="__empty__" disabled>No active employees are available.</SelectItem>}
            {employees.map((employee) => <SelectItem key={employee.id} value={employee.id}>{employee.name} ({employee.email})</SelectItem>)}
          </SelectContent>
        </Select>
        {employeesError && <p className="text-sm text-destructive">Employees could not be loaded. Retry after resolving the connection issue.</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button type="button" disabled={!employeeId || submitting || employeesError} onClick={() => onAssign(employeeId)}>{submitting ? 'Assigning…' : 'Assign Asset'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
