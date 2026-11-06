import React, { useState, useEffect } from 'react'
import {
  X,
  Copy,
  Check,
  Calendar,
  Briefcase,
  Trash2,
  Edit,
  Plus,
  Unlink,
  ExternalLink,
} from 'lucide-react'
import type { IOCDetail, CaseListItem } from '../types'
import { IOCTypeBadge, SeverityBadge, CategoryBadge, StatusBadge } from './Badges'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

interface IOCDetailModalProps {
  iocId: number | null
  isOpen: boolean
  onClose: () => void
  onEdit: (ioc: IOCDetail) => void
  onDelete: (id: number) => void
  onNavigateToCase: (caseId: number) => void
  onIocUpdated: () => void
}

export const IOCDetailModal: React.FC<IOCDetailModalProps> = ({
  iocId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onNavigateToCase,
  onIocUpdated,
}) => {
  const { t, language } = useLanguage()
  const [ioc, setIoc] = useState<IOCDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Attach Case state
  const [allCases, setAllCases] = useState<CaseListItem[]>([])
  const [selectedCaseToLink, setSelectedCaseToLink] = useState<number | ''>('')
  const [linking, setLinking] = useState(false)

  useEffect(() => {
    if (isOpen && iocId) {
      loadIocDetail(iocId)
      loadAvailableCases()
    } else {
      setIoc(null)
      setError(null)
    }
  }, [isOpen, iocId])

  const loadIocDetail = async (id: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getIOCById(id)
      setIoc(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load IOC details')
    } finally {
      setLoading(false)
    }
  }

  const loadAvailableCases = async () => {
    try {
      const data = await api.getCases({ limit: 150 })
      setAllCases(data)
    } catch {
      // Ignored
    }
  }

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(fieldName)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleUnlinkCase = async (caseId: number) => {
    if (!ioc) return
    try {
      await api.unlinkCaseFromIOC(ioc.id, caseId)
      loadIocDetail(ioc.id)
      onIocUpdated()
    } catch (err: any) {
      alert(`Failed to unlink case: ${err.message}`)
    }
  }

  const handleLinkCase = async () => {
    if (!ioc || !selectedCaseToLink) return
    try {
      setLinking(true)
      await api.linkCaseToIOC(ioc.id, Number(selectedCaseToLink))
      setSelectedCaseToLink('')
      loadIocDetail(ioc.id)
      onIocUpdated()
    } catch (err: any) {
      alert(`Failed to link case: ${err.message}`)
    } finally {
      setLinking(false)
    }
  }

  if (!isOpen) return null

  const unlinkedCases = allCases.filter(
    (c) => !ioc?.cases.some((existing) => existing.id === c.id)
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              {t('iocDetailNumber')}{iocId}
            </span>
            <span className="text-xs text-slate-400 font-mono">{t('portalSubtitle')}</span>
          </div>

          <div className="flex items-center space-x-2">
            {ioc && (
              <>
                <button
                  onClick={() => onEdit(ioc)}
                  className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Edit IOC"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(ioc.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                  title="Delete IOC"
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

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {loading && (
            <div className="py-12 flex justify-center items-center text-slate-400 font-mono text-sm">
              <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading indicator details...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-sm">
              {error}
            </div>
          )}

          {ioc && !loading && (
            <>
              {/* Type and Value Display */}
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <IOCTypeBadge iocType={ioc.ioc_type} />
                  <span className="text-[11px] font-mono text-slate-500">
                    ID: {ioc.id}
                  </span>
                </div>

                <div>
                  <div className="text-[11px] text-slate-400 uppercase font-mono tracking-wider mb-1">
                    {t('rawIndicatorValue')}
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-mono text-cyan-300 text-sm break-all select-all font-semibold">
                      {ioc.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ioc.value, 'raw')}
                      className="text-slate-400 hover:text-cyan-400 p-1 shrink-0"
                      title={t('copyIocTitle')}
                    >
                      {copiedField === 'raw' ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {ioc.normalized_value !== ioc.value && (
                  <div>
                    <div className="text-[11px] text-slate-400 uppercase font-mono tracking-wider mb-1">
                      {t('normIndicatorValue')}
                    </div>
                    <div className="flex items-center justify-between gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800/80">
                      <span className="font-mono text-slate-300 text-xs break-all select-all">
                        {ioc.normalized_value}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(ioc.normalized_value, 'norm')}
                        className="text-slate-400 hover:text-cyan-400 p-1 shrink-0"
                        title={t('copyIocTitle')}
                      >
                        {copiedField === 'norm' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  {t('contextAttribution')}
                </div>
                <div className="p-3 bg-slate-950/40 border border-slate-800 rounded-lg text-sm text-slate-300">
                  {ioc.description || (
                    <span className="text-slate-500 italic">{t('noNotes')}</span>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono pt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {t('firstAdded')}: {new Date(ioc.created_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}
                </span>
                <span>{t('updatedAt')}: {new Date(ioc.updated_at).toLocaleString(language === 'th' ? 'th-TH' : 'en-US')}</span>
              </div>

              {/* Historical Cases Detected In (แสดงประวัติเคสที่เคยพบ IOC นี้) */}
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-white">
                      {t('associatedCasesTitle')} ({ioc.cases.length})
                    </h3>
                  </div>

                  {unlinkedCases.length > 0 && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedCaseToLink}
                        onChange={(e) => setSelectedCaseToLink(e.target.value ? Number(e.target.value) : '')}
                        className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 max-w-xs font-mono"
                      >
                        <option value="">{t('linkToCasePlaceholder')}</option>
                        {unlinkedCases.map((c) => (
                          <option key={c.id} value={c.id}>
                            [{c.case_id}] {c.title.slice(0, 30)}...
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleLinkCase}
                        disabled={!selectedCaseToLink || linking}
                        className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        <span>{t('linkButton')}</span>
                      </button>
                    </div>
                  )}
                </div>

                {ioc.cases.length === 0 ? (
                  <div className="text-xs text-slate-500 bg-slate-950/30 p-4 rounded-lg border border-dashed border-slate-800 text-center font-mono">
                    {t('noCasesLinked')}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {ioc.cases.map((c) => (
                      <div
                        key={c.id}
                        className="bg-slate-950/60 border border-slate-800 p-3 rounded-lg flex items-center justify-between hover:border-slate-700 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800/60">
                              {c.case_id}
                            </span>
                            <StatusBadge status={c.status} size="sm" />
                            <SeverityBadge severity={c.severity} size="sm" />
                            <CategoryBadge category={c.category} />
                          </div>
                          <div className="text-sm font-medium text-white">{c.title}</div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              onClose()
                              onNavigateToCase(c.id)
                            }}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium border border-slate-700/80 flex items-center gap-1"
                          >
                            <span>{t('openCase')}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUnlinkCase(c.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/20"
                            title="Unlink case"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
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
