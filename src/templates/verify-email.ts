import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Asks a new user to confirm their email address. */
export const verifyEmail = defineTemplate({
  name: 'verifyEmail',
  schema: z.strictObject(
    {
      /** Recipient's name for the greeting. Without it the greeting has no name. */
      userName,
      /** Absolute http(s) link that confirms the address. */
      verifyUrl: httpUrl,
      /** How long the link works, in minutes. Without it the email does not mention expiry. */
      expiresInMinutes: positiveInteger.optional(),
    },
    { error: objectError },
  ),
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
