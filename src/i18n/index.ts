import { html, type SafeHtml } from '../core/html'
import { be } from './be'
import { en } from './en'

/**
 * Forms of one message for each `Intl.PluralRules` category of the locale.
 * `{count}` is replaced by the number; `other` is used for categories without a form.
 */
export interface PluralForms {
  readonly zero?: string
  readonly one?: string
  readonly two?: string
  readonly few?: string
  readonly many?: string
  readonly other: string
}

/** Texts shared by every template, the blocks and the layout. */
export interface CommonMessages {
  /** Greeting with the recipient's name, such as "Hi {name},". */
  readonly greeting: string
  /** Greeting when the name is unknown, such as "Hi there,". */
  readonly greetingAnonymous: string
  /** Line above the fallback link under a button. */
  readonly linkFallback: string
  /** Lead-in before the support email address in the footer. */
  readonly footerSupport: string
  /** Text after the copyright notice in the footer. */
  readonly footerRights: string
  /** A number of minutes, in the grammatical form the `expires` sentences need. */
  readonly minutes: PluralForms
  /** A number of hours, in the grammatical form the `expires` sentences need. */
  readonly hours: PluralForms
  /** A number of days, in the grammatical form the `expires` sentences need. */
  readonly days: PluralForms
}

/** Texts of the `verifyEmail` template. */
export interface VerifyEmailMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "24 hours". */
  readonly expires: string
  /** Note for recipients who did not sign up. */
  readonly ignore: string
}

/** Texts of the `resetPassword` template. */
export interface ResetPasswordMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "30 minutes". */
  readonly expires: string
  /** Note for recipients who did not ask for a reset. */
  readonly ignore: string
}

/** Texts of the `passwordChanged` template. */
export interface PasswordChangedMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Every text of the built-in templates, the blocks and the layout for one locale. */
export interface Messages {
  readonly common: CommonMessages
  readonly verifyEmail: VerifyEmailMessages
  readonly resetPassword: ResetPasswordMessages
  readonly passwordChanged: PasswordChangedMessages
}

type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T] & string

/** Dotted path of a text in {@link Messages}, such as `'verifyEmail.subject'`. */
export type MessageKey = { [S in keyof Messages]: `${S}.${StringKeys<Messages[S]>}` }[keyof Messages]

export type DeepPartial<T> = {
  readonly [K in keyof T]?: (T[K] extends string ? T[K] : DeepPartial<T[K]>) | undefined
}

/** Texts of one locale; keys it leaves out fall back to English. */
export type LocaleMessages = DeepPartial<Messages>

export type MessageSource = Readonly<Record<string, LocaleMessages | undefined>> & { readonly en: Messages }

/**
 * Text overrides by locale, for the `messages` setting. Each locale's texts are
 * merged key by key over the built-in ones, and any locale falls back to
 * English for the keys it leaves out.
 */
export type MessagesOverrides = Readonly<Record<string, LocaleMessages | undefined>>

export const dictionaries = { en, be } satisfies MessageSource

/** A locale with built-in texts. */
export type Locale = keyof typeof dictionaries

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeTree(base: Readonly<Record<string, unknown>>, override: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(override)) return base
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === 'string') {
      result[key] = value
    } else if (isRecord(value)) {
      const current = base[key]
      result[key] = mergeTree(isRecord(current) ? current : {}, value)
    }
  }
  return result
}

export function mergeMessages(base: Messages, override: LocaleMessages | undefined): Messages {
  return mergeTree(base as unknown as Readonly<Record<string, unknown>>, override) as unknown as Messages
}

/**
 * Resolves the texts of every locale in `source` and `overrides`. English with
 * its overrides is the base, so a locale falls back to it key by key.
 */
export function buildMessages(
  overrides: MessagesOverrides = {},
  source: MessageSource = dictionaries,
): Readonly<Record<Locale, Messages> & Record<string, Messages | undefined>> {
  const base = mergeMessages(source.en, overrides.en)
  const result: Record<string, Messages> = { en: base }
  for (const locale of new Set([...Object.keys(source), ...Object.keys(overrides)])) {
    if (locale !== 'en') result[locale] = mergeMessages(mergeMessages(base, source[locale]), overrides[locale])
  }
  return result as Record<Locale, Messages> & Record<string, Messages | undefined>
}

/** Values for `{name}` placeholders in plain-text messages. */
export type MessageParams = Readonly<Record<string, string | number>>

/** Values for `{name}` placeholders in HTML messages; {@link SafeHtml} values are inserted as markup. */
export type HtmlMessageParams = Readonly<Record<string, string | number | SafeHtml>>

/**
 * Looks up a text for the current locale and fills its `{name}` placeholders.
 * `{companyName}` is always available; placeholders without a value stay as they are.
 *
 * @example
 * t('common.greeting', { name: props.userName })
 * t.html('passwordChanged.notYouEmail', { email: html`<a href="mailto:${address}">${address}</a>` })
 */
export interface Translate {
  /** Returns plain text. Blocks escape it, so it is safe to pass to `ui.paragraph` and the like. */
  (key: MessageKey, params?: MessageParams): string
  /** Returns markup: the text and string params are escaped, {@link SafeHtml} params are inserted as-is. */
  readonly html: (key: MessageKey, params?: HtmlMessageParams) => SafeHtml
}

/** Locale-aware formatting for template texts. */
export interface Formatters {
  /**
   * A duration from a number of minutes, in whole days, hours or minutes, such as
   * "30 minutes", "24 hours" or "3 days". Uses the `common.minutes`, `common.hours`
   * and `common.days` plural forms.
   */
  readonly duration: (minutes: number) => string
  /**
   * A date and time with the time zone name, such as "May 4, 2026 at 9:30 AM UTC".
   *
   * @param timeZone - IANA time zone. Default: the mailer's time zone, UTC unless configured.
   */
  readonly dateTime: (date: Date, timeZone?: string) => string
}

export interface I18nOptions {
  readonly locale: string
  readonly messages: Messages
  readonly companyName: string
  readonly timeZone?: string | undefined
}

const placeholder = /\{(\w+)\}/g

function lookup(messages: Messages, key: MessageKey): string {
  const dot = key.indexOf('.')
  const section: unknown = messages[key.slice(0, dot) as keyof Messages]
  const value = isRecord(section) ? section[key.slice(dot + 1)] : undefined
  return typeof value === 'string' ? value : key
}

function interpolate(message: string, params: MessageParams): string {
  return message.replace(placeholder, (match, name: string) => {
    const value = Object.hasOwn(params, name) ? params[name] : undefined
    return value === undefined ? match : String(value)
  })
}

function interpolateHtml(message: string, params: HtmlMessageParams): SafeHtml {
  const parts = message.split(/\{(\w+)\}/)
  return html`${parts.map((part, index) => {
    if (index % 2 === 0) return part
    const value = Object.hasOwn(params, part) ? params[part] : undefined
    return value ?? `{${part}}`
  })}`
}

export function createI18n({ locale, messages, companyName, timeZone = 'UTC' }: I18nOptions): {
  t: Translate
  format: Formatters
} {
  const t: Translate = Object.assign(
    (key: MessageKey, params: MessageParams = {}) => interpolate(lookup(messages, key), { companyName, ...params }),
    {
      html: (key: MessageKey, params: HtmlMessageParams = {}) =>
        interpolateHtml(lookup(messages, key), { companyName, ...params }),
    },
  )

  const pluralRules = new Intl.PluralRules(locale)
  const numberFormat = new Intl.NumberFormat(locale)
  const { minutes, hours, days } = messages.common

  const format: Formatters = {
    duration: (total) => {
      const [count, forms]: [number, PluralForms] =
        total >= 2880 && total % 1440 === 0
          ? [total / 1440, days]
          : total >= 60 && total % 60 === 0
            ? [total / 60, hours]
            : [total, minutes]
      return interpolate(forms[pluralRules.select(count)] ?? forms.other, { count: numberFormat.format(count) })
    },
    dateTime: (date, zone = timeZone) =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: zone,
        timeZoneName: 'short',
      }).format(date),
  }

  return { t, format }
}
