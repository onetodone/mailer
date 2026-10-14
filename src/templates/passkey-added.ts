import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, linkBlocks, supportBlocks, userName } from './shared'

/** Props of the built-in `passkeyAdded` template. All optional. */
export interface PasskeyAddedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name of the passkey, such as `iPhone` or `YubiKey 5`, shown as given. */
  readonly passkeyName?: string | undefined
  /** When the passkey was added. */
  readonly changedAt?: Date | undefined
  /** IANA time zone for `changedAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the change came from. */
  readonly ip?: string | undefined
  /** Device or browser the change came from, such as `Chrome on macOS`. */
  readonly device?: string | undefined
  /** Absolute http(s) link to a page where the owner secures the account and removes passkeys. Without it the email points to support. */
  readonly secureUrl?: string | undefined
  /** Absolute http(s) link to support, used when there is no `secureUrl`. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    passkeyName: nonEmptyText.optional(),
    changedAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    device: nonEmptyText.optional(),
    secureUrl: httpUrl.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, PasskeyAddedProps> = props

/**
 * Tells the account owner that a passkey was added to the account, with a way
 * to secure the account if it wasn't them.
 */
export const passkeyAdded = defineTemplate({
  name: 'passkeyAdded',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('passkeyAdded.subject'),
    preheader: t('passkeyAdded.preheader'),
    body: [
      ui.heading(t('passkeyAdded.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('passkeyAdded.intro')),
      details(ui, [
        props.passkeyName !== undefined && t('passkeyAdded.passkey', { passkeyName: props.passkeyName }),
        props.changedAt !== undefined &&
          t('passkeyAdded.changedAt', { date: format.dateTime(props.changedAt, props.timeZone) }),
        props.device !== undefined && t('passkeyAdded.device', { device: props.device }),
        props.ip !== undefined && t('passkeyAdded.ip', { ip: props.ip }),
      ]),
      ui.paragraph(t('passkeyAdded.ifYou')),
      ui.divider(),
      ...(props.secureUrl === undefined
        ? supportBlocks({ ui, t, branding }, props.supportUrl, {
            text: 'passkeyAdded.notYou',
            button: 'passkeyAdded.button',
            email: 'passkeyAdded.notYouEmail',
          })
        : linkBlocks(ui, t('passkeyAdded.notYouSecure'), t('passkeyAdded.secureButton'), props.secureUrl)),
    ],
  }),
})
