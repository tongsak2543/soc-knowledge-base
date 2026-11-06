import React from 'react'
import { Globe } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

export const LanguageToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { language, setLanguage } = useLanguage()

  return (
    <div className="flex items-center bg-slate-950/80 border border-slate-800 rounded-lg p-0.5 font-mono text-xs shadow-inner">
      {!compact && (
        <span className="px-2 py-1 text-slate-500 flex items-center gap-1">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
        </span>
      )}
      <button
        type="button"
        onClick={() => setLanguage('th')}
        className={`px-2.5 py-1 rounded font-semibold transition-all ${
          language === 'th'
            ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/50'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="เปลี่ยนเป็นภาษาไทย"
      >
        ไทย
      </button>
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`px-2.5 py-1 rounded font-semibold transition-all ${
          language === 'en'
            ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-900/50'
            : 'text-slate-400 hover:text-slate-200'
        }`}
        title="Switch to English"
      >
        ENG
      </button>
    </div>
  )
}

