import { inspect } from 'node:util'

import { z } from 'zod'

import { describeAttachment, linkInlineImages, withContentType } from './attachments'
import {
  configSchema,
  describeLocales,
  knownLocales,
  type AttachmentInfo,
  type CustomTemplates,
  type MailerConfig,
  type MailErrorEvent,
  type MailEvent,
  type MailSentEvent,
} from './config'
import { defaultLayout } from './core/layout'
import { MailerError, parseConfig, parseOptions } from './errors'
import { buildMessages, dictionaries, type Locale, type LocaleMessages, type MessagesOverrides } from './i18n'
import { builtInTemplates, type BuiltInTemplates } from './templates/built-in'
import type { AnyTemplate, Template, TemplateProps, TemplateRegistry } from './templates/define'
import { templateSections, withTemplateMessages } from './templates/messages'
import { renderTemplate, type RenderedEmail } from './templates/render'
import type { Attachment, MailAddresses, OutgoingMessage, SendResult } from './transports/types'
import { attachments, describeInput, headers, isRecord, mailAddresses, objectError } from './validators'

/** Built-in templates merged with custom ones; a custom template replaces a built-in one with the same name. */
export type WithBuiltIns<Custom> = {
  readonly [K in keyof BuiltInTemplates | keyof Custom]: K extends keyof Custom
    ? Custom[K]
    : K extends keyof BuiltInTemplates
      ? BuiltInTemplates[K]
      : never
}

type PropsOf<T> = T extends AnyTemplate ? TemplateProps<T> : never

// True when an empty object is valid props, so `props` can be left out.
type OptionalProps<T> = Record<PropertyKey, never> extends PropsOf<T> ? true : false

type PropsOption<T> =
  OptionalProps<T> extends true
    ? {
        /** Template props. Optional because every prop of this template is optional. */
        readonly props?: PropsOf<T> | undefined
      }
    : {
        /** Template props, checked against the template's schema before rendering. */
        readonly props: PropsOf<T>
      }

/**
 * Options for {@link Mailer.send}: recipients, headers, attachments, locale
 * and the template's props. `props` may be left out when every prop is
 * optional.
 */
export type SendOptions<T = Template, L extends string = Locale> = {
  /** Recipients: one address or a list. */
  readonly to: MailAddresses
  /** Carbon-copy recipients. */
  readonly cc?: MailAddresses | undefined
  /** Blind carbon-copy recipients. */
  readonly bcc?: MailAddresses | undefined
  /** Addresses replies go to. Replaces the mailer's `replyTo`. */
  readonly replyTo?: MailAddresses | undefined
  /** Extra message headers, such as `{ 'X-Entity-Ref-ID': '42' }`. Values must not contain line breaks. */
  readonly headers?: Readonly<Record<string, string>> | undefined
  /**
   * Files to attach, such as an invoice. An attachment with a `cid` is an
   * inline image the HTML shows through `cid:<cid>`, and every `cid:` the HTML
   * references needs an attachment with that `cid`.
   */
  readonly attachments?: readonly Attachment[] | undefined
  /** Locale of this email. Default: the mailer's locale. */
  readonly locale?: L | undefined
} & PropsOption<T>

/**
 * Options for {@link Mailer.render}: locale and the template's props. The
 * options may be left out when every prop is optional.
 */
export type RenderOptions<T = Template, L extends string = Locale> = {
  /** Locale of this email. Default: the mailer's locale. */
  readonly locale?: L | undefined
} & PropsOption<T>

type RenderArgs<T, L extends string> =
  OptionalProps<T> extends true ? [options?: RenderOptions<T, L>] : [options: RenderOptions<T, L>]

/** Renders and sends emails. Create one with {@link createMailer}. */
export interface Mailer<Templates = BuiltInTemplates, L extends string = Locale> {
  /**
   * Renders a template and hands the email to the transport.
   *
   * @throws {MailerError} `INVALID_OPTIONS` for invalid addresses, headers,
   * attachments or locale, or a `cid:` in the HTML without an attachment;
   * `UNKNOWN_TEMPLATE`, `INVALID_PROPS`, or `TRANSPORT_FAILED` with the
   * transport's error as `cause`. Errors thrown by template or layout code
   * pass through unchanged.
   *
   * @example
   * await mailer.send('verifyEmail', {
   *   to: 'user@example.com',
   *   props: { userName: 'Lizzie', verifyUrl: 'https://myapp.com/verify?token=123' },
   * })
   */
  send<Name extends keyof Templates & string>(name: Name, options: SendOptions<Templates[Name], L>): Promise<SendResult>
  /**
   * Renders a template without sending it, for previews, tests and custom
   * delivery. Hooks are not called.
   *
   * @throws {MailerError} `INVALID_OPTIONS` for an unknown locale,
   * `UNKNOWN_TEMPLATE` or `INVALID_PROPS`.
   *
   * @example
   * const { subject, html, text } = await mailer.render('passwordChanged', { locale: 'be' })
   */
  render<Name extends keyof Templates & string>(
    name: Name,
    ...options: RenderArgs<Templates[Name], L>
  ): Promise<RenderedEmail>
  /** Closes the transport, such as an SMTP connection pool. Call it on shutdown. */
  close(): Promise<void>
}

interface SendInput {
  readonly to?: MailAddresses | undefined
  readonly cc?: MailAddresses | undefined
  readonly bcc?: MailAddresses | undefined
  readonly replyTo?: MailAddresses | undefined
  readonly headers?: Readonly<Record<string, string>> | undefined
  readonly locale?: string | undefined
  readonly props?: unknown
}

function withoutUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T
}

function describeFailure(error: unknown): string {
  return `Email delivery failed: ${error instanceof Error ? error.message : String(error)}`
}

async function runHook<Event>(
  name: 'onSent' | 'onError',
  hook: ((event: Event) => unknown) | undefined,
  event: Event,
  outcome: string,
): Promise<void> {
  if (hook === undefined) return
  try {
    await hook(event)
  } catch (error) {
    process.emitWarning(`The ${name} hook failed. ${outcome}`, { type: 'MailerWarning', detail: inspect(error) })
  }
}

/**
 * Creates a mailer from validated settings. Invalid settings throw here, at
 * startup, instead of on the first send.
 *
 * Custom templates in `templates` are added to the built-in ones or replace
 * them by name, and `send` and `render` infer each template's props. Locales
 * are the built-in ones plus the keys of `messages`.
 *
 * @throws {MailerError} With code `INVALID_CONFIG` when a setting is invalid.
 *
 * @example
 * import { createMailer } from '@onetodone/mailer'
 * import { smtpTransport } from '@onetodone/mailer/smtp'
 *
 * export const mailer = createMailer({
 *   transport: smtpTransport({ host: 'smtp.example.com', port: 465, secure: true, auth }),
 *   from: { name: 'My App', address: 'no-reply@myapp.com' },
 *   branding: { companyName: 'My App', appUrl: 'https://myapp.com', supportEmail: 'support@myapp.com' },
 * })
 */
export function createMailer<
  Templates extends CustomTemplates<Templates> = BuiltInTemplates,
  Overrides extends MessagesOverrides<Templates> = Partial<Record<Locale, LocaleMessages<Templates>>>,
>(config: MailerConfig<Templates, Overrides>): Mailer<WithBuiltIns<Templates>, Locale | (keyof Overrides & string)> {
  const settings = parseConfig(configSchema(templateSections(isRecord(config) ? config.templates : undefined)), config)
  const { transport, from, branding, timeZone, onSent, onError } = settings
  const templates: TemplateRegistry = { ...builtInTemplates, ...settings.templates }
  const messages = buildMessages(settings.messages, withTemplateMessages(dictionaries, settings.templates))
  const defaultLocale = settings.locale ?? 'en'
  const layout = settings.layout ?? defaultLayout

  const locales = knownLocales(settings.messages)
  const locale = z
    .string()
    .refine((value) => locales.includes(value), {
      error: (issue) => `must be one of ${describeLocales(locales)}, received ${describeInput(issue.input)}`,
    })
    .optional()
  const sendOptions = z.strictObject(
    {
      to: mailAddresses,
      cc: mailAddresses.optional(),
      bcc: mailAddresses.optional(),
      replyTo: mailAddresses.optional(),
      headers: headers.optional(),
      attachments: attachments.optional(),
      locale,
      props: z.unknown().optional(),
    },
    { error: objectError },
  )
  const renderOptions = z.strictObject({ locale, props: z.unknown().optional() }, { error: objectError })

  function renderEmail(name: string, props: unknown, emailLocale: string): Promise<RenderedEmail> {
    return renderTemplate(templates, name, props ?? {}, {
      branding,
      layout,
      locale: emailLocale,
      messages: messages[emailLocale] ?? messages.en,
      timeZone,
    })
  }

  async function deliver(message: OutgoingMessage): Promise<SendResult> {
    try {
      return await transport.send(message)
    } catch (error) {
      if (error instanceof MailerError) throw error
      throw new MailerError('TRANSPORT_FAILED', describeFailure(error), { cause: error })
    }
  }

  async function send(name: string, options: unknown): Promise<SendResult> {
    const started = performance.now()
    const input: SendInput = isRecord(options) ? options : {}
    const replyTo = input.replyTo ?? settings.replyTo
    const emailLocale = typeof input.locale === 'string' ? input.locale : defaultLocale
    let attachmentsInfo: AttachmentInfo[] | undefined
    const event = () =>
      withoutUndefined({
        template: name,
        locale: emailLocale,
        from,
        to: input.to,
        cc: input.cc,
        bcc: input.bcc,
        replyTo,
        headers: input.headers,
        attachments: attachmentsInfo,
        durationMs: performance.now() - started,
      }) as MailEvent

    let subject: string | undefined
    let result: SendResult
    try {
      const {
        to,
        cc,
        bcc,
        headers: extraHeaders,
        attachments: passed,
        props,
      } = parseOptions(sendOptions, options, 'send')
      const files = passed?.map(withContentType)
      attachmentsInfo = files?.map(describeAttachment)
      const email = await renderEmail(name, props, emailLocale)
      subject = email.subject
      result = await deliver(
        withoutUndefined({
          from,
          to,
          cc,
          bcc,
          replyTo,
          subject,
          html: email.html,
          text: email.text,
          headers: extraHeaders,
          attachments: linkInlineImages(email.html, files),
        }),
      )
    } catch (error) {
      const errorEvent: MailErrorEvent = { ...event(), subject, error }
      await runHook('onError', onError, errorEvent, 'send() rejects with the original error.')
      throw error
    }
    const sentEvent: MailSentEvent = { ...event(), subject, result }
    await runHook('onSent', onSent, sentEvent, 'The email was sent and send() resolves as usual.')
    return result
  }

  return {
    send,
    async render(name: string, options?: unknown) {
      const { locale: emailLocale = defaultLocale, props } = parseOptions(renderOptions, options ?? {}, 'render')
      return renderEmail(name, props, emailLocale)
    },
    async close() {
      await transport.close?.()
    },
  }
}
