import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, linkBlocks, supportBlocks, userName } from './shared'

/** Props of the built-in `emailChangeRequested` template. */
export interface EmailChangeRequestedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** The address the account is moving to. Any text, so a masked address such as `l***@example.com` works too. */
  readonly newEmail: string
  /** When the change was requested. */
  readonly requestedAt?: Date | undefined
  /** IANA time zone for `requestedAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the request came from. */
  readonly ip?: string | undefined
  /** Absolute http(s) link that cancels the change. Without it the email points to support. */
  readonly cancelUrl?: string | undefined
  /** Absolute http(s) link to support, used when there is no `cancelUrl`. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    newEmail: nonEmptyText,
    requestedAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    cancelUrl: httpUrl.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, EmailChangeRequestedProps> = props

/**
 * Tells the account owner, at their current address, that a change to a new
 * address was requested, with a way to cancel it if it wasn't them.
 */
export const emailChangeRequested = defineTemplate({
  name: 'emailChangeRequested',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('emailChangeRequested.subject'),
    preheader: t('emailChangeRequested.preheader'),
    body: [
      ui.heading(t('emailChangeRequested.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('emailChangeRequested.intro', { newEmail: props.newEmail })),
      details(ui, [
        props.requestedAt !== undefined &&
          t('emailChangeRequested.requestedAt', { date: format.dateTime(props.requestedAt, props.timeZone) }),
        props.ip !== undefined && t('emailChangeRequested.ip', { ip: props.ip }),
      ]),
      ui.paragraph(t('emailChangeRequested.ifYou', { newEmail: props.newEmail })),
      ui.divider(),
      ...(props.cancelUrl === undefined
        ? supportBlocks({ ui, t, branding }, props.supportUrl, {
            text: 'emailChangeRequested.notYou',
            button: 'emailChangeRequested.button',
            email: 'emailChangeRequested.notYouEmail',
          })
        : linkBlocks(
            ui,
            t('emailChangeRequested.notYouCancel'),
            t('emailChangeRequested.cancelButton'),
            props.cancelUrl,
          )),
    ],
  }),
})
