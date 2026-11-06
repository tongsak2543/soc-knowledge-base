import React, { useState, useEffect, useMemo } from 'react'
import { X, AlertCircle, Sparkles, Layers, FileText, CheckCircle2 } from 'lucide-react'
import { IOC_TYPES, detectIocType } from '../types'
import type {
  IOCType,
  IOCDetail,
  IOCFormData,
  CaseListItem,
} from '../types'
import { IOCTypeBadge } from './Badges'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

interface IOCFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingIoc?: IOCDetail | null
  initialCaseId?: number | null
}

export const IOCFormModal: React.FC<IOCFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingIoc,
  initialCaseId,
}) => {
  const { t } = useLanguage()

  // Form Mode: Single or Bulk Multi-Add
  const [mode, setMode] = useState<'single' | 'bulk'>('bulk')

  // Single Form State
  const [formData, setFormData] = useState<IOCFormData>({
    ioc_type: 'IPv4',
    value: '',
    description: '',
    case_ids: [],
  })

  // Bulk Multi-Add State
  const [bulkText, setBulkText] = useState('')
  const [bulkType, setBulkType] = useState<IOCType | 'AUTO'>('AUTO')
  const [bulkDescription, setBulkDescription] = useState('')

  const [availableCases, setAvailableCases] = useState<CaseListItem[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [bulkResult, setBulkResult] = useState<{
    created: number
    duplicate: number
    invalid: number
  } | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadCaseOptions()
      setBulkResult(null)
      setError(null)

      if (editingIoc) {
        setMode('single')
        setFormData({
          ioc_type: editingIoc.ioc_type,
          value: editingIoc.value,
          description: editingIoc.description || '',
          case_ids: editingIoc.cases.map((c) => c.id),
        })
      } else {
        setMode('bulk')
        setFormData({
          ioc_type: 'IPv4',
          value: '',
          description: '',
          case_ids: initialCaseId ? [initialCaseId] : [],
        })
        setBulkText('')
        setBulkType('AUTO')
        setBulkDescription('')
      }
    }
  }, [isOpen, editingIoc, initialCaseId])

  const loadCaseOptions = async () => {
    try {
      const data = await api.getCases({ limit: 100 })
      setAvailableCases(data)
    } catch {
      // Ignored
    }
  }

  const toggleCaseAssociation = (caseId: number) => {
    setFormData((prev) => {
      const exists = prev.case_ids.includes(caseId)
      return {
        ...prev,
        case_ids: exists
          ? prev.case_ids.filter((id) => id !== caseId)
          : [...prev.case_ids, caseId],
      }
    })
  }

  // Parse bulk text into items with auto-detected types
  const parsedBulkItems = useMemo(() => {
    if (!bulkText.trim()) return []
    const rawTokens = bulkText
      .split(/[\r\n,]+/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)

    return rawTokens.map((val) => {
      const detected = bulkType === 'AUTO' ? detectIocType(val) : bulkType
      return {
        ioc_type: detected,
        value: val,
      }
    })
  }, [bulkText, bulkType])

  // Count by type in preview
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of parsedBulkItems) {
      counts[item.ioc_type] = (counts[item.ioc_type] || 0) + 1
    }
    return counts
  }, [parsedBulkItems])

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.value.trim()) {
      setError('Indicator value cannot be empty')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      if (editingIoc) {
        await api.updateIOC(editingIoc.id, {
          ioc_type: formData.ioc_type,
          value: formData.value.trim(),
          description: formData.description.trim() || undefined,
          case_ids: formData.case_ids,
        })
      } else {
        await api.createIOC({
          ioc_type: formData.ioc_type,
          value: formData.value.trim(),
          description: formData.description.trim() || undefined,
          case_ids: formData.case_ids,
        })
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.detail || err.message || 'Failed to save IOC record')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (parsedBulkItems.length === 0) {
      setError('Please paste at least one indicator value')
      return
    }

    try {
      setSubmitting(true)
      setError(null)
      const res = await api.bulkCreateIOCs({
        items: parsedBulkItems.map((item) => ({
          ioc_type: item.ioc_type,
          value: item.value,
          description: bulkDescription.trim() || undefined,
        })),
        case_ids: formData.case_ids.length > 0 ? formData.case_ids : undefined,
      })

      setBulkResult({
        created: res.created_count,
        duplicate: res.duplicate_count,
        invalid: res.invalid_count,
      })

      onSuccess()
      setTimeout(() => {
        onClose()
      }, 1200)
    } catch (err: any) {
      setError(err.detail || err.message || 'Failed to submit bulk indicators')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>{editingIoc ? t('editIocTitle') : t('createIocTitle')}</span>
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {t('iocFormSubtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (only when adding new) */}
        {!editingIoc && (
          <div className="px-6 pt-3 bg-slate-950/40 border-b border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode('bulk')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                mode === 'bulk'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('bulkIocTab')}</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
                mode === 'single'
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t('singleIocTab')}</span>
            </button>
          </div>
        )}

        {/* Error notification banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success Feedback banner for Bulk */}
        {bulkResult && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 text-emerald-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Added {bulkResult.created} new indicators ({bulkResult.duplicate} existing/duplicate, {bulkResult.invalid} invalid).
            </span>
          </div>
        )}

        {/* Form Body - Bulk Mode */}
        {mode === 'bulk' && !editingIoc ? (
          <form onSubmit={handleBulkSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* Top Row: Type selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-300">
                {t('iocTypeField')}
              </label>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value as IOCType | 'AUTO')}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-cyan-300 focus:outline-none focus:border-cyan-500 font-mono font-semibold"
              >
                <option value="AUTO">{t('autoDetectType')}</option>
                {IOC_TYPES.map((tVal) => (
                  <option key={tVal} value={tVal}>
                    {tVal}
                  </option>
                ))}
              </select>
            </div>

            {/* Multiline Paste Textarea */}
            <div>
              <textarea
                rows={6}
                required
                placeholder={t('bulkIocPlaceholder')}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {t('defangNotice')}
              </p>
            </div>

            {/* Live Parsed Preview */}
            {parsedBulkItems.length > 0 && (
              <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{parsedBulkItems.length} {t('bulkDetectedCount')}</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(typeCounts).map(([type, cnt]) => (
                      <span
                        key={type}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300"
                      >
                        {cnt} {type}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="max-h-28 overflow-y-auto divide-y divide-slate-800/60 font-mono text-xs">
                  {parsedBulkItems.slice(0, 15).map((item, idx) => (
                    <div key={idx} className="py-1 flex items-center justify-between gap-2">
                      <span className="truncate text-slate-300">{item.value}</span>
                      <IOCTypeBadge iocType={item.ioc_type} />
                    </div>
                  ))}
                  {parsedBulkItems.length > 15 && (
                    <div className="pt-1 text-[11px] text-slate-500 text-center font-sans">
                      + {parsedBulkItems.length - 15} more indicators...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bulk Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('iocDescField')} (Optional for all items)
              </label>
              <input
                type="text"
                placeholder={t('iocDescPlaceholder')}
                value={bulkDescription}
                onChange={(e) => setBulkDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Associate with Cases */}
            {availableCases.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('associateCasesField')} ({formData.case_ids.length} {t('selectedCount')})
                </label>
                <div className="max-h-32 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1.5">
                  {availableCases.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center space-x-2 text-xs text-slate-300 hover:bg-slate-900 p-1.5 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.case_ids.includes(c.id)}
                        onChange={() => toggleCaseAssociation(c.id)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-[10px] font-mono px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {c.case_id}
                      </span>
                      <span className="truncate flex-1 text-slate-200">{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                disabled={submitting || parsedBulkItems.length === 0}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/40 transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>
                  {submitting
                    ? 'Processing...'
                    : `${t('bulkSaveBtn')} (${parsedBulkItems.length})`}
                </span>
              </button>
            </div>
          </form>
        ) : (
          /* Form Body - Single Mode */
          <form onSubmit={handleSingleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {/* IOC Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('iocTypeField')} <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.ioc_type}
                onChange={(e) => setFormData({ ...formData, ioc_type: e.target.value as IOCType })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
              >
                {IOC_TYPES.map((tVal) => (
                  <option key={tVal} value={tVal}>
                    {tVal}
                  </option>
                ))}
              </select>
            </div>

            {/* IOC Value */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('iocValueField')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={
                  formData.ioc_type === 'IPv4'
                    ? 'e.g. 192.168.1.1 or 192[.]168[.]1[.]1'
                    : formData.ioc_type === 'Domain'
                    ? 'e.g. evil-c2[.]com'
                    : formData.ioc_type === 'URL'
                    ? 'e.g. hxxps://bad.com/payload.exe'
                    : formData.ioc_type === 'SHA256'
                    ? '64-character hexadecimal hash'
                    : 'Enter indicator value...'
                }
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                {t('defangNotice')}
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('iocDescField')}
              </label>
              <textarea
                rows={3}
                placeholder={t('iocDescPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Associate Cases */}
            {availableCases.length > 0 && (
              <div className="pt-2 border-t border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  {t('associateCasesField')} ({formData.case_ids.length} {t('selectedCount')})
                </label>
                <div className="max-h-36 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1.5">
                  {availableCases.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center space-x-2 text-xs text-slate-300 hover:bg-slate-900 p-1.5 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.case_ids.includes(c.id)}
                        onChange={() => toggleCaseAssociation(c.id)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                      />
                      <span className="text-[10px] font-mono px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {c.case_id}
                      </span>
                      <span className="truncate flex-1 text-slate-200">{c.title}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Footer buttons */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {t('cancelBtn')}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/40 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving...' : editingIoc ? t('updateIocBtn') : t('saveIocBtn')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
