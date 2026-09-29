import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, supportBlocks, userName } from './shared'

/** Props of the built-in `twoFactorDisabled` template. All optional. */
export interface TwoFactorDisabledProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When two-factor authentication was turned off. */
  readonly changedAt?: Date | undefined
  /** IANA time zone for `changedAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the change came from. */
  readonly ip?: string | undefined
  /** Absolute http(s) link to support. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    changedAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, TwoFactorDisabledProps> = props

/**
 * Tells the account owner that two-factor authentication was turned off, with
 * a way to get help if it wasn't them.
 */
export const twoFactorDisabled = defineTemplate({
  name: 'twoFactorDisabled',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('twoFactorDisabled.subject'),
    preheader: t('twoFactorDisabled.preheader'),
    body: [
      ui.heading(t('twoFactorDisabled.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('twoFactorDisabled.intro')),
      details(ui, [
        props.changedAt !== undefined &&
          t('twoFactorDisabled.changedAt', { date: format.dateTime(props.changedAt, props.timeZone) }),
        props.ip !== undefined && t('twoFactorDisabled.ip', { ip: props.ip }),
      ]),
      ui.paragraph(t('twoFactorDisabled.ifYou')),
      ui.divider(),
      ...supportBlocks({ ui, t, branding }, props.supportUrl, {
        text: 'twoFactorDisabled.notYou',
        button: 'twoFactorDisabled.button',
        email: 'twoFactorDisabled.notYouEmail',
      }),
    ],
  }),
})
