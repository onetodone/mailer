import { z } from 'zod'

import { nonEmptyText, objectError } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, optionalName, userName } from './shared'

/** Props of the built-in `memberRemoved` template. */
export interface MemberRemovedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name of the organization, team or workspace. */
  readonly organizationName: string
  /** Name of the person who removed the member. */
  readonly removedByName?: string | undefined
}

const props = z.strictObject(
  { userName, organizationName: nonEmptyText, removedByName: optionalName },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, MemberRemovedProps> = props

/**
 * Tells a member that they were removed from an organization, team or
 * workspace, and that their own account stays.
 */
export const memberRemoved = defineTemplate({
  name: 'memberRemoved',
  schema,
  render: ({ props, ui, t }) => {
    const { organizationName } = props
    return {
      subject: t('memberRemoved.subject', { organizationName }),
      preheader: t('memberRemoved.preheader', { organizationName }),
      body: [
        ui.heading(t('memberRemoved.heading', { organizationName })),
        greeting(ui, t, props.userName),
        ui.paragraph(t('memberRemoved.intro', { organizationName })),
        details(ui, [
          props.removedByName !== undefined && t('memberRemoved.removedBy', { removedBy: props.removedByName }),
        ]),
        ui.paragraph(t('memberRemoved.account')),
        ui.divider(),
        ui.note(t('memberRemoved.mistake', { organizationName })),
      ],
    }
  },
})
