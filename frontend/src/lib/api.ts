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
  yaml_content?: string
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

export interface VersionInfo {
  version: string
  created_at: string
  downloads: number
}

export interface NamespaceInfo {
  id: number
  prefix: string
  display_name: string | null
  description: string | null
  owner_name: string
  created_at: string
}

export interface NamespaceListResponse {
  items: NamespaceInfo[]
  total: number
  page: number
  page_size: number
}

// ── Draft types (5.2.3) ──

export interface Draft {
  id: number
  title: string
  yaml_content: string
  created_at: string
  updated_at: string
}

export interface DraftListResponse {
  items: Draft[]
  total: number
  page: number
  page_size: number
}

// ── Share types (5.2.4) ──

export interface ShareInfo {
  id: number
  hash: string
  title: string
  yaml_content: string
  author_name: string | null
  views: number
  created_at: string
}

// ── Rating types (5.3.4) ──

export interface RatingStats {
  convention_id: number
  average: number
  count: number
  user_rating: number | null
}

export interface RatingResponse {
  id: number
  convention_id: number
  user_id: number
  score: number
  created_at: string
}

// ── Comment types (5.3.5) ──

export interface CommentItem {
  id: number
  convention_id: number
  user_id: number
  author_name: string
  content: string
  created_at: string
}

export interface CommentListResponse {
  items: CommentItem[]
  total: number
  page: number
  page_size: number
}

// ── Recommendation types (5.3.6) ──

export interface RecommendationItem {
  id: number
  name: string
  namespace: string
  version: string
  description: string | null
  tags: string | null
  downloads: number
  avg_rating: number | null
  author_name: string
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('bbdsl_token')
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function request<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: getAuthHeaders(),
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
    headers: getAuthHeaders(),
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `HTTP ${res.status}`)
  }
  return res.text()
}

export const apiClient = {
  // ── Convention endpoints ──

  /** List/search conventions with pagination. */
  listConventions(params?: {
    q?: string
    tag?: string
    namespace?: string
    author?: string
    sort?: string
    page?: number
    page_size?: number
  }): Promise<ConventionListResponse> {
    const sp = new URLSearchParams()
    if (params?.q) sp.set('q', params.q)
    if (params?.tag) sp.set('tag', params.tag)
    if (params?.namespace) sp.set('namespace', params.namespace)
    if (params?.author) sp.set('author', params.author)
    if (params?.sort) sp.set('sort', params.sort)
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

  /** Download a convention (increments counter, returns convention). */
  downloadConvention(id: number): Promise<Convention> {
    return request(`/conventions/${id}/download`, { method: 'POST' })
  },

  // ── Version endpoints ──

  /** Get convention by namespace + version. */
  getConventionByNsVersion(namespace: string, version: string): Promise<Convention> {
    return request(`/conventions/ns/${namespace}/${version}`)
  },

  /** List all versions for a namespace. */
  listVersions(namespace: string): Promise<VersionInfo[]> {
    return request(`/conventions/ns/${namespace}/versions`)
  },

  // ── Namespace endpoints ──

  /** List/search namespaces. */
  listNamespaces(params?: {
    q?: string
    page?: number
    page_size?: number
  }): Promise<NamespaceListResponse> {
    const sp = new URLSearchParams()
    if (params?.q) sp.set('q', params.q)
    if (params?.page) sp.set('page', String(params.page))
    if (params?.page_size) sp.set('page_size', String(params.page_size))
    const qs = sp.toString()
    return request(`/namespaces${qs ? '?' + qs : ''}`)
  },

  // ── Export / Compare ──

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

  // ── Draft endpoints (5.2.3) ──

  /** Save a new draft. */
  createDraft(title: string, yamlContent: string): Promise<Draft> {
    return request('/drafts', {
      method: 'POST',
      body: JSON.stringify({ title, yaml_content: yamlContent }),
    })
  },

  /** List current user's drafts. */
  listDrafts(params?: { page?: number; page_size?: number }): Promise<DraftListResponse> {
    const sp = new URLSearchParams()
    if (params?.page) sp.set('page', String(params.page))
    if (params?.page_size) sp.set('page_size', String(params.page_size))
    const qs = sp.toString()
    return request(`/drafts${qs ? '?' + qs : ''}`)
  },

  /** Get a single draft by ID. */
  getDraft(id: number): Promise<Draft> {
    return request(`/drafts/${id}`)
  },

  /** Update an existing draft. */
  updateDraft(id: number, body: { title?: string; yaml_content?: string }): Promise<Draft> {
    return request(`/drafts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  },

  /** Delete a draft. */
  deleteDraft(id: number): Promise<void> {
    return request(`/drafts/${id}`, { method: 'DELETE' })
  },

  // ── Share endpoints (5.2.4) ──

  /** Create a permanent share link. */
  createShare(title: string, yamlContent: string): Promise<ShareInfo> {
    return request('/share', {
      method: 'POST',
      body: JSON.stringify({ title, yaml_content: yamlContent }),
    })
  },

  /** Get a shared YAML by hash. */
  getShare(hash: string): Promise<ShareInfo> {
    return request(`/share/${hash}`)
  },

  // ── Rating endpoints (5.3.4) ──

  /** Upsert the current user's rating for a convention. */
  upsertRating(conventionId: number, score: number): Promise<RatingResponse> {
    return request(`/conventions/${conventionId}/ratings`, {
      method: 'POST',
      body: JSON.stringify({ score }),
    })
  },

  /** Get aggregated rating stats for a convention. */
  getRatingStats(conventionId: number): Promise<RatingStats> {
    return request(`/conventions/${conventionId}/ratings`)
  },

  // ── Comment endpoints (5.3.5) ──

  /** Post a comment on a convention. */
  createComment(conventionId: number, content: string): Promise<CommentItem> {
    return request(`/conventions/${conventionId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    })
  },

  /** List comments for a convention (paginated). */
  listComments(
    conventionId: number,
    params?: { page?: number; page_size?: number },
  ): Promise<CommentListResponse> {
    const sp = new URLSearchParams()
    if (params?.page) sp.set('page', String(params.page))
    if (params?.page_size) sp.set('page_size', String(params.page_size))
    const qs = sp.toString()
    return request(`/conventions/${conventionId}/comments${qs ? '?' + qs : ''}`)
  },

  // ── Recommendation endpoints (5.3.6) ──

  /** Get personalized convention recommendations. */
  getRecommendations(limit = 10): Promise<{ items: RecommendationItem[] }> {
    return request(`/recommendations?limit=${limit}`)
  },
}
