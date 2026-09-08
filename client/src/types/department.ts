export interface Department {
  _id: string
  name: string
  description?: string
  isActive: boolean
  organizationId: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateDepartmentPayload {
  name: string
  description: string
}

export interface UpdateDepartmentPayload {
  name?: string
  description?: string
  isActive?: boolean
}
