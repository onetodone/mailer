import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `resetPassword` template. */
export interface ResetPasswordProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link to the page where the user sets a new password. */
  readonly resetUrl: string
  /** How long the link works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  { userName, resetUrl: httpUrl, expiresInMinutes: positiveInteger.optional() },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, ResetPasswordProps> = props

/** Sends a link to choose a new password. */
export const resetPassword = defineTemplate({
  name: 'resetPassword',
  schema,
  render: ({ props, ui, t, format }) => ({
    subject: t('resetPassword.subject'),
    preheader: t('resetPassword.preheader'),
    body: [
      ui.heading(t('resetPassword.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('resetPassword.intro')),
      ui.button(t('resetPassword.button'), props.resetUrl),
      ui.linkFallback(props.resetUrl),
      ui.divider(),
      props.expiresInMinutes !== undefined &&
        ui.note(t('resetPassword.expires', { duration: format.duration(props.expiresInMinutes) })),
      ui.note(t('resetPassword.ignore')),
    ],
  }),
})
