import { z } from 'zod'

import type { MessageSource } from '../i18n'
import { localeRecordError, localeTag, textOrPluralForms } from '../i18n/schema'
import { isRecord, objectError } from '../validators'
import type { TemplateRegistry } from './define'
import type { TemplateTexts } from './messages'

/** A template with its own texts is a dictionary section, so its name must not clash with `common` or split at a dot. */
export function sectionNameProblem(name: string): string | undefined {
  if (name === 'common') return 'must not be "common" in a template with messages'
  if (name.includes('.')) return 'must not contain "." in a template with messages'
  return undefined
}

const localeTexts = z.record(z.string(), textOrPluralForms, { error: objectError })

export const templateMessagesSchema = z
  .record(localeTag, localeTexts.optional(), { error: localeRecordError })
  .superRefine((messages, ctx) => {
    const { en } = messages
    if (en === undefined) {
      ctx.addIssue({ code: 'custom', path: ['en'], message: 'is required', input: en })
      return
    }
    for (const [key, value] of Object.entries(en)) {
      if (value === undefined) ctx.addIssue({ code: 'custom', path: ['en', key], message: 'is required', input: value })
      else if (isRecord(value) && value.other === undefined) {
        ctx.addIssue({ code: 'custom', path: ['en', key, 'other'], message: 'is required', input: undefined })
      }
    }
    for (const [locale, texts] of Object.entries(messages)) {
      if (locale === 'en' || texts === undefined) continue
      const keys = Object.keys(texts).filter((key) => !Object.hasOwn(en, key))
      if (keys.length > 0) {
        ctx.addIssue({
          code: 'custom',
          path: [locale],
          message: objectError({ code: 'unrecognized_keys', keys }),
          input: texts,
        })
      }
      for (const [key, value] of Object.entries(texts)) {
        const english = en[key]
        if (!(typeof english === 'string' && isRecord(value)) && !(isRecord(english) && typeof value === 'string')) {
          continue
        }
        ctx.addIssue({
          code: 'custom',
          path: [locale, key],
          message: typeof english === 'string' ? 'must be a string, as in en' : 'must be plural forms, as in en',
          input: value,
        })
      }
    }
  })

/**
 * English sections of the templates whose texts are valid, read from raw
 * settings, so that `messages` can be checked against them in the same pass.
 */
export function templateSections(templates: unknown): Readonly<Record<string, TemplateTexts>> {
  if (!isRecord(templates)) return {}
  const sections: Record<string, TemplateTexts> = {}
  for (const [name, template] of Object.entries(templates)) {
    if (!isRecord(template) || template.messages === undefined || sectionNameProblem(name) !== undefined) continue
    const result = templateMessagesSchema.safeParse(template.messages)
    const en = result.data?.en
    if (en !== undefined) sections[name] = en as TemplateTexts
  }
  return sections
}

/**
 * Adds the texts of custom templates to the dictionaries. A template's texts
 * replace the section of the same name in every locale, so a locale it leaves
 * out falls back to its English texts rather than to a built-in section.
 */
export function withTemplateMessages(source: MessageSource, templates: TemplateRegistry = {}): MessageSource {
  const own = Object.entries(templates).flatMap(([name, { messages }]) =>
    messages === undefined ? [] : [[name, messages] as const],
  )
  if (own.length === 0) return source
  const locales = new Set([...Object.keys(source), ...own.flatMap(([, messages]) => Object.keys(messages))])
  const result: Record<string, unknown> = {}
  for (const locale of locales) {
    result[locale] = {
      ...source[locale],
      ...Object.fromEntries(own.map(([name, messages]) => [name, messages[locale]])),
    }
  }
  return result as MessageSource
}
