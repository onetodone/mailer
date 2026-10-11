import type { CommonMessageKey, MessageKey, PluralForms } from '../i18n'
import type { Template } from './define'

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
