import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, supportBlocks, userName } from './shared'

/** Props of the built-in `twoFactorEnabled` template. All optional. */
export interface TwoFactorEnabledProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When two-factor authentication was turned on. */
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
const schema: z.ZodType<z.output<typeof props>, TwoFactorEnabledProps> = props

/**
 * Tells the account owner that two-factor authentication was turned on, with
 * a way to get help if it wasn't them.
 */
export const twoFactorEnabled = defineTemplate({
  name: 'twoFactorEnabled',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('twoFactorEnabled.subject'),
    preheader: t('twoFactorEnabled.preheader'),
    body: [
      ui.heading(t('twoFactorEnabled.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('twoFactorEnabled.intro')),
      details(ui, [
        props.changedAt !== undefined &&
          t('twoFactorEnabled.changedAt', { date: format.dateTime(props.changedAt, props.timeZone) }),
        props.ip !== undefined && t('twoFactorEnabled.ip', { ip: props.ip }),
      ]),
      ui.paragraph(t('twoFactorEnabled.ifYou')),
      ui.divider(),
      ...supportBlocks({ ui, t, branding }, props.supportUrl, {
        text: 'twoFactorEnabled.notYou',
        button: 'twoFactorEnabled.button',
        email: 'twoFactorEnabled.notYouEmail',
      }),
    ],
  }),
})
