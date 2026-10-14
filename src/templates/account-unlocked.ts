import { z } from 'zod'

import { date, httpUrl, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, supportBlocks, userName } from './shared'

/** Props of the built-in `accountUnlocked` template. All optional. */
export interface AccountUnlockedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When the account was unlocked. */
  readonly unlockedAt?: Date | undefined
  /** IANA time zone for `unlockedAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** Absolute http(s) link to the sign-in page. Default: `branding.appUrl`. */
  readonly signInUrl?: string | undefined
  /** Absolute http(s) link to support. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    unlockedAt: date.optional(),
    timeZone: timeZone.optional(),
    signInUrl: httpUrl.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, AccountUnlockedProps> = props

/**
 * Tells the account owner that a locked account is unlocked and they can sign
 * in again, the counterpart of `accountLocked`.
 */
export const accountUnlocked = defineTemplate({
  name: 'accountUnlocked',
  schema,
  render: ({ props, ui, t, format, branding }) => {
    const url = props.signInUrl ?? branding.appUrl
    return {
      subject: t('accountUnlocked.subject'),
      preheader: t('accountUnlocked.preheader'),
      body: [
        ui.heading(t('accountUnlocked.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(t('accountUnlocked.intro')),
        details(ui, [
          props.unlockedAt !== undefined &&
            t('accountUnlocked.unlockedAt', { date: format.dateTime(props.unlockedAt, props.timeZone) }),
        ]),
        ui.button(t('accountUnlocked.signInButton'), url),
        ui.linkFallback(url),
        ui.paragraph(t('accountUnlocked.advice')),
        ui.divider(),
        ...supportBlocks({ ui, t, branding }, props.supportUrl, {
          text: 'accountUnlocked.help',
          button: 'accountUnlocked.button',
          email: 'accountUnlocked.helpEmail',
        }),
      ],
    }
  },
})
