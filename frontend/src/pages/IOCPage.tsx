import React, { useState, useEffect } from 'react'
import {
  Search,
  Plus,
  Filter,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Edit,
  Eye,
  Crosshair,
} from 'lucide-react'
import { IOC_TYPES } from '../types'
import type { IOCListItem, IOCDetail } from '../types'
import { IOCTypeBadge } from '../components/Badges'
import { IOCFormModal } from '../components/IOCFormModal'
import { IOCDetailModal } from '../components/IOCDetailModal'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../services/api'

interface IOCPageProps {
  onNavigateToCase: (caseId: number) => void
  refreshTrigger: number
  targetIocId?: number | null
}

export const IOCPage: React.FC<IOCPageProps> = ({
  onNavigateToCase,
  refreshTrigger,
  targetIocId,
}) => {
  const { t, language } = useLanguage()
  const [iocs, setIocs] = useState<IOCListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('')

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingIoc, setEditingIoc] = useState<IOCDetail | null>(null)
  const [detailIocId, setDetailIocId] = useState<number | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // Copy feedback
  const [copiedId, setCopiedId] = useState<number | null>(null)

  useEffect(() => {
    loadIOCs()
  }, [selectedType, refreshTrigger])

  useEffect(() => {
    if (targetIocId) {
      setDetailIocId(targetIocId)
      setIsDetailOpen(true)
    }
  }, [targetIocId])

  const loadIOCs = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getIOCs({
        q: searchQuery.trim() || undefined,
        ioc_type: selectedType || undefined,
      })
      setIocs(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load IOC repository.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadIOCs()
  }

  const handleCopy = (ioc: IOCListItem) => {
    navigator.clipboard.writeText(ioc.value)
    setCopiedId(ioc.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleOpenDetail = (id: number) => {
    setDetailIocId(id)
    setIsDetailOpen(true)
  }

  const handleStartCreate = () => {
    setEditingIoc(null)
    setIsFormOpen(true)
  }

  const handleStartEdit = (ioc: IOCDetail) => {
    setIsDetailOpen(false)
    setEditingIoc(ioc)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm(`${t('deleteIocConfirm')} #${id}?`)) {
      return
    }
    try {
      await api.deleteIOC(id)
      setIsDetailOpen(false)
      loadIOCs()
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
            <h1 className="text-2xl font-bold text-white tracking-tight">{t('iocTitle')}</h1>
            <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-cyan-400 border border-slate-700">
              {iocs.length} {t('indicatorsCount')}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {t('iocSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle />
          <button
            onClick={handleStartCreate}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-cyan-950 transition-all hover:shadow-cyan-800/40"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addNewIoc')}</span>
          </button>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm backdrop-blur">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('searchIocPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>

          <div className="flex gap-3">
            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 font-mono"
              >
                <option value="">{t('allTypes')}</option>
                {IOC_TYPES.map((tVal) => (
                  <option key={tVal} value={tVal}>
                    {tVal}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Submit */}
            <button
              type="submit"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700/80 transition-colors flex items-center justify-center gap-1.5 shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-8 flex justify-center items-center text-slate-400 font-mono text-sm">
          <span className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-2" />
          Loading IOC repository...
        </div>
      )}

      {/* Empty State */}
      {!loading && iocs.length === 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-12 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
            <Crosshair className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{t('noIocFound')}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {t('noIocFoundDesc')}
            </p>
          </div>
          <button
            onClick={handleStartCreate}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-medium transition-colors"
          >
            {t('addNewIoc')}
          </button>
        </div>
      )}

      {/* IOC Table */}
      {!loading && iocs.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t('iocTypeCol')}</th>
                  <th className="py-3 px-4">{t('colRawValue')}</th>
                  <th className="py-3 px-4">{t('colNormValue')}</th>
                  <th className="py-3 px-4">{t('colDesc')}</th>
                  <th className="py-3 px-4 text-center">{t('colRelatedCases')}</th>
                  <th className="py-3 px-4">{t('colAdded')}</th>
                  <th className="py-3 px-4 text-right">{t('actionsCol')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {iocs.map((ioc) => (
                  <tr
                    key={ioc.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => handleOpenDetail(ioc.id)}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <IOCTypeBadge iocType={ioc.ioc_type} />
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-cyan-300 font-medium font-mono select-all">
                          {ioc.value}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCopy(ioc)
                          }}
                          className="text-slate-500 hover:text-cyan-400 p-0.5 transition-colors"
                          title={t('copyIocTitle')}
                        >
                          {copiedId === ioc.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-400 text-[11px]">
                      {ioc.normalized_value}
                    </td>

                    <td className="py-3 px-4 max-w-xs truncate text-slate-300 font-sans">
                      {ioc.description || <span className="text-slate-600">-</span>}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          ioc.case_count > 0
                            ? 'bg-cyan-950/70 text-cyan-300 border border-cyan-800/60'
                            : 'bg-slate-950 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {ioc.case_count} {ioc.case_count === 1 ? t('caseUnitSingle') : t('caseUnit')}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-400 text-[11px]">
                      {new Date(ioc.created_at).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}
                    </td>

                    <td
                      className="py-3 px-4 text-right whitespace-nowrap space-x-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => handleOpenDetail(ioc.id)}
                        className="p-1 rounded text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                        title="View IOC Detail"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={async () => {
                          const full = await api.getIOCById(ioc.id)
                          handleStartEdit(full)
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                        title="Edit IOC"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(ioc.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                        title="Delete IOC"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <IOCFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSuccess={loadIOCs}
        editingIoc={editingIoc}
      />

      {/* Detail Modal */}
      <IOCDetailModal
        iocId={detailIocId}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={handleStartEdit}
        onDelete={handleDelete}
        onNavigateToCase={onNavigateToCase}
        onIocUpdated={loadIOCs}
      />
    </div>
  )
}
