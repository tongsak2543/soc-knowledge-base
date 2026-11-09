import React, { useState } from 'react'
import {
  ShieldAlert,
  Briefcase,
  Crosshair,
  LayoutDashboard,
  Database,
  Sparkles,
  RefreshCw,
  ExternalLink,
  Rss,
} from 'lucide-react'
import { api } from '../services/api'
import { useLanguage } from '../context/LanguageContext'
import { LanguageToggle } from './LanguageToggle'

export type TabType = 'cases' | 'feeds' | 'iocs' | 'dashboard'

interface SidebarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  onDataRefreshNeeded: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onDataRefreshNeeded,
}) => {
  const { t } = useLanguage()
  const [seeding, setSeeding] = useState(false)
  const [seedMessage, setSeedMessage] = useState<string | null>(null)

  const handleSeedDemoData = async () => {
    try {
      setSeeding(true)
      setSeedMessage(null)
      const res = await api.seedDemoData(true)
      setSeedMessage(res.message)
      onDataRefreshNeeded()
      setTimeout(() => setSeedMessage(null), 5000)
    } catch (err: any) {
      setSeedMessage(`Error: ${err.message || 'Seeding failed'}`)
    } finally {
      setSeeding(false)
    }
  }

  const handleResetDb = async () => {
    if (!window.confirm(t('resetDbConfirm'))) {
      return
    }
    try {
      setSeeding(true)
      await api.resetDatabase()
      setSeedMessage('Database cleared.')
      onDataRefreshNeeded()
      setTimeout(() => setSeedMessage(null), 4000)
    } catch (err: any) {
      setSeedMessage(`Error: ${err.message || 'Reset failed'}`)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 backdrop-blur-md">
      <div>
        {/* SOC TIP Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg shadow-md shadow-cyan-900/40 text-white">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-wide text-white flex items-center gap-1.5">
                {t('portalTitle')}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                  v2.0
                </span>
              </h1>
              <p className="text-xs text-slate-400 font-mono">{t('portalSubtitle')}</p>
            </div>
          </div>
        </div>

        {/* Language Switcher Bar */}
        <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-medium">{t('langToggle')}</span>
          <LanguageToggle compact />
        </div>

        {/* Database indicator */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <Database className="w-3.5 h-3.5 text-slate-400" />
            {t('activeDb')}
          </span>
          <span className="text-emerald-400 text-[11px]">{t('statusActive')}</span>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {t('menuSection')}
          </div>

          <button
            onClick={() => setActiveTab('cases')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'cases'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            <span>{t('navCases')}</span>
          </button>

          <button
            onClick={() => setActiveTab('feeds')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'feeds'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Rss className="w-4 h-4 text-rose-400" />
            <span>{t('navFeeds')}</span>
          </button>

          <button
            onClick={() => setActiveTab('iocs')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'iocs'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>{t('navIoc')}</span>
          </button>

          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>{t('navDashboard')}</span>
          </button>
        </nav>
      </div>

      {/* Footer Controls & Seed Actions */}
      <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/20">
        {seedMessage && (
          <div className="p-2 text-xs font-mono rounded bg-slate-800/90 text-cyan-300 border border-slate-700">
            {seedMessage}
          </div>
        )}

        <div className="space-y-1.5">
          <button
            onClick={handleSeedDemoData}
            disabled={seeding}
            className="w-full flex items-center justify-center space-x-2 px-3 py-2 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition-colors disabled:opacity-50"
            title="Populates SQLite with labeled demonstration SOC cases & IOCs"
          >
            {seeding ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{t('loadDemoData')}</span>
          </button>

          <button
            onClick={handleResetDb}
            disabled={seeding}
            className="w-full flex items-center justify-center space-x-1.5 px-3 py-1.5 text-[11px] font-mono rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 transition-colors disabled:opacity-50"
          >
            <span>{t('resetDb')}</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
          >
            <span>{t('swaggerApi')}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="font-mono text-slate-500">FastAPI</span>
        </div>
      </div>
    </aside>
  )
}
