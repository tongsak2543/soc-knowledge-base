import React, { useState } from 'react'
import { Sidebar, type TabType } from './components/Sidebar'
import { CasePage } from './pages/CasePage'
import { IOCPage } from './pages/IOCPage'
import { DashboardPage } from './pages/DashboardPage'
import { LanguageProvider } from './context/LanguageContext'

const AppContent: React.FC = () => {
  // Case Knowledge Base is the primary landing page as requested
  const [activeTab, setActiveTab] = useState<TabType>('cases')
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)
  const [targetIocId, setTargetIocId] = useState<number | null>(null)

  const triggerGlobalRefresh = () => {
    setRefreshTrigger((prev) => prev + 1)
  }

  const handleNavigateToIOC = (iocId?: number) => {
    if (iocId) {
      setTargetIocId(iocId)
    } else {
      setTargetIocId(null)
    }
    setActiveTab('iocs')
  }

  const handleNavigateToCases = (_caseId?: number) => {
    setActiveTab('cases')
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onDataRefreshNeeded={triggerGlobalRefresh}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-950 to-[#080d1a]">
        {activeTab === 'cases' && (
          <CasePage
            onNavigateToIOC={handleNavigateToIOC}
            refreshTrigger={refreshTrigger}
          />
        )}

        {activeTab === 'iocs' && (
          <IOCPage
            onNavigateToCase={handleNavigateToCases}
            refreshTrigger={refreshTrigger}
            targetIocId={targetIocId}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardPage
            onNavigateToCases={handleNavigateToCases}
            onNavigateToIOC={handleNavigateToIOC}
            refreshTrigger={refreshTrigger}
          />
        )}
      </main>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  )
}

export default App
