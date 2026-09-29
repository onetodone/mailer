import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, supportBlocks, userName } from './shared'

/** Props of the built-in `emailChanged` template. All optional. */
export interface EmailChangedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** The new address. Any text, so a masked address such as `l***@example.com` works too. Without it the email does not name it. */
  readonly newEmail?: string | undefined
  /** When the email was changed. */
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
    newEmail: nonEmptyText.optional(),
    changedAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, EmailChangedProps> = props

/**
 * Tells the account owner, at their old address, that the account email was
 * changed, with a way to get help if it wasn't them.
 */
export const emailChanged = defineTemplate({
  name: 'emailChanged',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('emailChanged.subject'),
    preheader: t('emailChanged.preheader'),
    body: [
      ui.heading(t('emailChanged.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('emailChanged.intro')),
      details(ui, [
        props.newEmail !== undefined && t('emailChanged.newEmail', { newEmail: props.newEmail }),
        props.changedAt !== undefined &&
          t('emailChanged.changedAt', { date: format.dateTime(props.changedAt, props.timeZone) }),
        props.ip !== undefined && t('emailChanged.ip', { ip: props.ip }),
      ]),
      ui.paragraph(t('emailChanged.newAddress')),
      ui.paragraph(t('emailChanged.ifYou')),
      ui.divider(),
      ...supportBlocks({ ui, t, branding }, props.supportUrl, {
        text: 'emailChanged.notYou',
        button: 'emailChanged.button',
        email: 'emailChanged.notYouEmail',
      }),
    ],
  }),
})
