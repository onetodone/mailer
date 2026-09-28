import { createUi, joinBlocks, type Block } from '../core/blocks'
import type { Layout } from '../core/layout'
import type { ResolvedBranding } from '../core/theme'
import { MailerError } from '../errors'
import { createI18n, type Messages } from '../i18n'
import type { TemplateProps, TemplateRegistry } from './define'
import type { StandardSchemaV1Issue } from './standard-schema'

export interface RenderOptions {
  readonly branding: ResolvedBranding
  readonly layout: Layout
  readonly locale: string
  /** Texts resolved for `locale`. */
  readonly messages: Messages
  /** Default time zone for dates. Default `UTC`. */
  readonly timeZone?: string | undefined
}

export interface RenderedEmail {
  readonly subject: string
  readonly html: string
  readonly text: string
}

function describeIssue({ message, path = [] }: StandardSchemaV1Issue): string {
  const location = path.map((segment) => String(typeof segment === 'object' ? segment.key : segment)).join('.')
  return location === '' ? message : `${location}: ${message}`
}

function isBlock(entry: Block | false | null | undefined): entry is Block {
  return typeof entry === 'object' && entry !== null
}

export async function renderTemplate<R extends TemplateRegistry, N extends keyof R & string>(
  templates: R,
  name: N,
  props: TemplateProps<R[N]>,
  options: RenderOptions,
): Promise<RenderedEmail> {
  const template = Object.hasOwn(templates, name) ? templates[name] : undefined
  if (template === undefined) {
    throw new MailerError(
      'UNKNOWN_TEMPLATE',
      `Unknown template "${name}". Available templates: ${Object.keys(templates).join(', ')}.`,
    )
  }

  const result = await template.schema['~standard'].validate(props)
  if (result.issues !== undefined) {
    throw new MailerError(
      'INVALID_PROPS',
      `Invalid props for template "${name}": ${result.issues.map(describeIssue).join('; ')}.`,
      { cause: result.issues },
    )
  }

  const { branding, layout, locale, messages } = options
  const theme = branding.theme
  const { t, format } = createI18n({ locale, messages, companyName: branding.companyName, timeZone: options.timeZone })
  const ui = createUi({ theme, messages: { linkFallback: t('common.linkFallback') } })
  const content = template.render({ props: result.value, ui, t, format, locale, branding, theme })
  const subject = content.subject.replace(/\s+/g, ' ').trim()
  const document = layout({
    branding,
    theme,
    locale,
    subject,
    preheader: content.preheader ?? '',
    content: joinBlocks(content.body.filter(isBlock)),
    messages: { footerSupport: t('common.footerSupport'), footerRights: t('common.footerRights') },
  })
  return { subject, html: document.html.toString(), text: document.text }
}
