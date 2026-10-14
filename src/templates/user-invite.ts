import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, optionalName, person, userName } from './shared'

/** Props of the built-in `userInvite` template. */
export interface UserInviteProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name of the person who sent the invitation. */
  readonly inviterName?: string | undefined
  /** Email address of the person who sent the invitation, shown after `inviterName` or on its own. */
  readonly inviterEmail?: string | undefined
  /** Absolute http(s) link that accepts the invitation, such as a page where the user sets a password. */
  readonly acceptUrl: string
  /** How long the invitation works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  {
    userName,
    inviterName: optionalName,
    inviterEmail: optionalName,
    acceptUrl: httpUrl,
    expiresInMinutes: positiveInteger.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, UserInviteProps> = props

/**
 * Invites someone to the app with an account created for them, such as by an
 * admin, with a button where they set a password and finish setting it up.
 */
export const userInvite = defineTemplate({
  name: 'userInvite',
  schema,
  render: ({ props, ui, t, format }) => {
    const inviter = person(props.inviterName, props.inviterEmail)
    return {
      subject: t('userInvite.subject'),
      preheader: t('userInvite.preheader'),
      body: [
        ui.heading(t('userInvite.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(inviter === undefined ? t('userInvite.introAnonymous') : t('userInvite.intro', { inviter })),
        ui.paragraph(t('userInvite.setUp')),
        ui.button(t('userInvite.button'), props.acceptUrl),
        ui.linkFallback(props.acceptUrl),
        ui.divider(),
        props.expiresInMinutes !== undefined &&
          ui.note(t('userInvite.expires', { duration: format.duration(props.expiresInMinutes) })),
        ui.note(t('userInvite.ignore')),
      ],
    }
  },
})
