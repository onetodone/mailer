import { z } from 'zod'

import { httpUrl, nonEmptyText, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, optionalName, person, userName } from './shared'

/** Props of the built-in `teamInvite` template. */
export interface TeamInviteProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name of the person who sent the invitation. */
  readonly inviterName?: string | undefined
  /** Email address of the person who sent the invitation, shown after `inviterName` or on its own. */
  readonly inviterEmail?: string | undefined
  /** Name of the organization, team or workspace the recipient is invited to. */
  readonly organizationName: string
  /** Role the recipient gets on joining, such as `Admin`, shown as given. */
  readonly role?: string | undefined
  /** Absolute http(s) link that accepts the invitation. */
  readonly acceptUrl: string
  /** How long the invitation works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  {
    userName,
    inviterName: optionalName,
    inviterEmail: optionalName,
    organizationName: nonEmptyText,
    role: nonEmptyText.optional(),
    acceptUrl: httpUrl,
    expiresInMinutes: positiveInteger.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, TeamInviteProps> = props

/**
 * Invites someone to join an organization, team or workspace in the app, with
 * a button that accepts the invitation.
 */
export const teamInvite = defineTemplate({
  name: 'teamInvite',
  schema,
  render: ({ props, ui, t, format }) => {
    const { organizationName } = props
    const inviter = person(props.inviterName, props.inviterEmail)
    return {
      subject: t('teamInvite.subject', { organizationName }),
      preheader: t('teamInvite.preheader', { organizationName }),
      body: [
        ui.heading(t('teamInvite.heading', { organizationName })),
        greeting(ui, t, props.userName),
        ui.paragraph(
          inviter === undefined
            ? t('teamInvite.introAnonymous', { organizationName })
            : t('teamInvite.intro', { inviter, organizationName }),
        ),
        details(ui, [props.role !== undefined && t('teamInvite.role', { role: props.role })]),
        ui.button(t('teamInvite.button'), props.acceptUrl),
        ui.linkFallback(props.acceptUrl),
        ui.divider(),
        props.expiresInMinutes !== undefined &&
          ui.note(t('teamInvite.expires', { duration: format.duration(props.expiresInMinutes) })),
        ui.note(t('teamInvite.ignore')),
      ],
    }
  },
})
