import React, { useState, useEffect } from 'react'
import {
  X,
  Calendar,
  Tag,
  Crosshair,
  Trash2,
  Edit,
  Plus,
  Copy,
  Check,
  Unlink,
  FileSearch,
  Activity,
  Wrench,
  AlertOctagon,
  ShieldCheck,
  Award,
} from 'lucide-react'
import type { CaseDetail, IOCListItem } from '../types'
import { SeverityBadge, CategoryBadge, StatusBadge, IOCTypeBadge } from './Badges'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

interface CaseDetailModalProps {
  caseId: number | null
  isOpen: boolean
  onClose: () => void
  onEdit: (c: CaseDetail) => void
  onDelete: (id: number) => void
  onNavigateToIOC: (iocId: number) => void
  onCaseUpdated: () => void
}

export const CaseDetailModal: React.FC<CaseDetailModalProps> = ({
  caseId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onNavigateToIOC,
  onCaseUpdated,
}) => {
  const { t, language } = useLanguage()
  const [caseData, setCaseData] = useState<CaseDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedValue, setCopiedValue] = useState<string | null>(null)

  // Attach IOC dropdown
  const [allIocs, setAllIocs] = useState<IOCListItem[]>([])
  const [selectedIocToLink, setSelectedIocToLink] = useState<number | ''>('')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    if (isOpen && caseId) {
      loadCaseDetail(caseId)
      loadAvailableIocs()
    } else {
      setCaseData(null)
      setError(null)
    }
  }, [isOpen, caseId])

  const loadCaseDetail = async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getCaseById(id)
      setCaseData(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load case investigation details')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableIocs = async () => {
    try {
      const data = await api.getIOCs({ limit: 150 })
      setAllIocs(data)
    } catch {
      // Ignored
    }
  }

  const handleCopy = (val: string) => {
    navigator.clipboard.writeText(val)
    setCopiedValue(val)
    setTimeout(() => setCopiedValue(null), 2000)
  }

  const handleUnlinkIoc = async (iocId: number) => {
    if (!caseData) return
    try {
      await api.unlinkIocFromCase(caseData.id, iocId)
      loadCaseDetail(caseData.id)
      onCaseUpdated()
    } catch (err: any) {
      alert(`Failed to unlink IOC: ${err.message}`)
    }
  }

  const handleLinkIoc = async () => {
    if (!caseData || !selectedIocToLink) return
    try {
      setLinking(true)
      await api.linkIocToCase(caseData.id, Number(selectedIocToLink))
      setSelectedIocToLink('')
      loadCaseDetail(caseData.id)
      onCaseUpdated()
    } catch (err: any) {
      alert(`Failed to link IOC: ${err.message}`)
    } finally {
      setLinking(false)
    }
  }

  if (!isOpen) return null

  const unlinkedIocs = allIocs.filter(
    (ioc) => !caseData?.iocs.some((existing) => existing.id === ioc.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl my-6 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/90 px-2.5 py-1 rounded border border-cyan-700/60 shadow-sm">
              {caseData?.case_id || `${t('caseNumber')}${caseId}`}
            </span>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">{t('portalSubtitle')}</span>
          </div>

          <div className="flex items-center space-x-2">
            {caseData && (
              <>
                <button
                  onClick={() => onEdit(caseData)}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title={t('editCaseTitle')}
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(caseData.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title={t('deleteCaseTitle')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-16 flex justify-center items-center text-slate-400 font-mono text-sm">
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading case investigation knowledge base...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm">
              {error}
            </div>
          )}

          {caseData && !loading && (
            <>
              {/* Badges & Meta */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={caseData.status} />
                  <SeverityBadge severity={caseData.severity} />
                  <CategoryBadge category={caseData.category} />
                  {caseData.incident_date && (
                    <span className="flex items-center text-xs text-slate-400 font-mono ml-auto">
                      <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
                      {new Date(caseData.incident_date).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}
                    </span>
                  )}
                </div>

                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
                  {caseData.title}
                </h1>
              </div>

              {/* Summary */}
              {caseData.summary && (
                <div className="p-3.5 rounded-lg bg-slate-950/70 border-l-4 border-cyan-500 text-slate-200 text-sm leading-relaxed">
                  <div className="text-[11px] font-semibold text-cyan-400 tracking-wider uppercase mb-1">
                    {t('fieldSummary')}
                  </div>
                  {caseData.summary}
                </div>
              )}

              {/* Structured DFIR Investigation Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Investigation Findings */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                    <FileSearch className="w-4 h-4 shrink-0" />
                    <span>{t('findingsLabel')}</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {caseData.investigation_findings || <span className="text-slate-600 italic">No findings recorded.</span>}
                  </div>
                </div>

                {/* 2. Observed Behavior & TTPs */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                    <Activity className="w-4 h-4 shrink-0" />
                    <span>{t('behaviorLabel')}</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {caseData.observed_behavior || <span className="text-slate-600 italic">No behavior notes recorded.</span>}
                  </div>
                </div>

                {/* 3. Investigation Method */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider">
                    <Wrench className="w-4 h-4 shrink-0" />
                    <span>{t('methodLabel')}</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {caseData.investigation_method || <span className="text-slate-600 italic">No method notes recorded.</span>}
                  </div>
                </div>

                {/* 4. Root Cause */}
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 uppercase tracking-wider">
                    <AlertOctagon className="w-4 h-4 shrink-0" />
                    <span>{t('rootCauseLabel')}</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {caseData.root_cause || <span className="text-slate-600 italic">No root cause identified.</span>}
                  </div>
                </div>
              </div>

              {/* 5. Remediation & Containment */}
              {caseData.remediation && (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>{t('remediationLabel')}</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {caseData.remediation}
                  </div>
                </div>
              )}

              {/* 6. Conclusion */}
              {caseData.conclusion && (
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider">
                    <Award className="w-4 h-4 shrink-0" />
                    <span>{t('conclusionLabel')}</span>
                  </div>
                  <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                    {caseData.conclusion}
                  </div>
                </div>
              )}

              {/* Tags */}
              {caseData.tags && (
                <div className="flex items-center flex-wrap gap-1.5 pt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  {caseData.tags.split(',').map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-xs font-mono bg-slate-800 text-slate-300 border border-slate-700/60"
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              {/* Detected IOCs in this Case */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">
                      {t('relatedIocs')} ({caseData.iocs.length})
                    </h3>
                  </div>

                  {/* Attach IOC dropdown */}
                  {unlinkedIocs.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedIocToLink}
                        onChange={(e) => setSelectedIocToLink(e.target.value ? Number(e.target.value) : '')}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 max-w-xs font-mono"
                      >
                        <option value="">{t('linkExistingIoc')}</option>
                        {unlinkedIocs.map((ioc) => (
                          <option key={ioc.id} value={ioc.id}>
                            [{ioc.ioc_type}] {ioc.value.slice(0, 32)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLinkIoc}
                        disabled={!selectedIocToLink || linking}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('linkButton')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {caseData.iocs.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-950/30 p-4 rounded-lg border border-dashed border-slate-800 text-center font-mono">
                    {t('noIocsLinked')}
                  </div>
                ) : (
                  <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono">
                        <tr>
                          <th className="py-2 px-3">{t('iocTypeCol')}</th>
                          <th className="py-2 px-3">{t('iocValueCol')}</th>
                          <th className="py-2 px-3">{t('iocContextCol')}</th>
                          <th className="py-2 px-3 text-right">{t('actionsCol')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 font-mono">
                        {caseData.iocs.map((ioc) => (
                          <tr key={ioc.id} className="hover:bg-slate-900/40 transition-colors">
                            <td className="py-2.5 px-3">
                              <IOCTypeBadge iocType={ioc.ioc_type} />
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-200 break-all select-all font-mono">
                                  {ioc.value}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(ioc.value)}
                                  className="text-slate-500 hover:text-cyan-400 p-0.5"
                                  title={t('copyIocTitle')}
                                >
                                  {copiedValue === ioc.value ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 font-sans text-xs">
                              {ioc.description || '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  onClose()
                                  onNavigateToIOC(ioc.id)
                                }}
                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-[11px] font-medium border border-slate-700/80"
                              >
                                {t('viewInIocs')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUnlinkIoc(ioc.id)}
                                className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/20"
                                title={t('unlinkIocTitle')}
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

