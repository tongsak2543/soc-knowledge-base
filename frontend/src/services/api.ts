import type {
  CaseListItem,
  CaseDetail,
  CaseFormData,
  IOCListItem,
  IOCDetail,
  IOCFormData,
  DashboardStats,
} from '../types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    let errorDetail = `HTTP ${response.status} ${response.statusText}`
    try {
      const errorJson = await response.json()
      if (typeof errorJson.detail === 'string') {
        errorDetail = errorJson.detail
      } else if (Array.isArray(errorJson.detail)) {
        errorDetail = errorJson.detail.map((d: any) => `${d.loc?.join('.') || 'field'}: ${d.msg}`).join(', ')
      } else if (errorJson.message) {
        errorDetail = errorJson.message
      }
    } catch {
      // Non-JSON response
    }
    throw new ApiError(response.status, errorDetail)
  }

  return response.json()
}

export const api = {
  // SOC / DFIR Case Knowledge Base
  getCases: (params?: {
    q?: string
    category?: string
    severity?: string
    case_status?: string
    limit?: number
    offset?: number
  }) => {
    const searchParams = new URLSearchParams()
    if (params?.q) searchParams.set('q', params.q)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.severity) searchParams.set('severity', params.severity)
    if (params?.case_status) searchParams.set('case_status', params.case_status)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    const queryStr = searchParams.toString()
    return request<CaseListItem[]>(`/cases${queryStr ? `?${queryStr}` : ''}`)
  },

  getCaseById: (id: number) => request<CaseDetail>(`/cases/${id}`),

  createCase: (data: Partial<CaseFormData>) =>
    request<CaseDetail>('/cases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateCase: (id: number, data: Partial<CaseFormData>) =>
    request<CaseDetail>(`/cases/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteCase: (id: number) =>
    request<{ message: string }>(`/cases/${id}`, {
      method: 'DELETE',
    }),

  linkIocToCase: (caseId: number, iocId: number) =>
    request<CaseDetail>(`/cases/${caseId}/iocs/${iocId}`, {
      method: 'POST',
    }),

  unlinkIocFromCase: (caseId: number, iocId: number) =>
    request<CaseDetail>(`/cases/${caseId}/iocs/${iocId}`, {
      method: 'DELETE',
    }),

  // Indicators of Compromise (IOC)
  getIOCs: (params?: { q?: string; ioc_type?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams()
    if (params?.q) searchParams.set('q', params.q)
    if (params?.ioc_type) searchParams.set('ioc_type', params.ioc_type)
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.offset) searchParams.set('offset', params.offset.toString())

    const queryStr = searchParams.toString()
    return request<IOCListItem[]>(`/iocs${queryStr ? `?${queryStr}` : ''}`)
  },

  getIOCById: (id: number) => request<IOCDetail>(`/iocs/${id}`),

  createIOC: (data: Partial<IOCFormData>) =>
    request<IOCDetail>('/iocs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  bulkCreateIOCs: (data: { items: { ioc_type: string; value: string; description?: string }[]; case_ids?: number[]; case_id?: number }) =>
    request<{
      total_submitted: number
      created_count: number
      duplicate_count: number
      invalid_count: number
      results: Array<{
        ioc_type: string
        value: string
        normalized_value?: string
        status: 'created' | 'duplicate' | 'invalid'
        id?: number
        error?: string
      }>
    }>('/iocs/bulk', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateIOC: (id: number, data: Partial<IOCFormData>) =>
    request<IOCDetail>(`/iocs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteIOC: (id: number) =>
    request<{ message: string }>(`/iocs/${id}`, {
      method: 'DELETE',
    }),

  linkCaseToIOC: (iocId: number, caseId: number) =>
    request<IOCDetail>(`/iocs/${iocId}/cases/${caseId}`, {
      method: 'POST',
    }),

  unlinkCaseFromIOC: (iocId: number, caseId: number) =>
    request<IOCDetail>(`/iocs/${iocId}/cases/${caseId}`, {
      method: 'DELETE',
    }),

  // Dashboard Stats
  getDashboardStats: () => request<DashboardStats>('/dashboard/stats'),

  // Live Threat Intelligence Feeds
  getFeeds: (params?: { q?: string; source_id?: string; category?: string; refresh?: boolean }) => {
    const searchParams = new URLSearchParams()
    if (params?.q) searchParams.set('q', params.q)
    if (params?.source_id) searchParams.set('source_id', params.source_id)
    if (params?.category) searchParams.set('category', params.category)
    if (params?.refresh) searchParams.set('refresh', 'true')

    const queryStr = searchParams.toString()
    return request<{
      sources: Array<{ id: string; name: string; website: string; badge_color: string }>
      total: number
      fetched_at: string
      items: Array<{
        id: string
        title: string
        link: string
        summary: string
        source_id: string
        source_name: string
        source_website: string
        badge_color: string
        published_date: string
        category: any
        severity: any
        extracted_iocs: Array<{ type: string; value: string }>
      }>
    }>(`/feeds${queryStr ? `?${queryStr}` : ''}`)
  },

  convertFeedToCase: (payload: {
    title: string
    link: string
    summary: string
    source_name: string
    category: string
    severity: string
    extracted_iocs?: Array<{ type: string; value: string }>
  }) =>
    request<{ status: string; message: string; case_id: string; id: number }>('/feeds/convert-to-case', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Demo Data & Management
  seedDemoData: (force: boolean = false) =>
    request<{ status: string; message: string; seeded_cases: number; seeded_iocs: number }>(
      `/seed${force ? '?force=true' : ''}`,
      { method: 'POST' }
    ),

  resetDatabase: () =>
    request<{ message: string }>('/seed/reset', { method: 'POST' }),
}
