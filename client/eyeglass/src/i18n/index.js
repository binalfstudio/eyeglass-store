import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import am from './locales/am.json'
import en from './locales/en.json'

const STORAGE_KEY = 'zvisionary-lang'

const getSavedLanguage = () => {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

const applyDocumentLanguage = (lng) => {
  document.documentElement.lang = lng === 'am' ? 'am' : 'en'
  document.title = lng === 'am' ? 'ዜድ መነጸር' : 'Z Visionary'
}

i18n.use(initReactI18next).init({
  resources: {
    am: { translation: am },
    en: { translation: en },
  },
  lng: getSavedLanguage() || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

applyDocumentLanguage(i18n.language)

i18n.on('languageChanged', (lng) => {
  applyDocumentLanguage(lng)
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // ignore storage failures
  }
})

export default i18n
