import type {
  AnalyzeRequest,
  AnalyzeResponse,
  CreateLibraryEntryRequest,
  LibraryEntry,
  SessionResponse,
} from '../../shared/types'

async function request<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
    ...init,
  })

  if (response.status === 401) {
    throw new Error('UNAUTHORIZED')
  }

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(data?.error || `Request failed with ${response.status}`)
  }

  return (await response.json()) as T
}

export function getSession() {
  return request<SessionResponse>('/api/auth/session')
}

export function login(password: string) {
  return request<SessionResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

export function logout() {
  return request<SessionResponse>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  })
}

export function analyzeSite(payload: AnalyzeRequest) {
  return request<AnalyzeResponse>('/api/analyze', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getLibraryEntries() {
  const response = await request<{ entries: LibraryEntry[] }>('/api/library')
  return response.entries
}

export async function createLibraryEntry(payload: CreateLibraryEntryRequest) {
  const response = await request<{ entry: LibraryEntry }>('/api/library', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return response.entry
}

export function deleteLibraryEntry(id: string) {
  return request<{ ok: true }>(`/api/library/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({}),
  })
}

export function clearLibraryEntries() {
  return request<{ ok: true }>('/api/library', {
    method: 'DELETE',
    body: JSON.stringify({}),
  })
}
