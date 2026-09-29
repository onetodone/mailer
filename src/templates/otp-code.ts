import { z } from 'zod'

import { nonEmptyText, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `otpCode` template. */
export interface OtpCodeProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** The one-time code, such as `482913`. Codes of up to 8 characters fit narrow screens. */
  readonly code: string
  /** How long the code works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  { userName, code: nonEmptyText, expiresInMinutes: positiveInteger.optional() },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, OtpCodeProps> = props

/**
 * Sends a one-time code, for sign-in, two-step verification or confirming an
 * action. The subject and inbox preview leave out the code.
 */
export const otpCode = defineTemplate({
  name: 'otpCode',
  schema,
  render: ({ props, ui, t, format }) => ({
    subject: t('otpCode.subject', { code: props.code }),
    preheader: t('otpCode.preheader', { code: props.code }),
    body: [
      ui.heading(t('otpCode.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('otpCode.intro')),
      ui.code(props.code),
      ui.divider(),
      props.expiresInMinutes !== undefined &&
        ui.note(t('otpCode.expires', { duration: format.duration(props.expiresInMinutes) })),
      ui.note(t('otpCode.doNotShare')),
      ui.note(t('otpCode.ignore')),
    ],
  }),
})
