import { translations } from '../i18n/translations'
import { useUIStore } from '../stores/uiStore'

export const useTranslation = () => {
  const { language } = useUIStore()

  const t = (key: string) => {
    const keys = key.split('.')
    let current: any = translations[language as keyof typeof translations]

    for (const k of keys) {
      if (current[k] === undefined) {
        // Fallback to French if key missing
        let fallback: any = translations['fr']
        for (const fk of keys) {
          if (fallback[fk] === undefined) return key
          fallback = fallback[fk]
        }
        return fallback
      }
      current = current[k]
    }

    return current
  }

  return { t, language }
}
