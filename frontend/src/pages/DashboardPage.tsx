import React, { useState, useEffect } from 'react'
import {
  Briefcase,
  Crosshair,
  TrendingUp,
  PieChart,
  BarChart3,
  RefreshCw,
  ChevronRight,
  Shield,
  Clock,
} from 'lucide-react'
import type { DashboardStats } from '../types'
import { SeverityBadge, StatusBadge, IOCTypeBadge } from '../components/Badges'
import { LanguageToggle } from '../components/LanguageToggle'
import { useLanguage } from '../context/LanguageContext'
import { api } from '../services/api'

interface DashboardPageProps {
  onNavigateToCases: (caseId?: number) => void
  onNavigateToIOC: (iocId?: number) => void
  refreshTrigger: number
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigateToCases,
  onNavigateToIOC,
  refreshTrigger,
}) => {
  const { t } = useLanguage()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadStats()
  }, [refreshTrigger])

  const loadStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getDashboardStats()
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard intelligence statistics.')
    } finally {
      setLoading(false)
    }
  }

  const calcPercent = (val: number, total: number) => {
    if (!total || total === 0) return 0
    return Math.round((val / total) * 100)
  }

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            {t('dashboardTitle')}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('dashboardSubtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <LanguageToggle />
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
            <span>{t('refreshMetrics')}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* Primary KPI Stats: Total Cases & Total IOCs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div
          onClick={() => onNavigateToCases()}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-cyan-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              {t('totalCasesCard')}
            </span>
            <div className="p-2.5 bg-cyan-950/70 rounded-lg text-cyan-400 border border-cyan-800/40 shadow-sm">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {stats?.total_cases ?? 0}
            </span>
            <span className="text-[11px] text-cyan-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              {t('browseCases')} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Total IOCs */}
        <div
          onClick={() => onNavigateToIOC()}
          className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-cyan-500/40 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">
              {t('totalIocsCard')}
            </span>
            <div className="p-2.5 bg-blue-950/70 rounded-lg text-blue-400 border border-blue-800/40 shadow-sm">
              <Crosshair className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-white tracking-tight font-mono">
              {stats?.total_iocs ?? 0}
            </span>
            <span className="text-[11px] text-blue-400 flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
              {t('manageIocs')} <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Resolved Cases Rate */}
        <div className="bg-slate-900/90 border border-emerald-500/20 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider font-mono">
              Resolved Cases
            </span>
            <div className="p-2.5 bg-emerald-950/60 rounded-lg text-emerald-400 border border-emerald-800/40">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-emerald-300 tracking-tight font-mono">
              {stats?.cases_by_status?.['Resolved'] ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">
              {calcPercent(stats?.cases_by_status?.['Resolved'] || 0, stats?.total_cases || 0)}% {t('ofTotal')}
            </span>
          </div>
        </div>

        {/* Active Open / In Progress Cases */}
        <div className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
              Active Investigations
            </span>
            <div className="p-2.5 bg-amber-950/60 rounded-lg text-amber-400 border border-amber-800/40">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-amber-300 tracking-tight font-mono">
              {(stats?.cases_by_status?.['Open'] || 0) + (stats?.cases_by_status?.['In Progress'] || 0)}
            </span>
            <span className="text-[11px] text-slate-400">
              Under SOC review
            </span>
          </div>
        </div>
      </div>

      {/* Category Breakdown (แสดงสถิติตาม Category แบบเรียบง่าย) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Category */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">{t('casesByCategory')}</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">{t('distribution')}</span>
          </div>

          <div className="space-y-3 pt-2 max-h-72 overflow-y-auto pr-1">
            {stats &&
              Object.entries(stats.cases_by_category)
                .filter(([_, count]) => count > 0)
                .map(([cat, count]) => {
                  const percent = calcPercent(count, stats.total_cases)
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-200">{cat}</span>
                        <span className="text-slate-400">
                          {count} <span className="text-slate-600">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-cyan-500 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            {stats && Object.values(stats.cases_by_category).every((v) => v === 0) && (
              <div className="text-xs text-slate-500 font-mono text-center py-4">
                No category data available.
              </div>
            )}
          </div>
        </div>

        {/* IOCs by Type */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-white">{t('iocsByType')}</h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">{t('distribution')}</span>
          </div>

          <div className="space-y-3 pt-2 max-h-72 overflow-y-auto pr-1">
            {stats &&
              Object.entries(stats.iocs_by_type)
                .filter(([_, count]) => count > 0)
                .map(([iocType, count]) => {
                  const percent = calcPercent(count, stats.total_iocs)
                  return (
                    <div key={iocType} className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-200">{iocType}</span>
                        <span className="text-slate-400">
                          {count} <span className="text-slate-600">({percent}%)</span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="h-full bg-teal-500 transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            {stats && Object.values(stats.iocs_by_type).every((v) => v === 0) && (
              <div className="text-xs text-slate-500 font-mono text-center py-4">
                No IOC type data available.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two Column Recents Grid: Recent Cases & Recent IOCs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Cases (แสดง Case ที่เพิ่มล่าสุด) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">{t('recentCasesTitle')}</h2>
            </div>
            <button
              onClick={() => onNavigateToCases()}
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{t('viewAll')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.recent_cases.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-lg">
              {t('noRecentCases')}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {stats?.recent_cases.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateToCases(item.id)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800">
                        {item.case_id}
                      </span>
                      <StatusBadge status={item.status} size="sm" />
                      <SeverityBadge severity={item.severity} size="sm" />
                    </div>
                    <h3 className="text-xs font-medium text-white group-hover:text-cyan-300 transition-colors truncate">
                      {item.title}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Crosshair className="w-3 h-3 text-cyan-400" />
                      {item.ioc_count}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent IOCs (แสดง IOC ที่เพิ่มล่าสุด) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-teal-400" />
              <h2 className="text-sm font-semibold text-white">{t('recentIocsTitle')}</h2>
            </div>
            <button
              onClick={() => onNavigateToIOC()}
              className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>{t('viewAll')}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats?.recent_iocs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-lg">
              {t('noRecentIocs')}
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {stats?.recent_iocs.map((ioc) => (
                <div
                  key={ioc.id}
                  onClick={() => onNavigateToIOC(ioc.id)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-slate-800/30 px-2 rounded-lg cursor-pointer transition-colors group"
                >
                  <div className="space-y-1 truncate">
                    <div className="flex items-center gap-2">
                      <IOCTypeBadge iocType={ioc.ioc_type} />
                      <span className="text-xs font-mono text-slate-200 group-hover:text-cyan-300 truncate">
                        {ioc.value}
                      </span>
                    </div>
                    {ioc.description && (
                      <p className="text-[11px] text-slate-500 truncate">{ioc.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px] text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-cyan-400">
                      {ioc.case_count} {t('caseUnit')}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
