import { z } from 'zod'

import { httpUrl, nonEmptyText, objectError } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, optionalName, userName } from './shared'

/** Props of the built-in `memberRoleChanged` template. */
export interface MemberRoleChangedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name of the organization, team or workspace. */
  readonly organizationName: string
  /** The member's new role, such as `Admin`, shown as given. */
  readonly role: string
  /** The member's role before the change, shown as given. */
  readonly previousRole?: string | undefined
  /** Name of the person who changed the role. */
  readonly changedByName?: string | undefined
  /** Absolute http(s) link to the organization in the app. Without it the email has no button. */
  readonly organizationUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    organizationName: nonEmptyText,
    role: nonEmptyText,
    previousRole: nonEmptyText.optional(),
    changedByName: optionalName,
    organizationUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, MemberRoleChangedProps> = props

/** Tells a member that their role in an organization, team or workspace was changed. */
export const memberRoleChanged = defineTemplate({
  name: 'memberRoleChanged',
  schema,
  render: ({ props, ui, t }) => {
    const { organizationName } = props
    return {
      subject: t('memberRoleChanged.subject', { organizationName }),
      preheader: t('memberRoleChanged.preheader', { organizationName }),
      body: [
        ui.heading(t('memberRoleChanged.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(t('memberRoleChanged.intro', { organizationName })),
        details(ui, [
          t('memberRoleChanged.role', { role: props.role }),
          props.previousRole !== undefined && t('memberRoleChanged.previousRole', { previousRole: props.previousRole }),
          props.changedByName !== undefined && t('memberRoleChanged.changedBy', { changedBy: props.changedByName }),
        ]),
        ...(props.organizationUrl === undefined
          ? []
          : [
              ui.button(t('memberRoleChanged.button', { organizationName }), props.organizationUrl),
              ui.linkFallback(props.organizationUrl),
            ]),
        ui.divider(),
        ui.note(t('memberRoleChanged.questions', { organizationName })),
      ],
    }
  },
})
