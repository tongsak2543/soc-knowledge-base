import React from 'react'
import {
  ShieldAlert,
  Briefcase,
  Crosshair,
  LayoutDashboard,
  ExternalLink,
  Shield,
  Terminal,
  Database,
} from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'
import { LanguageToggle } from './LanguageToggle'

export type TabType = 'iocs' | 'wazuh' | 'api-test' | 'cases' | 'dashboard'

interface SidebarProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
  onDataRefreshNeeded: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const { t } = useLanguage()

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

        {/* Navigation Menu - IOC Focused */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            {t('menuSection')}
          </div>

          {/* 1. IOC Repository - Primary */}
          <button
            onClick={() => setActiveTab('iocs')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'iocs'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="w-4 h-4 text-cyan-400" />
            <span>{t('navIoc')}</span>
          </button>

          {/* 2. Wazuh CTI Integration */}
          <button
            onClick={() => setActiveTab('wazuh')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'wazuh'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>{t('navWazuh')}</span>
          </button>

          {/* 3. API Test Console */}
          <button
            onClick={() => setActiveTab('api-test')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'api-test'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Terminal className="w-4 h-4 text-purple-400" />
            <span>{t('navApiTest')}</span>
          </button>

          {/* 3. Case Knowledge Base */}
          <button
            onClick={() => setActiveTab('cases')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'cases'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Briefcase className="w-4 h-4 text-blue-400" />
            <span>{t('navCases')}</span>
          </button>

          {/* 4. SOC Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dashboard'
                ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-purple-400" />
            <span>{t('navDashboard')}</span>
          </button>
        </nav>
      </div>

      {/* Footer Controls & System Status */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/20">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
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
