import { z } from 'zod'

import type { CommonMessageKey, MessageKey, MessageSource, PluralForms } from '../i18n'
import { localeRecordError, localeTag, textOrPluralForms } from '../i18n/schema'
import { isRecord, objectError } from '../validators'
import type { Template, TemplateRegistry } from './define'

/**
 * Texts of a custom template for one locale: each text key maps to a text
 * with `{name}` placeholders, or to plural forms picked by `count`.
 *
 * Text values may gain more forms in any release. Use this type to check
 * texts with `satisfies`, not to read values through it.
 */
export type TemplateTexts = Readonly<Record<string, string | PluralForms>>

// Distributive, so that a key typed `string | PluralForms` accepts either form.
type LocaleText<T> = T extends string ? string : Partial<PluralForms>

/**
 * Texts of a custom template by locale, for the `messages` option of
 * `defineTemplate`. `en` is required and lists every text key. Other locales,
 * built-in or keys of the mailer's `messages`, may leave keys out; those fall
 * back to English.
 *
 * A text with plural forms has one text per `Intl.PluralRules` category of the
 * locale (`zero`, `one`, `two`, `few`, `many`, `other`); `other` is required in
 * `en`. Other locales keep the English form of each key: a string for a
 * string, plural forms for plural forms, with any categories they need.
 *
 * Text values may gain more forms in any release. Use this type to check
 * texts with `satisfies`, not to read values through it.
 *
 * @example
 * const messages = {
 *   en: {
 *     subject: 'Invoice #{number}',
 *     items: { one: '{count} item', other: '{count} items' },
 *   },
 *   be: {
 *     subject: 'Рахунак №{number}',
 *     items: { one: '{count} пазіцыя', few: '{count} пазіцыі', many: '{count} пазіцый', other: '{count} пазіцыі' },
 *   },
 * } satisfies TemplateMessages
 */
export type TemplateMessages<Texts extends TemplateTexts = TemplateTexts> = { readonly en: Texts } & Readonly<
  Record<string, NoInfer<{ readonly [K in keyof Texts]?: LocaleText<Texts[K]> | undefined }> | undefined>
>

type TextKeys<Texts> = { [K in keyof Texts]: Texts[K] extends string ? K : never }[keyof Texts] & string

type PluralKeys<Texts> = { [K in keyof Texts]: Texts[K] extends string ? never : K }[keyof Texts] & string

/**
 * Text keys `t` accepts in a template: every built-in key in a template
 * without its own texts, otherwise the template's own text keys under its
 * name plus the `common` keys.
 */
export type TemplateMessageKey<Name extends string, Texts extends TemplateTexts | undefined> = [Texts] extends [
  TemplateTexts,
]
  ? string extends keyof Texts
    ? CommonMessageKey
    : `${Name}.${TextKeys<Texts>}` | CommonMessageKey
  : MessageKey

/** Keys of a template's own texts with plural forms, under its name; `t` requires `count` for them. */
export type TemplatePluralKey<Name extends string, Texts extends TemplateTexts | undefined> = [Texts] extends [
  TemplateTexts,
]
  ? string extends keyof Texts
    ? never
    : `${Name}.${PluralKeys<Texts>}`
  : never

type OwnTexts<T> =
  T extends Template<string, unknown, unknown, infer Texts>
    ? [Texts] extends [TemplateTexts]
      ? string extends keyof Texts
        ? never
        : Texts
      : never
    : never

// Plural forms in full, so that overrides may add categories the English texts leave out.
type SectionTexts<Texts> = { readonly [K in keyof Texts]: Texts[K] extends string ? Texts[K] : PluralForms }

/** Dictionary sections of the custom templates that have their own texts, by template name. */
export type TemplateSections<Templates> = {
  readonly [K in keyof Templates as [OwnTexts<Templates[K]>] extends [never] ? never : K]: SectionTexts<
    OwnTexts<Templates[K]>
  >
}

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
