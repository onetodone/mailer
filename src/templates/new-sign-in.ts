import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, linkBlocks, supportBlocks, userName } from './shared'

/** Props of the built-in `newSignIn` template. All optional. */
export interface NewSignInProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When the sign-in happened. */
  readonly signedInAt?: Date | undefined
  /** IANA time zone for `signedInAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the sign-in came from. */
  readonly ip?: string | undefined
  /** Device or browser of the sign-in, such as `Chrome on macOS`. */
  readonly device?: string | undefined
  /** Approximate location of the sign-in, such as `Berlin, Germany`. */
  readonly location?: string | undefined
  /** Absolute http(s) link to a page where the owner secures the account. Without it the email points to support. */
  readonly secureUrl?: string | undefined
  /** Absolute http(s) link to support, used when there is no `secureUrl`. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    signedInAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    device: nonEmptyText.optional(),
    location: nonEmptyText.optional(),
    secureUrl: httpUrl.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, NewSignInProps> = props

/**
 * Tells the account owner about a sign-in, such as from a new device, with a
 * way to secure the account if it wasn't them.
 */
export const newSignIn = defineTemplate({
  name: 'newSignIn',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('newSignIn.subject'),
    preheader: t('newSignIn.preheader'),
    body: [
      ui.heading(t('newSignIn.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('newSignIn.intro')),
      details(ui, [
        props.signedInAt !== undefined &&
          t('newSignIn.signedInAt', { date: format.dateTime(props.signedInAt, props.timeZone) }),
        props.device !== undefined && t('newSignIn.device', { device: props.device }),
        props.location !== undefined && t('newSignIn.location', { location: props.location }),
        props.ip !== undefined && t('newSignIn.ip', { ip: props.ip }),
      ]),
      ui.paragraph(t('newSignIn.ifYou')),
      ui.divider(),
      ...(props.secureUrl === undefined
        ? supportBlocks({ ui, t, branding }, props.supportUrl, {
            text: 'newSignIn.notYou',
            button: 'newSignIn.button',
            email: 'newSignIn.notYouEmail',
          })
        : linkBlocks(ui, t('newSignIn.notYouSecure'), t('newSignIn.secureButton'), props.secureUrl)),
    ],
  }),
})
