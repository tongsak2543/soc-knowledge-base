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
  Zap,
  Download,
  Crosshair,
} from 'lucide-react'
import type { FeedItem, FeedSource, LiveFeedIOCItem } from '../types'
import { SeverityBadge, CategoryBadge, IOCTypeBadge } from '../components/Badges'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../services/api'

interface FeedPageProps {
  onNavigateToCase?: (caseId: number) => void
}

export const FeedPage: React.FC<FeedPageProps> = ({ onNavigateToCase }) => {
  const { t } = useLanguage()

  // Active Tab: 'news' | 'iocs'
  const [activeTab, setActiveTab] = useState<'news' | 'iocs'>('iocs')

  // News State
  const [newsItems, setNewsItems] = useState<FeedItem[]>([])
  const [newsSources, setNewsSources] = useState<FeedSource[]>([])
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsRefreshing, setNewsRefreshing] = useState(false)
  const [newsError, setNewsError] = useState<string | null>(null)
  const [selectedNewsSource, setSelectedNewsSource] = useState<string>('all')

  // Live IOCs State
  const [iocItems, setIocItems] = useState<LiveFeedIOCItem[]>([])
  const [iocSources, setIocSources] = useState<FeedSource[]>([])
  const [iocLoading, setIocLoading] = useState(true)
  const [iocRefreshing, setIocRefreshing] = useState(false)
  const [iocError, setIocError] = useState<string | null>(null)
  const [selectedIocSource, setSelectedIocSource] = useState<string>('all')
  const [selectedIocType, setSelectedIocType] = useState<string>('all')

  // Common Filters
  const [searchQuery, setSearchQuery] = useState('')

  // Convert to Case State
  const [convertingId, setConvertingId] = useState<string | null>(null)
  const [convertedMap, setConvertedMap] = useState<Record<string, string>>({})

  // Copy Feedback
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Single / Bulk Import IOC State
  const [importingIocId, setImportingIocId] = useState<string | null>(null)
  const [importedIocs, setImportedIocs] = useState<Record<string, boolean>>({})
  const [isBulkIngesting, setIsBulkIngesting] = useState(false)
  const [ingestBanner, setIngestBanner] = useState<string | null>(null)

  useEffect(() => {
    loadNewsFeeds(false)
    loadLiveIOCs(false)
  }, [])

  const loadNewsFeeds = async (force: boolean) => {
    try {
      if (force) setNewsRefreshing(true)
      else setNewsLoading(true)
      setNewsError(null)

      const data = await api.getFeeds({
        source_id: selectedNewsSource !== 'all' ? selectedNewsSource : undefined,
        q: searchQuery.trim() || undefined,
        refresh: force,
      })
      setNewsItems(data.items as any)
      if (data.sources && data.sources.length > 0) {
        setNewsSources(data.sources)
      }
    } catch (err: any) {
      setNewsError(err.message || 'Failed to fetch live threat feeds.')
    } finally {
      setNewsLoading(false)
      setNewsRefreshing(false)
    }
  }

  const loadLiveIOCs = async (force: boolean) => {
    try {
      if (force) setIocRefreshing(true)
      else setIocLoading(true)
      setIocError(null)

      const data = await api.getLiveIOCFeeds({
        source_id: selectedIocSource !== 'all' ? selectedIocSource : undefined,
        ioc_type: selectedIocType !== 'all' ? selectedIocType : undefined,
        q: searchQuery.trim() || undefined,
        refresh: force,
      })
      setIocItems((data.items as any) || [])
      if (data.sources && data.sources.length > 0) {
        setIocSources(data.sources)
      }
    } catch (err: any) {
      setIocError(err.message || 'Failed to fetch live IOC feeds.')
    } finally {
      setIocLoading(false)
      setIocRefreshing(false)
    }
  }

  const handleRefresh = () => {
    if (activeTab === 'news') {
      loadNewsFeeds(true)
    } else {
      loadLiveIOCs(true)
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (activeTab === 'news') {
      loadNewsFeeds(false)
    } else {
      loadLiveIOCs(false)
    }
  }

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(text)
    setTimeout(() => setCopiedText(null), 2000)
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

  const handleImportSingleIOC = async (ioc: LiveFeedIOCItem) => {
    try {
      setImportingIocId(ioc.id)
      await api.importFeedIOC({
        ioc_type: ioc.ioc_type,
        value: ioc.value,
        description: `[${ioc.source_name}] ${ioc.threat_context}`,
      })
      setImportedIocs((prev) => ({ ...prev, [ioc.id]: true }))
    } catch (err: any) {
      alert(`Import failed: ${err.message}`)
    } finally {
      setImportingIocId(null)
    }
  }

  const handleBulkIngestLiveIOCs = async () => {
    try {
      setIsBulkIngesting(true)
      const res = await api.bulkImportLiveIOCs(100)
      setIngestBanner(res.message)
      setTimeout(() => setIngestBanner(null), 6000)
    } catch (err: any) {
      alert(`Bulk Ingestion failed: ${err.message}`)
    } finally {
      setIsBulkIngesting(false)
    }
  }

  // Filtered views
  const filteredNews = newsItems.filter((item) => {
    if (selectedNewsSource !== 'all' && item.source_id !== selectedNewsSource) return false
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

  const filteredIocs = iocItems.filter((ioc) => {
    if (selectedIocSource !== 'all' && ioc.source_id !== selectedIocSource) return false
    if (selectedIocType !== 'all' && ioc.ioc_type !== selectedIocType) return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        ioc.value.toLowerCase().includes(q) ||
        ioc.threat_context.toLowerCase().includes(q) ||
        ioc.source_name.toLowerCase().includes(q)
      )
    }
    return true
  })

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-gradient-to-br from-rose-500 to-amber-600 rounded-xl shadow-md shadow-rose-900/40 text-white">
              <Rss className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                {t('feedsTitle')}
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  LIVE THREAT INTEL
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeTab === 'news' ? t('feedsSubtitle') : t('liveIocFeedDesc')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Bulk Ingest Live IOC Button */}
          <button
            onClick={handleBulkIngestLiveIOCs}
            disabled={isBulkIngesting}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950 transition-all disabled:opacity-50"
            title="Ingest up to 100 fresh live IOCs into the internal SQLite repository"
          >
            <Zap className={`w-3.5 h-3.5 ${isBulkIngesting ? 'animate-spin' : 'text-amber-300'}`} />
            <span>{isBulkIngesting ? t('ingestingLiveIocs') : t('ingestLiveIocsBtn')}</span>
          </button>

          <button
            onClick={handleRefresh}
            disabled={newsRefreshing || iocRefreshing || newsLoading || iocLoading}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            title="Fetch latest updates from all feeds"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-cyan-400 ${
                newsRefreshing || iocRefreshing ? 'animate-spin' : ''
              }`}
            />
            <span>{t('refreshFeeds')}</span>
          </button>

          <LanguageToggle />
        </div>
      </div>

      {/* Bulk Ingest Notification */}
      {ingestBanner && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{ingestBanner}</span>
          </div>
          <button onClick={() => setIngestBanner(null)} className="text-emerald-400 hover:text-white text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Main Mode Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('iocs')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'iocs'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          <span>{t('tabLiveIocs')}</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700">
            {iocItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'news'
              ? 'border-cyan-500 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Rss className="w-4 h-4" />
          <span>{t('tabThreatNews')}</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {newsItems.length}
          </span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder={
                activeTab === 'news'
                  ? t('searchFeedsPlaceholder')
                  : 'Search live IOCs by IP, domain, URL, or threat description...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 transition-colors"
          >
            {t('searchCasePlaceholder') ? 'Search' : 'Search'}
          </button>
        </form>
      </div>

      {/* ===================== TAB 1: LIVE IOC STREAM ===================== */}
      {activeTab === 'iocs' && (
        <div className="space-y-4">
          {/* Source & Type Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">{t('sourceLabel')}:</span>
              <button
                onClick={() => setSelectedIocSource('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  selectedIocSource === 'all'
                    ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/40'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {t('allSources')} ({iocItems.length})
              </button>
              {iocSources.map((src) => {
                const count = iocItems.filter((i) => i.source_id === src.id).length
                const isSelected = selectedIocSource === src.id
                return (
                  <button
                    key={src.id}
                    onClick={() => setSelectedIocSource(src.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/40'
                        : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{src.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Type Filter Pills */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800">
              {['all', 'IPv4', 'URL'].map((tVal) => (
                <button
                  key={tVal}
                  onClick={() => setSelectedIocType(tVal)}
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                    selectedIocType === tVal
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tVal === 'all' ? t('allTypes') : tVal}
                </button>
              ))}
            </div>
          </div>

          {iocError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{iocError}</span>
            </div>
          )}

          {/* IOC Stream Table / List */}
          {iocLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <RefreshCw className="w-7 h-7 text-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400">Streaming real-time indicators from threat feeds...</p>
            </div>
          ) : filteredIocs.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">{t('noIocFound')}</p>
              <p className="text-xs text-slate-500">{t('noIocFoundDesc')}</p>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Live Indicator Value</th>
                      <th className="py-3 px-4">Threat Context & Attribution</th>
                      <th className="py-3 px-4">Source Feed</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredIocs.map((ioc) => {
                      const isImported = importedIocs[ioc.id]
                      const isImporting = importingIocId === ioc.id
                      const isCopied = copiedText === ioc.value

                      return (
                        <tr key={ioc.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <IOCTypeBadge iocType={ioc.ioc_type} />
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-100 max-w-xs md:max-w-md truncate">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate" title={ioc.value}>
                                {ioc.value}
                              </span>
                              <button
                                onClick={() => handleCopy(ioc.value)}
                                className="p-1 text-slate-500 hover:text-cyan-400 transition-colors rounded"
                                title="Copy indicator"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300 max-w-md">
                            <div className="text-xs">{ioc.threat_context}</div>
                            {ioc.first_seen && (
                              <div className="text-[10px] text-slate-500 mt-0.5 font-mono">
                                Seen: {ioc.first_seen}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border border-rose-500/30 bg-rose-500/10 text-rose-300">
                              {ioc.source_name}
                            </span>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-right">
                            {isImported ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{t('importedSuccess')}</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleImportSingleIOC(ioc)}
                                disabled={isImporting}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded bg-cyan-600 hover:bg-cyan-500 text-white transition-colors disabled:opacity-50"
                              >
                                <Download className="w-3 h-3" />
                                <span>{isImporting ? '...' : t('importIocBtn')}</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== TAB 2: THREAT NEWS FEEDS ===================== */}
      {activeTab === 'news' && (
        <div className="space-y-4">
          {/* Source Selector Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 mr-1">{t('sourceLabel')}:</span>
            <button
              onClick={() => setSelectedNewsSource('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedNewsSource === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {t('allSources')} ({newsItems.length})
            </button>
            {newsSources.map((source) => {
              const count = newsItems.filter((i) => i.source_id === source.id).length
              const isSelected = selectedNewsSource === source.id
              return (
                <button
                  key={source.id}
                  onClick={() => setSelectedNewsSource(source.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-900/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{source.name}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              )
            })}
          </div>

          {newsError && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{newsError}</span>
            </div>
          )}

          {/* News Cards Grid */}
          {newsLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
              <p className="text-xs text-slate-400">Fetching live cybersecurity threat advisories...</p>
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="p-12 text-center bg-slate-900/50 border border-slate-800/80 rounded-xl space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">{t('noFeedsFound')}</p>
              <p className="text-xs text-slate-500">{t('noFeedsFoundDesc')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNews.map((item) => {
                const isConverting = convertingId === item.id
                const convertedCaseId = convertedMap[item.id]

                return (
                  <div
                    key={item.id}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700/80 rounded-xl p-5 shadow-sm transition-all flex flex-col justify-between space-y-4 hover:shadow-cyan-950/20"
                  >
                    <div className="space-y-3">
                      {/* Top Meta */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-300">
                          {item.source_name}
                        </span>
                        <span className="text-slate-500 font-mono">{item.published_date}</span>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-bold text-white leading-snug line-clamp-2 hover:text-cyan-400 transition-colors">
                        <a href={item.link} target="_blank" rel="noopener noreferrer">
                          {item.title}
                        </a>
                      </h3>

                      {/* Summary */}
                      <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                        {item.summary}
                      </p>

                      {/* Tags & Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <CategoryBadge category={item.category} />
                        <SeverityBadge severity={item.severity} />
                      </div>

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
                                onClick={() => handleCopy(ioc.value)}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 hover:border-cyan-500 text-cyan-300 transition-colors"
                                title="Click to copy IOC"
                              >
                                <span className="text-slate-500 font-sans">{ioc.type}:</span>
                                <span>{ioc.value}</span>
                                {copiedText === ioc.value ? (
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
      )}
    </div>
  )
}
