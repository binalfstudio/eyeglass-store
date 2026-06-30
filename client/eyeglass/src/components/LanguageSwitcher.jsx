import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import './LanguageSwitcher.css'

const LanguageSwitcher = ({ compact = false }) => {
  const { i18n, t } = useTranslation()
  const current = i18n.language?.startsWith('am') ? 'am' : 'en'

  const setLanguage = (lng) => {
    if (lng !== current) {
      i18n.changeLanguage(lng)
    }
  }

  return (
    <div
      className={`lang-switcher ${compact ? 'lang-switcher-compact' : ''}`}
      role="group"
      aria-label={t('common.language')}
    >
      {!compact && <Languages size={16} className="lang-switcher-icon" aria-hidden="true" />}
      <motion.button
        type="button"
        className={`lang-btn ${current === 'am' ? 'lang-btn-active' : ''}`}
        onClick={() => setLanguage('am')}
        whileTap={{ scale: 0.95 }}
        aria-pressed={current === 'am'}
      >
        አማ
      </motion.button>
      <motion.button
        type="button"
        className={`lang-btn ${current === 'en' ? 'lang-btn-active' : ''}`}
        onClick={() => setLanguage('en')}
        whileTap={{ scale: 0.95 }}
        aria-pressed={current === 'en'}
      >
        EN
      </motion.button>
    </div>
  )
}

export default LanguageSwitcher
