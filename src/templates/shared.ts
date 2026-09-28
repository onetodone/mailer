import type { Block, Ui } from '../core/blocks'
import type { Translate } from '../i18n'
import { optionalText } from '../validators'

export const userName = optionalText.optional().transform((value) => (value === '' ? undefined : value))

export function greeting(ui: Ui, t: Translate, name: string | undefined): Block {
  return ui.paragraph(name === undefined ? t('common.greetingAnonymous') : t('common.greeting', { name }))
}
