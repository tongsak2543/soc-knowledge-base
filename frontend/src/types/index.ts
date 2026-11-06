export type ThreatCategory =
  | 'Malware'
  | 'Ransomware'
  | 'Phishing'
  | 'Unauthorized Access'
  | 'Data Breach'
  | 'APT'
  | 'Vulnerability'
  | 'Vulnerability Exploitation'
  | 'Cyber Attack'
  | 'Policy Violation'
  | 'Denial of Service'
  | 'Other'

export type ThreatSeverity =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'
  | 'Informational'

export type CaseStatus =
  | 'Open'
  | 'In Progress'
  | 'Resolved'
  | 'Closed'

export type IOCType =
  | 'IPv4'
  | 'IPv6'
  | 'Domain'
  | 'URL'
  | 'MD5'
  | 'SHA1'
  | 'SHA256'

export const CATEGORIES: ThreatCategory[] = [
  'Malware',
  'Ransomware',
  'Phishing',
  'Unauthorized Access',
  'Data Breach',
  'APT',
  'Vulnerability Exploitation',
  'Policy Violation',
  'Denial of Service',
  'Other',
]

export const SEVERITIES: ThreatSeverity[] = [
  'Critical',
  'High',
  'Medium',
  'Low',
  'Informational',
]

export const STATUSES: CaseStatus[] = [
  'Open',
  'In Progress',
  'Resolved',
  'Closed',
]

export const IOC_TYPES: IOCType[] = [
  'IPv4',
  'IPv6',
  'Domain',
  'URL',
  'MD5',
  'SHA1',
  'SHA256',
]

export interface IOCBrief {
  id: number
  ioc_type: IOCType
  value: string
  normalized_value: string
  description?: string | null
}

export interface CaseBrief {
  id: number
  case_id: string
  title: string
  category: ThreatCategory
  severity: ThreatSeverity
  status: CaseStatus
  incident_date?: string | null
}

export interface CaseListItem {
  id: number
  case_id: string
  title: string
  summary?: string | null
  category: ThreatCategory
  severity: ThreatSeverity
  status: CaseStatus
  tags?: string | null
  incident_date?: string | null
  created_at: string
  updated_at: string
  ioc_count: number
}

export interface CaseDetail {
  id: number
  case_id: string
  title: string
  summary?: string | null
  category: ThreatCategory
  severity: ThreatSeverity
  status: CaseStatus

  // DFIR Investigation Knowledge Base
  investigation_findings?: string | null
  observed_behavior?: string | null
  investigation_method?: string | null
  root_cause?: string | null
  remediation?: string | null
  conclusion?: string | null

  tags?: string | null
  incident_date?: string | null
  created_at: string
  updated_at: string
  iocs: IOCBrief[]
}

export interface CaseFormData {
  case_id: string
  title: string
  summary: string
  category: ThreatCategory
  severity: ThreatSeverity
  status: CaseStatus
  investigation_findings: string
  observed_behavior: string
  investigation_method: string
  root_cause: string
  remediation: string
  conclusion: string
  tags: string
  incident_date: string
  ioc_ids: number[]
  new_iocs: {
    ioc_type: IOCType
    value: string
    description: string
  }[]
}

export interface IOCListItem {
  id: number
  ioc_type: IOCType
  value: string
  normalized_value: string
  description?: string | null
  created_at: string
  updated_at: string
  case_count: number
}

export interface IOCDetail {
  id: number
  ioc_type: IOCType
  value: string
  normalized_value: string
  description?: string | null
  created_at: string
  updated_at: string
  cases: CaseBrief[]
}

export interface IOCFormData {
  ioc_type: IOCType
  value: string
  description: string
  case_ids: number[]
}

export interface DashboardRecentCase {
  id: number
  case_id: string
  title: string
  category: ThreatCategory
  severity: ThreatSeverity
  status: CaseStatus
  incident_date?: string | null
  created_at: string
  ioc_count: number
}

export interface DashboardRecentIOC {
  id: number
  ioc_type: IOCType
  value: string
  normalized_value: string
  description?: string | null
  created_at: string
  case_count: number
}

export interface DashboardStats {
  total_cases: number
  total_iocs: number
  recent_cases: DashboardRecentCase[]
  recent_iocs: DashboardRecentIOC[]
  cases_by_category: Record<string, number>
  cases_by_severity: Record<string, number>
  cases_by_status: Record<string, number>
  iocs_by_type: Record<string, number>
}

export interface BulkIOCItem {
  ioc_type: IOCType
  value: string
  description?: string
}

export interface BulkIOCCreateRequest {
  items: BulkIOCItem[]
  case_id?: number
  case_ids?: number[]
}

export interface BulkIOCItemResult {
  ioc_type: IOCType
  value: string
  normalized_value?: string
  status: 'created' | 'duplicate' | 'invalid'
  id?: number
  error?: string
}

export interface BulkIOCCreateResponse {
  total_submitted: number
  created_count: number
  duplicate_count: number
  invalid_count: number
  results: BulkIOCItemResult[]
}

export function detectIocType(raw: string): IOCType {
  const v = raw
    .replace(/^hxxps?:\/\//i, (m) => (m.toLowerCase().startsWith('hxxps') ? 'https://' : 'http://'))
    .replace(/\[\.\]|\(\.\)|\{\.\}/g, '.')
    .replace(/\[:\]/g, ':')
    .trim()

  // IPv4 regex (4 octets 0-255)
  const ipv4Regex =
    /^(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  if (ipv4Regex.test(v)) return 'IPv4'

  // URL
  if (/^https?:\/\//i.test(v)) return 'URL'

  // IPv6
  if (v.includes(':') && /^[0-9a-fA-F:]+$/.test(v)) return 'IPv6'

  // Hashes
  if (/^[0-9a-fA-F]{64}$/.test(v)) return 'SHA256'
  if (/^[0-9a-fA-F]{40}$/.test(v)) return 'SHA1'
  if (/^[0-9a-fA-F]{32}$/.test(v)) return 'MD5'

  // Domain regex
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/
  if (domainRegex.test(v)) return 'Domain'

  return 'IPv4'
}
