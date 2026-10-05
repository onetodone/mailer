import { html, type SafeHtml } from '../core/html'
import type { BuiltInTemplates } from '../templates/built-in'
import type { TemplateSections } from '../templates/messages'
import { beLatn } from './be-Latn'
import { be } from './be'
import { cs } from './cs'
import { de } from './de'
import { en } from './en'
import { et } from './et'
import { fr } from './fr'
import { it } from './it'
import { ja } from './ja'
import { ka } from './ka'
import { lt } from './lt'
import { lv } from './lv'
import { pl } from './pl'
import { ro } from './ro'
import { th } from './th'
import { uk } from './uk'

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

/** Texts of the `verifyEmailChange` template. */
export interface VerifyEmailChangeMessages {
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
  /** Note for recipients who did not ask to change their email. */
  readonly ignore: string
}

/** Texts of the `emailChangeRequested` template. */
export interface EmailChangeRequestedMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting, with `{newEmail}`. */
  readonly intro: string
  /** Time of the request, with `{date}`. */
  readonly requestedAt: string
  /** IP address of the request, with `{ip}`. */
  readonly ip: string
  /** What the account owner who made the request does next, with `{newEmail}`. */
  readonly ifYou: string
  /** Call to action when the owner did not make the request, followed by the cancel button. */
  readonly notYouCancel: string
  /** Cancel button label. */
  readonly cancelButton: string
  /** Call to action without a cancel URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a cancel or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `emailChanged` template. */
export interface EmailChangedMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** The new address, with `{newEmail}`. */
  readonly newEmail: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Where emails about the account go after the change. */
  readonly newAddress: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `otpCode` template. */
export interface OtpCodeMessages {
  /** The built-in texts leave out the code, because subjects show in notifications and on lock screens; `{code}` is available. */
  readonly subject: string
  /** Inbox preview text. The built-in texts leave out the code, as in `subject`; `{code}` is available. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph above the code. */
  readonly intro: string
  /** Expiry note, with `{duration}` such as "10 minutes". */
  readonly expires: string
  /** Warning not to share the code. */
  readonly doNotShare: string
  /** Note for recipients who did not ask for a code. */
  readonly ignore: string
}

/** Texts of the `magicLink` template. */
export interface MagicLinkMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "15 minutes". */
  readonly expires: string
  /** Warning not to share the link. */
  readonly doNotShare: string
  /** Note for recipients who did not try to sign in. */
  readonly ignore: string
}

/** Texts of the `welcome` template. */
export interface WelcomeMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
}

/** Texts of the `newSignIn` template. */
export interface NewSignInMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the sign-in, with `{date}`. */
  readonly signedInAt: string
  /** Device or browser of the sign-in, with `{device}`. */
  readonly device: string
  /** Approximate location of the sign-in, with `{location}`. */
  readonly location: string
  /** IP address of the sign-in, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who signed in. */
  readonly ifYou: string
  /** Call to action when the owner did not sign in, followed by the secure-account button. */
  readonly notYouSecure: string
  /** Secure-account button label. */
  readonly secureButton: string
  /** Call to action without a secure-account URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a secure-account or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `twoFactorEnabled` template. */
export interface TwoFactorEnabledMessages {
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

/** Texts of the `twoFactorDisabled` template. */
export interface TwoFactorDisabledMessages {
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

/** Texts of the `accountLocked` template. */
export interface AccountLockedMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** End of the lock, with `{date}`. */
  readonly lockedUntil: string
  /** IP address of the failed sign-in attempts, with `{ip}`. */
  readonly ip: string
  /** Paragraph above the unlock button. */
  readonly unlock: string
  /** Unlock button label. */
  readonly unlockButton: string
  /** Offer of help without an unlock URL, followed by the support button. */
  readonly help: string
  /** Support button label. */
  readonly button: string
  /** Offer of help without an unlock or support URL, with `{email}` as a link to the support address. */
  readonly helpEmail: string
  /** Advice for the account owner who did not try to sign in. */
  readonly notYou: string
}

/** Texts of the `confirmAccountDeletion` template. */
export interface ConfirmAccountDeletionMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** What deletion means for the account and its data, above the button. */
  readonly warning: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "1 hour". */
  readonly expires: string
  /** Note for recipients who did not ask to delete their account. */
  readonly ignore: string
}

/** Texts of the `accountDeleted` template. */
export interface AccountDeletedMessages {
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Goodbye for the account owner who asked for the deletion. */
  readonly farewell: string
  /** Call to action when the owner did not ask for the deletion, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/**
 * Every text of the built-in templates, the blocks and the layout for one locale.
 *
 * This type describes the full built-in dictionary and gains keys whenever
 * built-in templates are added, in any release, so a full dictionary typed as
 * `Messages` is not covered by semver. Type your own texts with
 * {@link MessagesOverrides} (or {@link LocaleMessages} for one locale); keys
 * you leave out fall back to English.
 */
export interface Messages {
  readonly common: CommonMessages
  readonly verifyEmail: VerifyEmailMessages
  readonly resetPassword: ResetPasswordMessages
  readonly passwordChanged: PasswordChangedMessages
  readonly verifyEmailChange: VerifyEmailChangeMessages
  readonly emailChangeRequested: EmailChangeRequestedMessages
  readonly emailChanged: EmailChangedMessages
  readonly otpCode: OtpCodeMessages
  readonly magicLink: MagicLinkMessages
  readonly welcome: WelcomeMessages
  readonly newSignIn: NewSignInMessages
  readonly twoFactorEnabled: TwoFactorEnabledMessages
  readonly twoFactorDisabled: TwoFactorDisabledMessages
  readonly accountLocked: AccountLockedMessages
  readonly confirmAccountDeletion: ConfirmAccountDeletionMessages
  readonly accountDeleted: AccountDeletedMessages
}

type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T] & string

/** Dotted path of a text in {@link Messages}, such as `'verifyEmail.subject'`. */
export type MessageKey = { [S in keyof Messages]: `${S}.${StringKeys<Messages[S]>}` }[keyof Messages]

export type CommonMessageKey = Extract<MessageKey, `common.${string}`>

export type DeepPartial<T> = {
  readonly [K in keyof T]?: (T[K] extends string ? T[K] : DeepPartial<T[K]>) | undefined
}

// A custom template with its own texts replaces the built-in section of the same name.
type MailerMessages<Templates> = [keyof TemplateSections<Templates>] extends [never]
  ? Messages
  : Omit<Messages, keyof TemplateSections<Templates>> & TemplateSections<Templates>

/**
 * Texts of one locale; keys it leaves out fall back to English.
 *
 * Pass the custom templates as `Templates`, such as `LocaleMessages<typeof templates>`,
 * to include the texts of templates with their own `messages`.
 */
export type LocaleMessages<Templates = BuiltInTemplates> = DeepPartial<MailerMessages<Templates>>

export type MessageSource = Readonly<Record<string, LocaleMessages | undefined>> & { readonly en: Messages }

/**
 * Text overrides by locale, for the `messages` setting. Each locale's texts are
 * merged key by key over the built-in ones, and any locale falls back to
 * English for the keys it leaves out.
 *
 * Pass the custom templates as `Templates`, such as `MessagesOverrides<typeof templates>`,
 * to override the texts of templates with their own `messages` too.
 */
export type MessagesOverrides<Templates = BuiltInTemplates> = Readonly<
  Record<string, LocaleMessages<Templates> | undefined>
>

export const dictionaries = {
  en,
  'be-Latn': beLatn,
  be,
  cs,
  de,
  et,
  fr,
  it,
  ja,
  ka,
  lt,
  lv,
  pl,
  ro,
  th,
  uk,
} satisfies MessageSource

/**
 * A locale with built-in texts.
 *
 * This type lists the built-in locales and gains values whenever a built-in
 * locale is added, in any release, so code that requires every `Locale` value
 * (such as `Record<Locale, …>`) is not covered by semver. If you already use a
 * locale through `messages` and it becomes built-in, your overrides still win;
 * keys you did not override come from the built-in texts instead of English.
 */
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

/** Values for the placeholders of a text with plural forms; `count` picks the form. */
type PluralMessageParams = MessageParams & { readonly count: number }

/** Values for the placeholders of an HTML text with plural forms; `count` picks the form. */
type HtmlPluralMessageParams = HtmlMessageParams & { readonly count: number }

/**
 * Looks up a text for the current locale and fills its `{name}` placeholders.
 * `{companyName}` is always available; placeholders without a value stay as they are.
 *
 * `Key` lists the text keys it accepts: every built-in key by default, or the
 * template's own keys plus `common.*` in a template with its own `messages`.
 * `PluralKey` lists the template's texts with plural forms: `count` picks the
 * form through the plural rules of the locale, and `{count}` is the number
 * formatted for the locale.
 *
 * @example
 * t('common.greeting', { name: props.userName })
 * t('cart.items', { count: props.items.length })
 * t.html('passwordChanged.notYouEmail', { email: html`<a href="mailto:${address}">${address}</a>` })
 */
export interface Translate<Key extends string = MessageKey, PluralKey extends string = never> {
  // The text signature comes last, so `Parameters<Translate>` keeps describing it.
  /** Returns plain text in the plural form for `count`. Blocks escape it. */
  (key: PluralKey, params: PluralMessageParams): string
  /** Returns plain text. Blocks escape it, so it is safe to pass to `ui.paragraph` and the like. */
  (key: Key, params?: MessageParams): string
  /** Returns markup: the text and string params are escaped, {@link SafeHtml} params are inserted as-is. */
  readonly html: {
    (key: PluralKey, params: HtmlPluralMessageParams): SafeHtml
    (key: Key, params?: HtmlMessageParams): SafeHtml
  }
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

function lookup(messages: Messages, key: string): unknown {
  const dot = key.indexOf('.')
  const section: unknown = messages[key.slice(0, dot) as keyof Messages]
  return isRecord(section) ? section[key.slice(dot + 1)] : undefined
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
  const pluralRules = new Intl.PluralRules(locale)
  const numberFormat = new Intl.NumberFormat(locale)

  // Without a numeric `count`, plural forms fall back to `other` and `{count}` keeps the given value.
  function resolve<P extends HtmlMessageParams>(key: string, params: P): [string, P] {
    const value = lookup(messages, key)
    if (typeof value === 'string') return [value, params]
    if (!isRecord(value) || typeof value.other !== 'string') return [key, params]
    const { count } = params
    if (typeof count !== 'number') return [value.other, params]
    const form = value[pluralRules.select(count)]
    return [typeof form === 'string' ? form : value.other, { ...params, count: numberFormat.format(count) }]
  }

  const t: Translate = Object.assign(
    (key: MessageKey, params: MessageParams = {}) => interpolate(...resolve(key, { companyName, ...params })),
    {
      html: (key: MessageKey, params: HtmlMessageParams = {}) =>
        interpolateHtml(...resolve(key, { companyName, ...params })),
    },
  )
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
