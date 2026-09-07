export interface SupportTeam {
  _id: string
  name: string
  description?: string
  organizationId: string
  members: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateSupportTeamPayload {
  name: string
  description?: string
  members?: string[]
}

export interface UpdateSupportTeamPayload {
  name?: string
  description?: string
  members?: string[]
  isActive?: boolean
}
