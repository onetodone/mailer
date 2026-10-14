import { z } from 'zod'

import { httpUrl, nonEmptyText, objectError } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `inviteAccepted` template. */
export interface InviteAcceptedProps {
  /** Name of the recipient, who sent the invitation, for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name or email address of the person who accepted the invitation. */
  readonly memberName: string
  /** Organization, team or workspace the person joined. Without it the email names the app. */
  readonly organizationName?: string | undefined
  /** Absolute http(s) link to the list of members. Without it the email has no button. */
  readonly membersUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    memberName: nonEmptyText,
    organizationName: nonEmptyText.optional(),
    membersUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, InviteAcceptedProps> = props

/** Tells the person who sent an invitation that it was accepted. */
export const inviteAccepted = defineTemplate({
  name: 'inviteAccepted',
  schema,
  render: ({ props, ui, t }) => {
    const { memberName, organizationName } = props
    return {
      subject: t('inviteAccepted.subject', { memberName }),
      preheader: t('inviteAccepted.preheader', { memberName }),
      body: [
        ui.heading(t('inviteAccepted.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(
          organizationName === undefined
            ? t('inviteAccepted.introApp', { memberName })
            : t('inviteAccepted.intro', { memberName, organizationName }),
        ),
        ...(props.membersUrl === undefined
          ? []
          : [ui.button(t('inviteAccepted.button'), props.membersUrl), ui.linkFallback(props.membersUrl)]),
      ],
    }
  },
})
