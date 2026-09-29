import type { Block, Ui } from '../core/blocks'
import type { ResolvedBranding, Theme } from '../core/theme'
import type { Formatters, MessageKey, Translate } from '../i18n'
import type { TemplateMessageKey, TemplateMessages, TemplateTexts } from './messages'
import type { StandardSchemaV1 } from './standard-schema'

/**
 * Everything a template receives to render one email. `Key` lists the text
 * keys `t` accepts: every built-in key by default.
 */
export interface TemplateRenderContext<Props, Key extends string = MessageKey> {
  /** Props after schema validation, with the schema's transforms and defaults applied. */
  readonly props: Props
  /** Content blocks bound to the theme and locale. */
  readonly ui: Ui
  /** Texts for the current locale. */
  readonly t: Translate<Key>
  /** Locale-aware durations and dates. */
  readonly format: Formatters
  /** Locale of the email, such as `en` or `be`. */
  readonly locale: string
  /** Validated branding with defaults applied. */
  readonly branding: ResolvedBranding
  /** Resolved theme tokens, the same object as `branding.theme`. */
  readonly theme: Theme
}

/** What a template renders: the subject, the inbox preview and the body blocks. */
export interface TemplateContent {
  /** Email subject. Line breaks and repeated spaces collapse to single spaces. */
  readonly subject: string
  /** Inbox preview text shown after the subject. */
  readonly preheader?: string | undefined
  /** Body blocks in order. `false`, `null` and `undefined` entries are skipped, for conditional blocks. */
  readonly body: readonly (Block | false | null | undefined)[]
}

/**
 * An email template: a name, a Standard Schema for its props, its own texts
 * and a render function. Create one with {@link defineTemplate}.
 *
 * `Texts` is the shape of the template's English texts, or `undefined` for a
 * template without its own texts. `Template` without type arguments is a
 * template without its own texts; `Template<string, unknown, unknown, TemplateTexts>`
 * matches every template.
 */
export interface Template<
  Name extends string = string,
  Input = unknown,
  Props = unknown,
  Texts extends TemplateTexts | undefined = undefined,
> {
  /** Template name, the key it is registered under. */
  readonly name: Name
  /** Validates props before rendering. Any Standard Schema library works: zod 4, valibot, arktype. */
  readonly schema: StandardSchemaV1<Input, Props>
  /**
   * The template's own texts by locale. `en` is required and lists every key;
   * other locales may leave keys out, which fall back to English. `t` then
   * takes `'<name>.<key>'` and the `common` keys, and the mailer's `messages`
   * setting can override the texts under the template's name.
   */
  readonly messages?: ([Texts] extends [TemplateTexts] ? TemplateMessages<Texts> : never) | undefined
  // Method syntax keeps `Props` bivariant, so every template fits `TemplateRegistry`.
  /** Renders the subject, preheader and body from validated props. */
  render(context: TemplateRenderContext<Props, TemplateMessageKey<Name, Texts>>): TemplateContent
}

// Its `t` accepts only the `common` keys, which every template's `t` accepts, so any template fits.
export type AnyTemplate = Template<string, unknown, unknown, TemplateTexts>

export type TemplateRegistry = Readonly<Record<string, AnyTemplate>>

/** Props a caller passes to a template: the input type of its schema. */
export type TemplateProps<T extends Template<string, unknown, unknown, TemplateTexts>> =
  T['schema'] extends StandardSchemaV1<infer Input, unknown> ? Input : never

/**
 * Declares an email template. The props type comes from the schema: callers
 * pass the schema's input, and `render` receives its validated output.
 *
 * With `messages`, the template brings its own texts: `t` takes
 * `'<name>.<key>'` for them and the `common` keys, each locale falls back to
 * English key by key, and the mailer's `messages` setting can override them.
 *
 * @example
 * const orderShipped = defineTemplate({
 *   name: 'orderShipped',
 *   schema: z.object({ orderId: z.string(), trackUrl: z.url() }),
 *   messages: {
 *     en: { subject: 'Order #{orderId} shipped', button: 'Track order' },
 *     be: { subject: 'Замова №{orderId} адпраўлена', button: 'Адсачыць замову' },
 *   },
 *   render: ({ props, ui, t }) => ({
 *     subject: t('orderShipped.subject', { orderId: props.orderId }),
 *     body: [ui.button(t('orderShipped.button'), props.trackUrl), ui.linkFallback(props.trackUrl)],
 *   }),
 * })
 */
export function defineTemplate<Name extends string, Input, Props, Texts extends TemplateTexts | undefined = undefined>(
  template: Template<Name, Input, Props, Texts>,
): Template<Name, Input, Props, Texts> {
  return template
}
