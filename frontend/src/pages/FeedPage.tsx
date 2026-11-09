import React, { useState, useEffect } from 'react'
import {
  Rss,
  Search,
  ExternalLink,
  RefreshCw,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ShieldAlert,
} from 'lucide-react'
import type { FeedItem, FeedSource } from '../types'
import { SeverityBadge, CategoryBadge } from '../components/Badges'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../services/api'

interface FeedPageProps {
  onNavigateToCase?: (caseId: number) => void
}

export const FeedPage: React.FC<FeedPageProps> = ({ onNavigateToCase }) => {
  const { t } = useLanguage()
  const [items, setItems] = useState<FeedItem[]>([])
  const [sources, setSources] = useState<FeedSource[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')

  // Convert to Case State
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertedMap, setConvertedMap] = useState<Record<string, string>>({})
  const [copiedIoc, setCopiedIoc] = useState<string | null>(null)

  useEffect(() => {
    loadFeeds(false)
  }, [])

  const loadFeeds = async (force: boolean) => {
    try {
      if (force) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      const data = await api.getFeeds({
        source_id: selectedSource !== 'all' ? selectedSource : undefined,
        q: searchQuery.trim() || undefined,
        refresh: force,
      })
      setItems(data.items as any)
      if (data.sources && data.sources.length > 0) {
        setSources(data.sources)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live threat feeds.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadFeeds(false)
  }

  const handleSourceChange = (srcId: string) => {
    setSelectedSource(srcId)
  }

  const handleConvertToCase = async (item: FeedItem) => {
    try {
      setConvertingId(item.id)
      const res = await api.convertFeedToCase({
        title: item.title,
        link: item.link,
        summary: item.summary,
        source_name: item.source_name,
        category: item.category,
        severity: item.severity,
        extracted_iocs: item.extracted_iocs,
      })

      setConvertedMap((prev) => ({ ...prev, [item.id]: res.case_id }))

      if (onNavigateToCase) {
        setTimeout(() => {
          onNavigateToCase(res.id)
        }, 1200)
      }
    } catch (err: any) {
      alert(`Failed to convert feed to case: ${err.message || 'Server error'}`)
    } finally {
      setConvertingId(null)
    }
  }

  const handleCopyIoc = (iocVal: string) => {
    navigator.clipboard.writeText(iocVal)
    setCopiedIoc(iocVal)
    setTimeout(() => setCopiedIoc(null), 2000)
  }

  const filteredItems = items.filter((item) => {
    if (selectedSource !== 'all' && item.source_id !== selectedSource) {
      return false
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.source_name.toLowerCase().includes(q)
      )
    }
    return true
  })

  const getSourceBadgeStyle = (sourceId: string) => {
    switch (sourceId) {
      case 'thn':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
      case 'unit42':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-300'
      case 'krebs':
        return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
      case 'sans':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      default:
        return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
    }
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-rose-500 to-amber-600 rounded-lg shadow-md shadow-rose-900/40 text-white">
              <Rss className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {t('feedsTitle')}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  LIVE OSINT
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">{t('feedsSubtitle')}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadFeeds(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            title="Fetch latest updates from all security feeds"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{t('refreshFeeds')}</span>
          </button>
          <LanguageToggle />
        </div>
      </div>

      {/* Source Selector Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-slate-400 mr-1">{t('sourceLabel')}:</span>
        <button
          onClick={() => handleSourceChange('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            selectedSource === 'all'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/40'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
          }`}
        >
          {t('allSources')} ({items.length})
        </button>

        {sources.map((src) => {
          const count = items.filter((i) => i.source_id === src.id).length
          const isSelected = selectedSource === src.id
          return (
            <button
              key={src.id}
              onClick={() => handleSourceChange(src.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                isSelected
                  ? 'bg-slate-800 text-white border-cyan-400 shadow-sm'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
              }`}
            >
              <span>{src.name}</span>
              <span className="ml-1.5 text-[10px] font-mono px-1 rounded bg-slate-950/80 text-slate-400">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search Input Bar */}
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('searchFeedsPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
          />
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
          <p className="text-xs text-slate-400 font-mono">
            Fetching authentic threat feeds from publishers...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredItems.length === 0 && (
        <div className="py-16 text-center border border-dashed border-slate-800 rounded-xl p-8 bg-slate-900/30">
          <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-slate-300">{t('noFeedsFound')}</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{t('noFeedsFoundDesc')}</p>
        </div>
      )}

      {/* News Grid */}
      {!loading && filteredItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.map((item) => {
            const convertedCaseId = convertedMap[item.id]
            const isConverting = convertingId === item.id

            return (
              <div
                key={item.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div className="space-y-2.5">
                  {/* Top line: Source Badge + Date + Category */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${getSourceBadgeStyle(
                          item.source_id
                        )}`}
                      >
                        {item.source_name}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {item.published_date}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <CategoryBadge category={item.category} />
                      <SeverityBadge severity={item.severity} />
                    </div>
                  </div>

                  {/* Headline */}
                  <h3 className="text-sm font-bold text-slate-100 hover:text-cyan-400 transition-colors leading-snug">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h3>

                  {/* Summary */}
                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Extracted IOCs */}
                  {item.extracted_iocs && item.extracted_iocs.length > 0 && (
                    <div className="pt-2 border-t border-slate-800/60">
                      <div className="text-[11px] font-semibold text-slate-400 mb-1 flex items-center gap-1">
                        <span>{t('detectedIocs')}:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
                        {item.extracted_iocs.map((ioc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleCopyIoc(ioc.value)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-cyan-300 transition-colors"
                            title="Click to copy IOC"
                          >
                            <span className="text-slate-500 font-sans">{ioc.type}:</span>
                            <span>{ioc.value}</span>
                            {copiedIoc === ioc.value ? (
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-2.5 h-2.5 text-slate-500" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
                  >
                    <span>{t('readArticle')}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  {convertedCaseId ? (
                    <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{convertedCaseId}</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isConverting}
                      onClick={() => handleConvertToCase(item)}
                      className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{isConverting ? t('converting') : t('convertToCase')}</span>
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
