import React, { useState, Component, type ReactNode } from 'react'
import { Sidebar, type TabType } from './components/Sidebar'
import { IOCPage } from './pages/IOCPage'
import { WazuhPage } from './pages/WazuhPage'
import { ApiTestPage } from './pages/ApiTestPage'
import { CasePage } from './pages/CasePage'
import { DashboardPage } from './pages/DashboardPage'
import { LanguageProvider } from './context/LanguageContext'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled UI error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-slate-100 font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold font-mono">
              !
            </div>
            <h2 className="text-lg font-bold text-white">Something went wrong</h2>
            <p className="text-xs text-slate-400 font-mono bg-slate-950 p-3 rounded-lg border border-slate-800 text-left overflow-x-auto">
              {this.state.error?.message || 'Unknown runtime error occurred.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

const AppContent: React.FC = () => {
  // IOC Repository is the primary landing page as requested ("ioc only pls")
  const [activeTab, setActiveTab] = useState<TabType>('iocs')
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
        {activeTab === 'iocs' && (
          <IOCPage
            onNavigateToCase={handleNavigateToCases}
            refreshTrigger={refreshTrigger}
            targetIocId={targetIocId}
          />
        )}

        {activeTab === 'wazuh' && (
          <WazuhPage />
        )}

        {activeTab === 'api-test' && (
          <ApiTestPage />
        )}

        {activeTab === 'cases' && (
          <CasePage
            onNavigateToIOC={handleNavigateToIOC}
            refreshTrigger={refreshTrigger}
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
    <ErrorBoundary>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </ErrorBoundary>
  )
}

export default App
