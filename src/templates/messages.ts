import { z } from 'zod'

import type { CommonMessageKey, MessageKey, MessageSource } from '../i18n'
import { localeRecordError, localeTag, text } from '../i18n/schema'
import { isRecord, objectError } from '../validators'
import type { Template, TemplateRegistry } from './define'

/**
 * Texts of a custom template for one locale: each text key maps to a text
 * with `{name}` placeholders.
 *
 * Text values may gain more forms, such as plural forms, in any release. Use
 * this type to check texts with `satisfies`, not to read values through it.
 */
export type TemplateTexts = Readonly<Record<string, string>>

/**
 * Texts of a custom template by locale, for the `messages` option of
 * `defineTemplate`. `en` is required and lists every text key. Other locales,
 * built-in or keys of the mailer's `messages`, may leave keys out; those fall
 * back to English.
 *
 * Text values may gain more forms, such as plural forms, in any release. Use
 * this type to check texts with `satisfies`, not to read values through it.
 *
 * @example
 * const messages = {
 *   en: { subject: 'Invoice #{number}', intro: 'Your invoice is attached.' },
 *   be: { subject: 'Рахунак №{number}', intro: 'Рахунак у ўкладанні.' },
 * } satisfies TemplateMessages
 */
export type TemplateMessages<Texts extends TemplateTexts = TemplateTexts> = { readonly en: Texts } & Readonly<
  Record<string, NoInfer<{ readonly [K in keyof Texts]?: string | undefined }> | undefined>
>

/**
 * Text keys `t` accepts in a template: every built-in key in a template
 * without its own texts, otherwise the template's own keys under its name
 * plus the `common` keys.
 */
export type TemplateMessageKey<Name extends string, Texts extends TemplateTexts | undefined> = [Texts] extends [
  TemplateTexts,
]
  ? string extends keyof Texts
    ? CommonMessageKey
    : `${Name}.${keyof Texts & string}` | CommonMessageKey
  : MessageKey

type OwnTexts<T> =
  T extends Template<string, unknown, unknown, infer Texts>
    ? [Texts] extends [TemplateTexts]
      ? string extends keyof Texts
        ? never
        : Texts
      : never
    : never

/** Dictionary sections of the custom templates that have their own texts, by template name. */
export type TemplateSections<Templates> = {
  readonly [K in keyof Templates as [OwnTexts<Templates[K]>] extends [never] ? never : K]: OwnTexts<Templates[K]>
}

/** A template with its own texts is a dictionary section, so its name must not clash with `common` or split at a dot. */
export function sectionNameProblem(name: string): string | undefined {
  if (name === 'common') return 'must not be "common" in a template with messages'
  if (name.includes('.')) return 'must not contain "." in a template with messages'
  return undefined
}

const localeTexts = z.record(z.string(), text.optional(), { error: objectError })

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
