import type { Block, Ui } from '../core/blocks'
import type { ResolvedBranding, Theme } from '../core/theme'
import type { Formatters, Translate } from '../i18n'
import type { StandardSchemaV1 } from './standard-schema'

/** Everything a template receives to render one email. */
export interface TemplateRenderContext<Props> {
  /** Props after schema validation, with the schema's transforms and defaults applied. */
  readonly props: Props
  /** Content blocks bound to the theme and locale. */
  readonly ui: Ui
  /** Texts for the current locale. */
  readonly t: Translate
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
 * An email template: a name, a Standard Schema for its props and a render
 * function. Create one with {@link defineTemplate}.
 */
export interface Template<Name extends string = string, Input = unknown, Props = unknown> {
  /** Template name, the key it is registered under. */
  readonly name: Name
  /** Validates props before rendering. Any Standard Schema library works: zod 4, valibot, arktype. */
  readonly schema: StandardSchemaV1<Input, Props>
  // Method syntax keeps `Props` bivariant, so every template fits `TemplateRegistry`.
  /** Renders the subject, preheader and body from validated props. */
  render(context: TemplateRenderContext<Props>): TemplateContent
}

export type TemplateRegistry = Readonly<Record<string, Template>>

/** Props a caller passes to a template: the input type of its schema. */
export type TemplateProps<T extends Template> =
  T['schema'] extends StandardSchemaV1<infer Input, unknown> ? Input : never

/**
 * Declares an email template. The props type comes from the schema: callers
 * pass the schema's input, and `render` receives its validated output.
 *
 * @example
 * const orderShipped = defineTemplate({
 *   name: 'orderShipped',
 *   schema: z.object({ orderId: z.string(), trackUrl: z.url() }),
 *   render: ({ props, ui }) => ({
 *     subject: `Order #${props.orderId} shipped`,
 *     body: [ui.button('Track order', props.trackUrl), ui.linkFallback(props.trackUrl)],
 *   }),
 * })
 */
export function defineTemplate<Name extends string, Input, Props>(
  template: Template<Name, Input, Props>,
): Template<Name, Input, Props> {
  return template
}
