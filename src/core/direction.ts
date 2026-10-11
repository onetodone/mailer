/** Text direction of a locale: `ltr` (left to right) or `rtl` (right to left). */
export type TextDirection = 'ltr' | 'rtl'

// ISO 15924 codes of the scripts written right to left.
const rtlScripts = new Set(['Adlm', 'Arab', 'Hebr', 'Mand', 'Mend', 'Nkoo', 'Rohg', 'Samr', 'Syrc', 'Thaa', 'Yezi'])

// Intl.Locale#getTextInfo is missing or named textInfo in some runtimes, so the
// direction comes from the likely script of the locale instead.
export function textDirection(locale: string): TextDirection {
  try {
    const { script } = new Intl.Locale(locale).maximize()
    return script !== undefined && rtlScripts.has(script) ? 'rtl' : 'ltr'
  } catch {
    return 'ltr'
  }
}
