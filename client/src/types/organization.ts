export interface Organization {
  _id: string
  name: string
  slug: string
  description?: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface UpdateOrganizationPayload {
  name: string
  slug: string
  description: string
}
