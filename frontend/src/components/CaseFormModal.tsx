import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, AlertCircle } from 'lucide-react'
import { CATEGORIES, SEVERITIES, STATUSES, IOC_TYPES } from '../types'
import type {
  ThreatCategory,
  ThreatSeverity,
  CaseStatus,
  IOCType,
  CaseDetail,
  CaseFormData,
  IOCListItem,
} from '../types'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'

interface CaseFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  editingCase?: CaseDetail | null
}

export const CaseFormModal: React.FC<CaseFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingCase,
}) => {
  const { t } = useLanguage()
  const [formData, setFormData] = useState<CaseFormData>({
    case_id: '',
    title: '',
    summary: '',
    category: 'Malware',
    severity: 'Medium',
    status: 'Resolved',
    investigation_findings: '',
    observed_behavior: '',
    investigation_method: '',
    root_cause: '',
    remediation: '',
    conclusion: '',
    tags: '',
    incident_date: new Date().toISOString().slice(0, 16),
    ioc_ids: [],
    new_iocs: [],
  })

  const [availableIocs, setAvailableIocs] = useState<IOCListItem[]>([])
  const [inlineIocType, setInlineIocType] = useState<IOCType>('IPv4')
  const [inlineIocVal, setInlineIocVal] = useState('')
  const [inlineIocDesc, setInlineIocDesc] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadAvailableIocs()
      if (editingCase) {
        setFormData({
          case_id: editingCase.case_id,
          title: editingCase.title,
          summary: editingCase.summary || '',
          category: editingCase.category,
          severity: editingCase.severity,
          status: editingCase.status,
          investigation_findings: editingCase.investigation_findings || '',
          observed_behavior: editingCase.observed_behavior || '',
          investigation_method: editingCase.investigation_method || '',
          root_cause: editingCase.root_cause || '',
          remediation: editingCase.remediation || '',
          conclusion: editingCase.conclusion || '',
          tags: editingCase.tags || '',
          incident_date: editingCase.incident_date
            ? new Date(editingCase.incident_date).toISOString().slice(0, 16)
            : new Date().toISOString().slice(0, 16),
          ioc_ids: editingCase.iocs.map((i) => i.id),
          new_iocs: [],
        })
      } else {
        const generatedId = `CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 900) + 100)}`
        setFormData({
          case_id: generatedId,
          title: '',
          summary: '',
          category: 'Malware',
          severity: 'Medium',
          status: 'Resolved',
          investigation_findings: '',
          observed_behavior: '',
          investigation_method: '',
          root_cause: '',
          remediation: '',
          conclusion: '',
          tags: '',
          incident_date: new Date().toISOString().slice(0, 16),
          ioc_ids: [],
          new_iocs: [],
        })
      }
      setError(null)
    }
  }, [isOpen, editingCase])

  const loadAvailableIocs = async () => {
    try {
      const data = await api.getIOCs({ limit: 100 })
      setAvailableIocs(data)
    } catch {
      // Ignored
    }
  }

  const handleAddInlineIoc = () => {
    if (!inlineIocVal.trim()) return
    setFormData((prev) => ({
      ...prev,
      new_iocs: [
        ...prev.new_iocs,
        {
          ioc_type: inlineIocType,
          value: inlineIocVal.trim(),
          description: inlineIocDesc.trim(),
        },
      ],
    }))
    setInlineIocVal('')
    setInlineIocDesc('')
  }

  const handleRemoveInlineIoc = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      new_iocs: prev.new_iocs.filter((_, i) => i !== index),
    }))
  }

  const toggleExistingIoc = (iocId: number) => {
    setFormData((prev) => {
      const exists = prev.ioc_ids.includes(iocId)
      return {
        ...prev,
        ioc_ids: exists
          ? prev.ioc_ids.filter((id) => id !== iocId)
          : [...prev.ioc_ids, iocId],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.case_id.trim()) {
      setError('Case ID is required')
      return
    }
    if (!formData.title.trim()) {
      setError('Case title is required')
      return
    }

    try {
      setSubmitting(true)
      setError(null)

      if (editingCase) {
        await api.updateCase(editingCase.id, {
          case_id: formData.case_id,
          title: formData.title,
          summary: formData.summary,
          category: formData.category,
          severity: formData.severity,
          status: formData.status,
          investigation_findings: formData.investigation_findings,
          observed_behavior: formData.observed_behavior,
          investigation_method: formData.investigation_method,
          root_cause: formData.root_cause,
          remediation: formData.remediation,
          conclusion: formData.conclusion,
          tags: formData.tags,
          incident_date: formData.incident_date,
          ioc_ids: formData.ioc_ids,
        })
      } else {
        await api.createCase(formData)
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.detail || err.message || 'Failed to save case')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl shadow-2xl my-6 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div>
            <h2 className="text-base font-bold text-white">
              {editingCase ? t('editCaseFormTitle') : t('createCaseTitle')}
            </h2>
            <p className="text-xs text-slate-400">
              {t('formSubtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-start gap-2.5 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {/* Top metadata grid: Case ID & Title */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('fieldCaseId')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('fieldCaseIdPlaceholder')}
                value={formData.case_id}
                onChange={(e) => setFormData({ ...formData, case_id: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-cyan-300 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono font-semibold"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('fieldTitle')} <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder={t('fieldTitlePlaceholder')}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Category, Severity, Status, Incident Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('fieldCategory')} <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as ThreatCategory })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('fieldSeverity')} <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.severity}
                onChange={(e) =>
                  setFormData({ ...formData, severity: e.target.value as ThreatSeverity })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('fieldStatus')} <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as CaseStatus })
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {t('fieldIncidentDate')}
              </label>
              <input
                type="datetime-local"
                value={formData.incident_date}
                onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t('fieldSummary')}
            </label>
            <textarea
              rows={2}
              placeholder={t('fieldSummaryPlaceholder')}
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* DFIR Core 1 & 2: Findings & Observed Behavior */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-cyan-400 mb-1">
                {t('fieldFindings')}
              </label>
              <textarea
                rows={4}
                placeholder={t('fieldFindingsPlaceholder')}
                value={formData.investigation_findings}
                onChange={(e) => setFormData({ ...formData, investigation_findings: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-amber-400 mb-1">
                {t('fieldBehavior')}
              </label>
              <textarea
                rows={4}
                placeholder={t('fieldBehaviorPlaceholder')}
                value={formData.observed_behavior}
                onChange={(e) => setFormData({ ...formData, observed_behavior: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* DFIR Core 3 & 4: Investigation Method & Root Cause */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-teal-400 mb-1">
                {t('fieldMethod')}
              </label>
              <textarea
                rows={3}
                placeholder={t('fieldMethodPlaceholder')}
                value={formData.investigation_method}
                onChange={(e) => setFormData({ ...formData, investigation_method: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-rose-400 mb-1">
                {t('fieldRootCause')}
              </label>
              <textarea
                rows={3}
                placeholder={t('fieldRootCausePlaceholder')}
                value={formData.root_cause}
                onChange={(e) => setFormData({ ...formData, root_cause: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* DFIR Core 5 & 6: Remediation & Conclusion */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-emerald-400 mb-1">
                {t('fieldRemediation')}
              </label>
              <textarea
                rows={3}
                placeholder={t('fieldRemediationPlaceholder')}
                value={formData.remediation}
                onChange={(e) => setFormData({ ...formData, remediation: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-purple-400 mb-1">
                {t('fieldConclusion')}
              </label>
              <textarea
                rows={3}
                placeholder={t('fieldConclusionPlaceholder')}
                value={formData.conclusion}
                onChange={(e) => setFormData({ ...formData, conclusion: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono leading-relaxed"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              {t('fieldTags')}
            </label>
            <input
              type="text"
              placeholder={t('fieldTagsPlaceholder')}
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          {/* Link Existing IOCs */}
          {availableIocs.length > 0 && (
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('associateExistingIocs')} ({formData.ioc_ids.length} {t('selectedCount')})
              </label>
              <div className="max-h-32 overflow-y-auto bg-slate-950 border border-slate-800 rounded-lg p-2 space-y-1.5">
                {availableIocs.map((ioc) => (
                  <label
                    key={ioc.id}
                    className="flex items-center space-x-2 text-xs text-slate-300 hover:bg-slate-900 p-1 rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.ioc_ids.includes(ioc.id)}
                      onChange={() => toggleExistingIoc(ioc.id)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span className="font-mono text-cyan-400 font-semibold px-1 rounded bg-slate-900 border border-slate-800 text-[10px]">
                      {ioc.ioc_type}
                    </span>
                    <span className="font-mono truncate">{ioc.value}</span>
                    {ioc.description && (
                      <span className="text-slate-500 truncate text-[11px]">- {ioc.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Add New IOC Inline (only for creation) */}
          {!editingCase && (
            <div className="pt-2 border-t border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('addNewIocsInline')}
              </label>

              <div className="flex flex-col sm:flex-row gap-2 mb-2">
                <select
                  value={inlineIocType}
                  onChange={(e) => setInlineIocType(e.target.value as IOCType)}
                  className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  {IOC_TYPES.map((tVal) => (
                    <option key={tVal} value={tVal}>
                      {tVal}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder={t('inlineIocPlaceholder')}
                  value={inlineIocVal}
                  onChange={(e) => setInlineIocVal(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-cyan-500"
                />

                <input
                  type="text"
                  placeholder={t('inlineDescPlaceholder')}
                  value={inlineIocDesc}
                  onChange={(e) => setInlineIocDesc(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />

                <button
                  type="button"
                  onClick={handleAddInlineIoc}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium text-xs rounded-lg flex items-center gap-1 border border-slate-700 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('attachBtn')}</span>
                </button>
              </div>

              {formData.new_iocs.length > 0 && (
                <div className="space-y-1 mt-2">
                  {formData.new_iocs.map((ioc, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-slate-950/80 border border-slate-800 px-2.5 py-1.5 rounded text-xs"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-[10px] bg-cyan-950 text-cyan-400 px-1 rounded border border-cyan-800/60">
                          {ioc.ioc_type}
                        </span>
                        <span className="text-slate-200">{ioc.value}</span>
                        {ioc.description && (
                          <span className="text-slate-400 text-[11px]">({ioc.description})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInlineIoc(idx)}
                        className="text-slate-500 hover:text-rose-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Form Actions */}
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
              {submitting ? 'Saving...' : editingCase ? t('updateBtn') : t('saveBtn')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

