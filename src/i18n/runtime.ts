import type { Locales, TranslationFunctions } from './i18n-types.js'
import { baseLocale, isLocale, i18nObject } from './i18n-util.js'
import { loadLocale } from './i18n-util.sync.js'

export function getLL(locale?: string): { locale: Locales; LL: TranslationFunctions } {
	const l = locale && isLocale(locale) ? locale : baseLocale
	loadLocale(l)
	return { locale: l, LL: i18nObject(l) }
}

