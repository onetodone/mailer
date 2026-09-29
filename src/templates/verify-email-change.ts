import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `verifyEmailChange` template. */
export interface VerifyEmailChangeProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link that confirms the new address. */
  readonly verifyUrl: string
  /** How long the link works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  { userName, verifyUrl: httpUrl, expiresInMinutes: positiveInteger.optional() },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, VerifyEmailChangeProps> = props

/** Asks the account owner to confirm a new email address, sent to that new address. */
export const verifyEmailChange = defineTemplate({
  name: 'verifyEmailChange',
  schema,
  render: ({ props, ui, t, format }) => ({
    subject: t('verifyEmailChange.subject'),
    preheader: t('verifyEmailChange.preheader'),
    body: [
      ui.heading(t('verifyEmailChange.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('verifyEmailChange.intro')),
      ui.button(t('verifyEmailChange.button'), props.verifyUrl),
      ui.linkFallback(props.verifyUrl),
      ui.divider(),
      props.expiresInMinutes !== undefined &&
        ui.note(t('verifyEmailChange.expires', { duration: format.duration(props.expiresInMinutes) })),
      ui.note(t('verifyEmailChange.ignore')),
    ],
  }),
})
