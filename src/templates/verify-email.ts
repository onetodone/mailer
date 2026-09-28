import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `verifyEmail` template. */
export interface VerifyEmailProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link that confirms the address. */
  readonly verifyUrl: string
  /** How long the link works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  { userName, verifyUrl: httpUrl, expiresInMinutes: positiveInteger.optional() },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, VerifyEmailProps> = props

/** Asks a new user to confirm their email address. */
export const verifyEmail = defineTemplate({
  name: 'verifyEmail',
  schema,
  render: ({ props, ui, t, format }) => ({
    subject: t('verifyEmail.subject'),
    preheader: t('verifyEmail.preheader'),
    body: [
      ui.heading(t('verifyEmail.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('verifyEmail.intro')),
      ui.button(t('verifyEmail.button'), props.verifyUrl),
      ui.linkFallback(props.verifyUrl),
      ui.divider(),
      props.expiresInMinutes !== undefined &&
        ui.note(t('verifyEmail.expires', { duration: format.duration(props.expiresInMinutes) })),
      ui.note(t('verifyEmail.ignore')),
    ],
  }),
})
