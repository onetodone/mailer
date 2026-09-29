import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `confirmAccountDeletion` template. */
export interface ConfirmAccountDeletionProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link that confirms the deletion. */
  readonly confirmUrl: string
  /** How long the link works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  { userName, confirmUrl: httpUrl, expiresInMinutes: positiveInteger.optional() },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, ConfirmAccountDeletionProps> = props

/**
 * Asks the account owner to confirm deleting their account, with a warning
 * that a deleted account and its data can't be restored.
 */
export const confirmAccountDeletion = defineTemplate({
  name: 'confirmAccountDeletion',
  schema,
  render: ({ props, ui, t, format }) => ({
    subject: t('confirmAccountDeletion.subject'),
    preheader: t('confirmAccountDeletion.preheader'),
    body: [
      ui.heading(t('confirmAccountDeletion.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('confirmAccountDeletion.intro')),
      ui.paragraph(t('confirmAccountDeletion.warning')),
      ui.button(t('confirmAccountDeletion.button'), props.confirmUrl),
      ui.linkFallback(props.confirmUrl),
      ui.divider(),
      props.expiresInMinutes !== undefined &&
        ui.note(t('confirmAccountDeletion.expires', { duration: format.duration(props.expiresInMinutes) })),
      ui.note(t('confirmAccountDeletion.ignore')),
    ],
  }),
})
