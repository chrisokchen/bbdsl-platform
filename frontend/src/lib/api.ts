/**
 * REST API client for BBDSL Platform backend.
 */

const BASE_URL = '/api/v1'

export interface Convention {
  id: number
  name: string
  namespace: string
  version: string
  description: string | null
  tags: string | null
  downloads: number
  author_name: string
  created_at: string
  updated_at: string
}

export interface ConventionListResponse {
  items: Convention[]
  total: number
  page: number
  page_size: number
}

export interface ConventionCreateRequest {
  name: string
  namespace: string
  version?: string
  description?: string
  tags?: string
  yaml_content: string
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.json()
}

async function requestText(
  path: string,
  options?: RequestInit,
): Promise<string> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.text()
}

export const apiClient = {
  /** List/search conventions with pagination. */
  listConventions(params?: {
    q?: string
    tag?: string
    author?: string
    page?: number
    page_size?: number
  }): Promise<ConventionListResponse> {
    const sp = new URLSearchParams()
    if (params?.q) sp.set('q', params.q)
    if (params?.tag) sp.set('tag', params.tag)
    if (params?.author) sp.set('author', params.author)
    if (params?.page) sp.set('page', String(params.page))
    if (params?.page_size) sp.set('page_size', String(params.page_size))
    const qs = sp.toString()
    return request(`/conventions${qs ? '?' + qs : ''}`)
  },

  /** Get a single convention by ID. */
  getConvention(id: number): Promise<Convention> {
    return request(`/conventions/${id}`)
  },

  /** Upload a new convention. */
  createConvention(body: ConventionCreateRequest): Promise<Convention> {
    return request('/conventions', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  /** Export YAML to a given format, returns the exported text. */
  exportDocument(yamlContent: string, fmt: string): Promise<string> {
    return requestText(`/export/${fmt}`, {
      method: 'POST',
      body: JSON.stringify({ yaml_content: yamlContent }),
    })
  },

  /** Compare two systems. */
  compareSystems(
    yamlA: string,
    yamlB: string,
    nDeals = 20,
    seed = 42,
  ): Promise<Record<string, unknown>> {
    return request('/compare', {
      method: 'POST',
      body: JSON.stringify({
        yaml_a: yamlA,
        yaml_b: yamlB,
        n_deals: nDeals,
        seed,
      }),
    })
  },
}
