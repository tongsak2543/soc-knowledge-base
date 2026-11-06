import React from 'react'
import type { ThreatCategory, ThreatSeverity, IOCType, CaseStatus } from '../types'
import { useLanguage } from '../context/LanguageContext'

export const StatusBadge: React.FC<{ status: CaseStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const { language } = useLanguage()
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  const labels = {
    Open: language === 'th' ? 'เปิดเคส (Open)' : 'Open',
    'In Progress': language === 'th' ? 'กำลังสอบสวน (In Progress)' : 'In Progress',
    Resolved: language === 'th' ? 'แก้ไขแล้ว (Resolved)' : 'Resolved',
    Closed: language === 'th' ? 'ปิดเคส (Closed)' : 'Closed',
  }

  switch (status) {
    case 'Open':
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-sky-500/30 bg-sky-500/10 text-sky-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mr-1.5 animate-pulse" />
          {labels.Open}
        </span>
      )
    case 'In Progress':
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
          {labels['In Progress']}
        </span>
      )
    case 'Resolved':
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
          {labels.Resolved}
        </span>
      )
    case 'Closed':
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-slate-700 bg-slate-800 text-slate-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mr-1.5" />
          {labels.Closed}
        </span>
      )
  }
}

export const SeverityBadge: React.FC<{ severity: ThreatSeverity; size?: 'sm' | 'md' }> = ({
  severity,
  size = 'md',
}) => {
  const { language } = useLanguage()
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'

  const labels = {
    Critical: language === 'th' ? 'วิกฤต (Critical)' : 'Critical',
    High: language === 'th' ? 'สูง (High)' : 'High',
    Medium: language === 'th' ? 'ปานกลาง (Medium)' : 'Medium',
    Low: language === 'th' ? 'ต่ำ (Low)' : 'Low',
    Informational: language === 'th' ? 'ข้อมูล (Info)' : 'Info',
  }

  switch (severity) {
    case 'Critical':
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mr-1.5 animate-pulse" />
          {labels.Critical}
        </span>
      )
    case 'High':
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-orange-500/30 bg-orange-500/10 text-orange-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1.5" />
          {labels.High}
        </span>
      )
    case 'Medium':
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5" />
          {labels.Medium}
        </span>
      )
    case 'Low':
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5" />
          {labels.Low}
        </span>
      )
    case 'Informational':
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded border border-slate-600 bg-slate-800 text-slate-300 ${sizeClasses}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
          {labels.Informational}
        </span>
      )
  }
}

export const CategoryBadge: React.FC<{ category: ThreatCategory }> = ({ category }) => {
  const { language } = useLanguage()

  const labels: Record<string, string> = {
    Malware: language === 'th' ? 'มัลแวร์' : 'Malware',
    Ransomware: language === 'th' ? 'แรนซัมแวร์' : 'Ransomware',
    Phishing: language === 'th' ? 'ฟิชชิ่ง' : 'Phishing',
    'Unauthorized Access': language === 'th' ? 'เข้าถึงมิชอบ' : 'Unauthorized Access',
    'Data Breach': language === 'th' ? 'ข้อมูลรั่วไหล' : 'Data Breach',
    APT: language === 'th' ? 'ภัยคุกคาม APT' : 'APT',
    Vulnerability: language === 'th' ? 'ช่องโหว่' : 'Vulnerability',
    'Vulnerability Exploitation': language === 'th' ? 'โจมตีช่องโหว่' : 'Vulnerability Exploit',
    'Policy Violation': language === 'th' ? 'ละเมิดนโยบาย' : 'Policy Violation',
    'Denial of Service': language === 'th' ? 'โจมตี DoS' : 'Denial of Service',
    'Cyber Attack': language === 'th' ? 'การโจมตีไซเบอร์' : 'Cyber Attack',
    Other: language === 'th' ? 'อื่นๆ' : 'Other',
  }

  const getColors = () => {
    switch (category) {
      case 'Ransomware':
        return 'border-purple-500/30 bg-purple-500/10 text-purple-300'
      case 'Malware':
        return 'border-pink-500/30 bg-pink-500/10 text-pink-300'
      case 'Phishing':
        return 'border-sky-500/30 bg-sky-500/10 text-sky-300'
      case 'Unauthorized Access':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      case 'Vulnerability':
      case 'Vulnerability Exploitation':
        return 'border-red-500/30 bg-red-500/10 text-red-300'
      case 'APT':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      case 'Data Breach':
        return 'border-orange-500/30 bg-orange-500/10 text-orange-300'
      case 'Policy Violation':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300'
      case 'Denial of Service':
        return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
      case 'Cyber Attack':
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
      case 'Other':
      default:
        return 'border-slate-700 bg-slate-800 text-slate-300'
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-medium rounded border ${getColors()}`}
    >
      {labels[category] || category}
    </span>
  )
}

export const IOCTypeBadge: React.FC<{ iocType: IOCType }> = ({ iocType }) => {
  const getColors = () => {
    switch (iocType) {
      case 'IPv4':
      case 'IPv6':
        return 'border-cyan-500/30 bg-cyan-950/40 text-cyan-300'
      case 'Domain':
        return 'border-teal-500/30 bg-teal-950/40 text-teal-300'
      case 'URL':
        return 'border-blue-500/30 bg-blue-950/40 text-blue-300'
      case 'MD5':
      case 'SHA1':
      case 'SHA256':
        return 'border-violet-500/30 bg-violet-950/40 text-violet-300'
      default:
        return 'border-slate-700 bg-slate-800 text-slate-300'
    }
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-mono font-semibold rounded border ${getColors()}`}
    >
      {iocType}
    </span>
  )
}
