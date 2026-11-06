import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Language } from '../i18n/translations'

type TranslationKeys = keyof typeof translations.en

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: TranslationKeys) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('soc_tip_lang')
    if (saved === 'th' || saved === 'en') return saved
    return 'th' // Default to Thai as requested
  })

  useEffect(() => {
    localStorage.setItem('soc_tip_lang', language)
  }, [language])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  const t = (key: TranslationKeys): string => {
    return translations[language][key] || translations.en[key] || (key as string)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
