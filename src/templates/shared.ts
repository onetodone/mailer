import type { Block, Ui } from '../core/blocks'
import { html } from '../core/html'
import type { MessageKey, Translate } from '../i18n'
import { optionalText } from '../validators'
import type { TemplateRenderContext } from './define'

export const userName = optionalText.optional().transform((value) => (value === '' ? undefined : value))

export function greeting(ui: Ui, t: Translate, name: string | undefined): Block {
  return ui.paragraph(name === undefined ? t('common.greetingAnonymous') : t('common.greeting', { name }))
}

export function details(ui: Ui, lines: readonly (string | false)[]): Block | false {
  const shown = lines.filter((line) => line !== false)
  return shown.length > 0 && ui.paragraph(shown.join('\n'))
}

export function linkBlocks(ui: Ui, text: string, label: string, url: string): Block[] {
  return [ui.paragraph(text), ui.button(label, url), ui.linkFallback(url)]
}

export interface SupportKeys {
  /** Paragraph above the support button. */
  readonly text: MessageKey
  /** Support button label. */
  readonly button: MessageKey
  /** Paragraph without a support URL, with `{email}` as a link to the support address. */
  readonly email: MessageKey
}

export function supportBlocks(
  { ui, t, branding }: Pick<TemplateRenderContext<unknown>, 'ui' | 't' | 'branding'>,
  supportUrl: string | undefined,
  keys: SupportKeys,
): Block[] {
  if (supportUrl !== undefined) return linkBlocks(ui, t(keys.text), t(keys.button), supportUrl)
  const email = branding.supportEmail
  return [
    ui.paragraph(
      t.html(keys.email, {
        email: html`<a href="mailto:${email}" style="color:${branding.theme.primary};text-decoration:underline;">${email}</a>`,
      }),
    ),
  ]
}
