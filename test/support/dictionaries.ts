import { builtInLocales, loadDictionary, type Locale, type Messages } from '../../src/i18n'

async function load(locale: Locale): Promise<readonly [Locale, Messages]> {
  const messages = await loadDictionary(locale)
  if (messages === undefined) throw new Error(`No built-in texts for ${locale}`)
  return [locale, messages]
}

export const dictionaries = Object.fromEntries(await Promise.all(builtInLocales.map(load))) as Readonly<
  Record<Locale, Messages>
> & { readonly en: Messages }
