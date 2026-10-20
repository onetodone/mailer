import type { Layout } from './core/layout'
import type { Branding } from './core/theme'
import type { Locale, LocaleMessages, MessagesOverrides } from './i18n'
import type { BuiltInTemplates } from './templates/built-in'
import type { Template } from './templates/define'
import type { TemplateTexts } from './templates/messages'
import type { MailAddress, MailAddresses, MailTransport, SendResult } from './transports/types'

/** Custom templates by name. Each template's `name` must equal its key. */
export type CustomTemplates<T> = { readonly [K in keyof T]: Template<K & string, unknown, unknown, TemplateTexts> }

/** An attachment in hook events: what it is, never its content. */
export interface AttachmentInfo {
  /** File name the recipient sees. */
  readonly filename: string
  /** MIME type, as passed or as guessed from the file name. */
  readonly contentType: string
  /** Size of the content in bytes. */
  readonly size: number
}

/**
 * Details of an email in hook events. The HTML, the plain text, the props and
 * the attachment content are left out, so events are safe to log: links in
 * them often carry tokens.
 */
export interface MailEvent {
  /** Name of the template. */
  readonly template: string
  /** Locale of the email. */
  readonly locale: string
  /** Sender. */
  readonly from: MailAddress
  /** Recipients. */
  readonly to: MailAddresses
  /** Carbon-copy recipients. */
  readonly cc?: MailAddresses | undefined
  /** Blind carbon-copy recipients. */
  readonly bcc?: MailAddresses | undefined
  /** Addresses replies go to. */
  readonly replyTo?: MailAddresses | undefined
  /** Extra message headers. */
  readonly headers?: Readonly<Record<string, string>> | undefined
  /** File name, type and size of each attachment. Left out when the options failed validation. */
  readonly attachments?: readonly AttachmentInfo[] | undefined
  /** Milliseconds from the `send` call to its outcome, rendering included. */
  readonly durationMs: number
}

/** Passed to `onSent` after the transport accepted an email. */
export interface MailSentEvent extends MailEvent {
  /** Subject line. */
  readonly subject: string
  /** What the transport reported. */
  readonly result: SendResult
}

/** Passed to `onError` when `send` fails. */
export interface MailErrorEvent extends MailEvent {
  /** Subject line, or `undefined` when `send` failed before the email was rendered. */
  readonly subject: string | undefined
  /** The error `send` rejects with. */
  readonly error: unknown
}

/**
 * Settings for {@link createMailer}. Everything is validated when the mailer
 * is created.
 */
export interface MailerConfig<
  Templates extends CustomTemplates<Templates> = BuiltInTemplates,
  Overrides extends MessagesOverrides<Templates> = Partial<Record<Locale, LocaleMessages<Templates>>>,
> {
  /** Delivers the rendered emails, such as `smtpTransport(…)` or `memoryTransport()`. */
  readonly transport: MailTransport
  /** Sender of every email: `no-reply@myapp.com`, `My App <no-reply@myapp.com>` or `{ name, address }`. */
  readonly from: MailAddress
  /** Default addresses replies go to. A `replyTo` passed to `send` replaces it. */
  readonly replyTo?: MailAddresses | undefined
  /** Default locale: a built-in one (see {@link Locale}) or a key of `messages`. Default `en`. */
  readonly locale?: NoInfer<Locale | (keyof Overrides & string)> | undefined
  /** IANA time zone for dates in emails, such as `Europe/Berlin`. Default `UTC`. */
  readonly timeZone?: string | undefined
  /** Company name, links, logo, footer text and theme. */
  readonly branding: Branding
  /**
   * Text overrides by locale, merged key by key over the built-in texts. A
   * locale without built-in texts, such as `ca`, falls back to English for the
   * keys it leaves out. The texts of a custom template with its own
   * `messages` are overridden under the template's name.
   *
   * @example
   * messages: { en: { resetPassword: { subject: 'Forgot your password?' } } }
   */
  readonly messages?: Overrides | undefined
  /** Wraps every email in its header, footer and document. Default: the built-in layout. */
  readonly layout?: Layout | undefined
  /**
   * Templates from {@link defineTemplate} by name. A new name adds a template;
   * a built-in name, such as `verifyEmail`, replaces the built-in one. Each
   * template's `name` must equal its key. The locales of a template's own
   * `messages` must be built-in ones or keys of `messages`.
   */
  readonly templates?: Templates | undefined
  /**
   * Called after the transport accepted an email. `send` waits for it, but
   * its outcome never depends on the hook: when the hook throws or rejects,
   * `send` still resolves, and the failure is reported with
   * `process.emitWarning` as a `MailerWarning`, or with `console.warn` on
   * runtimes without it.
   */
  readonly onSent?: ((event: MailSentEvent) => unknown) | undefined
  /**
   * Called when `send` fails, before it rejects. `send` waits for it and
   * always rejects with the original error: when the hook throws or rejects,
   * the failure is reported with `process.emitWarning` as a `MailerWarning`,
   * or with `console.warn` on runtimes without it.
   */
  readonly onError?: ((event: MailErrorEvent) => unknown) | undefined
}
