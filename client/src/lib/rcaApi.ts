import { isAxiosError } from 'axios'
import apiClient from '@/lib/apiClient'
import type {
  RCA,
  CorrectiveAction,
  RCAApiEnvelope,
  RCAListEnvelope,
  CreateRCAPayload,
  UpdateRCAPayload,
  CreateCorrectiveActionPayload,
  UpdateCorrectiveActionPayload,
  RCAProblemReference,
} from '@/types/rca'

export function rcaError(error: unknown): string {
  if (
    isAxiosError<{ message?: string }>(error) &&
    typeof error.response?.data?.message === 'string'
  )
    return error.response.data.message
  return error instanceof Error
    ? error.message
    : 'The request could not be completed.'
}
async function unwrap<T>(
  operation: Promise<{ data: RCAApiEnvelope<T> }>,
): Promise<T> {
  try {
    const { data } = await operation
    if (!data.success) throw new Error(data.message)
    return data.data
  } catch (error) {
    throw new Error(rcaError(error))
  }
}
const root = '/rcas'
const actions = (id: string) =>
  `${root}/${encodeURIComponent(id)}/corrective-actions`
export const rcaApi = {
  list: (signal?: AbortSignal) =>
    unwrap(apiClient.get<RCAListEnvelope<RCA>>(root, { signal })),
  get: (id: string, signal?: AbortSignal) =>
    unwrap(
      apiClient.get<RCAApiEnvelope<RCA>>(`${root}/${encodeURIComponent(id)}`, {
        signal,
      }),
    ),
  byProblem: (id: string, signal?: AbortSignal) =>
    unwrap(
      apiClient.get<RCAApiEnvelope<RCA>>(
        `${root}/problem/${encodeURIComponent(id)}`,
        { signal },
      ),
    ),
  create: (payload: CreateRCAPayload) =>
    unwrap(apiClient.post<RCAApiEnvelope<RCA>>(root, payload)),
  update: (id: string, payload: UpdateRCAPayload) =>
    unwrap(
      apiClient.put<RCAApiEnvelope<RCA>>(
        `${root}/${encodeURIComponent(id)}`,
        payload,
      ),
    ),
  remove: (id: string) =>
    unwrap(
      apiClient.delete<RCAApiEnvelope<RCA>>(
        `${root}/${encodeURIComponent(id)}`,
      ),
    ),
  actions: (id: string, signal?: AbortSignal) =>
    unwrap(
      apiClient.get<RCAListEnvelope<CorrectiveAction>>(actions(id), { signal }),
    ),
  action: (id: string, actionId: string, signal?: AbortSignal) =>
    unwrap(
      apiClient.get<RCAApiEnvelope<CorrectiveAction>>(
        `${actions(id)}/${encodeURIComponent(actionId)}`,
        { signal },
      ),
    ),
  createAction: (id: string, payload: CreateCorrectiveActionPayload) =>
    unwrap(
      apiClient.post<RCAApiEnvelope<CorrectiveAction>>(actions(id), payload),
    ),
  updateAction: (
    id: string,
    actionId: string,
    payload: UpdateCorrectiveActionPayload,
  ) =>
    unwrap(
      apiClient.put<RCAApiEnvelope<CorrectiveAction>>(
        `${actions(id)}/${encodeURIComponent(actionId)}`,
        payload,
      ),
    ),
  removeAction: (id: string, actionId: string) =>
    unwrap(
      apiClient.delete<RCAApiEnvelope<CorrectiveAction>>(
        `${actions(id)}/${encodeURIComponent(actionId)}`,
      ),
    ),
}
// Minimal Problem lookup; no Problem mutations or management module.
export const rcaProblemApi = {
  list: (signal?: AbortSignal) =>
    unwrap(
      apiClient.get<RCAApiEnvelope<RCAProblemReference[]>>('/problems', {
        signal,
      }),
    ),
}
