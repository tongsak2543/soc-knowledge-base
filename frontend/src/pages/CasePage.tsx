import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Calendar,
  Crosshair,
  RotateCw,
  ChevronRight,
} from 'lucide-react'
import { CATEGORIES, SEVERITIES, STATUSES } from '../types'
import type { CaseListItem, CaseDetail } from '../types'
import { SeverityBadge, CategoryBadge, StatusBadge } from '../components/Badges'
import { CaseFormModal } from '../components/CaseFormModal'
import { CaseDetailModal } from '../components/CaseDetailModal'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../services/api'

interface CasePageProps {
  onNavigateToIOC: (iocId: number) => void
  refreshTrigger: number
}

export const CasePage: React.FC<CasePageProps> = ({
  onNavigateToIOC,
  refreshTrigger,
}) => {
  const { t, language } = useLanguage()
  const [cases, setCases] = useState<CaseListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Prominent Search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedSeverity, setSelectedSeverity] = useState<string>('')
  const [selectedStatus, setSelectedStatus] = useState<string>('')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCase, setEditingCase] = useState<CaseDetail | null>(null)
  const [detailCaseId, setDetailCaseId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  useEffect(() => {
    loadCases()
  }, [selectedCategory, selectedSeverity, selectedStatus, refreshTrigger])

  const loadCases = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getCases({
        q: searchQuery.trim() || undefined,
        category: selectedCategory || undefined,
        severity: selectedSeverity || undefined,
        case_status: selectedStatus || undefined,
      })
      setCases(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load investigation cases from knowledge base.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadCases()
  }

  const handleOpenDetail = (id: number) => {
    setDetailCaseId(id)
    setIsDetailOpen(true)
  }

  const handleStartCreate = () => {
    setEditingCase(null)
    setIsFormOpen(true)
  }

  const handleStartEdit = async (c: CaseDetail) => {
    setIsDetailOpen(false)
    setEditingCase(c)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(`${t('deleteCaseConfirm')} #${id}?`)) {
      return
    }
    try {
      await api.deleteCase(id)
      setIsDetailOpen(false)
      loadCases()
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`)
    }
  }

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('caseTitle')}</h1>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
              {cases.length} {t('casesCount')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            {t('caseSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            onClick={handleStartCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-cyan-950 transition-all hover:shadow-cyan-800/40"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addCase')}</span>
          </button>
        </div>
      </div>

      {/* Prominent Search Bar (เด่นชัดและใช้งานง่ายตามโจทย์) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900/90 border-2 border-slate-700/80 hover:border-cyan-500/50 rounded-2xl p-4 shadow-xl backdrop-blur transition-all">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="relative">
            <Search className="w-5 h-5 text-cyan-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder={t('searchCasePlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans shadow-inner"
            />
          </div>

          {/* Quick Filters Row */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2.5 pt-1">
            {/* Category Filter */}
            <div className="flex-1 min-w-[140px]">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('allCategories')}</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex-1 min-w-[130px]">
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('allSeverities')}</option>
                {SEVERITIES.map((sev) => (
                  <option key={sev} value={sev}>
                    {sev}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex-1 min-w-[130px]">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">{t('allStatuses')}</option>
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit / Refresh Button */}
            <button
              type="submit"
              className="px-5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 rounded-lg text-xs font-semibold border border-cyan-500/40 transition-colors flex items-center justify-center gap-2 shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{t('filterButton')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 space-y-3 animate-pulse"
            >
              <div className="flex justify-between items-center">
                <div className="w-20 h-5 bg-slate-800 rounded" />
                <div className="w-24 h-4 bg-slate-800 rounded" />
              </div>
              <div className="w-full h-6 bg-slate-800 rounded" />
              <div className="w-4/5 h-4 bg-slate-800 rounded" />
              <div className="w-full h-12 bg-slate-800/60 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && cases.length === 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{t('noCasesFound')}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('noCasesFoundDesc')}
            </p>
          </div>
          <button
            onClick={handleStartCreate}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {t('addCaseManually')}
          </button>
        </div>
      )}

      {/* Case Cards Grid */}
      {!loading && cases.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => handleOpenDetail(c.id)}
              className="bg-slate-900/80 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl p-5 shadow-sm hover:shadow-cyan-950/20 transition-all flex flex-col justify-between cursor-pointer group"
            >
              <div className="space-y-3">
                {/* Header: Case ID & Status & Severity */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono font-bold text-cyan-300 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                    {c.case_id}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={c.status} size="sm" />
                    <SeverityBadge severity={c.severity} size="sm" />
                  </div>
                </div>

                {/* Title */}
                <h3 className="font-semibold text-white group-hover:text-cyan-300 transition-colors text-base line-clamp-2 leading-snug">
                  {c.title}
                </h3>

                {/* Category & Incident Date */}
                <div className="flex items-center justify-between text-xs">
                  <CategoryBadge category={c.category} />
                  {c.incident_date && (
                    <span className="text-[11px] text-slate-500 font-mono flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(c.incident_date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                    </span>
                  )}
                </div>

                {/* Summary / Excerpt */}
                <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                  {c.summary || (language === 'th' ? 'คลิกเพื่อเปิดดูผลการตรวจสอบและวิธีแก้ไข...' : 'Click to inspect investigation findings, root cause, and remediation...')}
                </p>

                {/* Tags */}
                {c.tags && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {c.tags
                      .split(',')
                      .slice(0, 3)
                      .map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-950 text-slate-400 border border-slate-800"
                        >
                          #{tag.trim()}
                        </span>
                      ))}
                  </div>
                )}
              </div>

              {/* Bottom footer with IOC count & action */}
              <div className="pt-4 mt-4 border-t border-slate-800/70 flex items-center justify-between text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span className={c.ioc_count > 0 ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
                    {c.ioc_count} {t('iocsCount')}
                  </span>
                </span>

                <span className="flex items-center gap-1 group-hover:text-cyan-400 transition-colors text-[11px]">
                  <span>{t('viewDetails')}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      <CaseFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadCases}
        editingCase={editingCase}
      />

      {/* Detail Modal */}
      <CaseDetailModal
        caseId={detailCaseId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
        onNavigateToIOC={onNavigateToIOC}
        onCaseUpdated={loadCases}
      />
    </div>
  )
}
