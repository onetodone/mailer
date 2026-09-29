import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, linkBlocks, supportBlocks, userName } from './shared'

/** Props of the built-in `accountLocked` template. All optional. */
export interface AccountLockedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When the lock ends. Without it the email does not say. */
  readonly lockedUntil?: Date | undefined
  /** IANA time zone for `lockedUntil`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the failed sign-in attempts came from. */
  readonly ip?: string | undefined
  /** Absolute http(s) link that unlocks the account. Without it the email offers help from support. */
  readonly unlockUrl?: string | undefined
  /** Absolute http(s) link to support, used when there is no `unlockUrl`. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    lockedUntil: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    unlockUrl: httpUrl.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, AccountLockedProps> = props

/**
 * Tells the account owner that the account was locked after too many failed
 * sign-in attempts, with a way to unlock it or get help.
 */
export const accountLocked = defineTemplate({
  name: 'accountLocked',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('accountLocked.subject'),
    preheader: t('accountLocked.preheader'),
    body: [
      ui.heading(t('accountLocked.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('accountLocked.intro')),
      details(ui, [
        props.lockedUntil !== undefined &&
          t('accountLocked.lockedUntil', { date: format.dateTime(props.lockedUntil, props.timeZone) }),
        props.ip !== undefined && t('accountLocked.ip', { ip: props.ip }),
      ]),
      ...(props.unlockUrl === undefined
        ? supportBlocks({ ui, t, branding }, props.supportUrl, {
            text: 'accountLocked.help',
            button: 'accountLocked.button',
            email: 'accountLocked.helpEmail',
          })
        : linkBlocks(ui, t('accountLocked.unlock'), t('accountLocked.unlockButton'), props.unlockUrl)),
      ui.divider(),
      ui.note(t('accountLocked.notYou')),
    ],
  }),
})
