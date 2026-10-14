import { z } from 'zod'

import { date, httpUrl, nonEmptyText, nonNegativeInteger, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, linkBlocks, supportBlocks, userName } from './shared'

/** Props of the built-in `recoveryCodeUsed` template. All optional. */
export interface RecoveryCodeUsedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When the recovery code was used. */
  readonly usedAt?: Date | undefined
  /** IANA time zone for `usedAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the sign-in came from. */
  readonly ip?: string | undefined
  /** Device or browser of the sign-in, such as `Chrome on macOS`. */
  readonly device?: string | undefined
  /** How many unused recovery codes are left. At `0` the email asks the owner to generate new ones. */
  readonly remainingCodes?: number | undefined
  /** Absolute http(s) link to a page where the owner generates new recovery codes. Without it the email has no button for it. */
  readonly regenerateUrl?: string | undefined
  /** Absolute http(s) link to a page where the owner secures the account. Without it the email points to support. */
  readonly secureUrl?: string | undefined
  /** Absolute http(s) link to support, used when there is no `secureUrl`. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    usedAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    device: nonEmptyText.optional(),
    remainingCodes: nonNegativeInteger.optional(),
    regenerateUrl: httpUrl.optional(),
    secureUrl: httpUrl.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, RecoveryCodeUsedProps> = props

/**
 * Tells the account owner that a two-factor recovery code was used to sign in,
 * how many codes are left, and how to secure the account if it wasn't them.
 */
export const recoveryCodeUsed = defineTemplate({
  name: 'recoveryCodeUsed',
  schema,
  render: ({ props, ui, t, format, branding }) => {
    const noneLeft = props.remainingCodes === 0
    return {
      subject: t('recoveryCodeUsed.subject'),
      preheader: t('recoveryCodeUsed.preheader'),
      body: [
        ui.heading(t('recoveryCodeUsed.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(t('recoveryCodeUsed.intro')),
        details(ui, [
          props.usedAt !== undefined &&
            t('recoveryCodeUsed.usedAt', { date: format.dateTime(props.usedAt, props.timeZone) }),
          props.device !== undefined && t('recoveryCodeUsed.device', { device: props.device }),
          props.ip !== undefined && t('recoveryCodeUsed.ip', { ip: props.ip }),
          props.remainingCodes !== undefined && t('recoveryCodeUsed.remaining', { count: props.remainingCodes }),
        ]),
        ...(props.regenerateUrl === undefined
          ? [noneLeft && ui.paragraph(t('recoveryCodeUsed.noneLeft'))]
          : linkBlocks(
              ui,
              t(noneLeft ? 'recoveryCodeUsed.noneLeft' : 'recoveryCodeUsed.regenerate'),
              t('recoveryCodeUsed.regenerateButton'),
              props.regenerateUrl,
            )),
        ui.divider(),
        ...(props.secureUrl === undefined
          ? supportBlocks({ ui, t, branding }, props.supportUrl, {
              text: 'recoveryCodeUsed.notYou',
              button: 'recoveryCodeUsed.button',
              email: 'recoveryCodeUsed.notYouEmail',
            })
          : linkBlocks(ui, t('recoveryCodeUsed.notYouSecure'), t('recoveryCodeUsed.secureButton'), props.secureUrl)),
      ],
    }
  },
})
