import { z } from 'zod'

import { httpUrl, nonEmptyText, objectError } from '../validators'
import { defineTemplate } from './define'
import { greeting, optionalName, userName } from './shared'

/** Props of the built-in `ownershipReceived` template. */
export interface OwnershipReceivedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name of the organization, team or workspace. */
  readonly organizationName: string
  /** Name of the previous owner, who transferred the ownership. */
  readonly previousOwnerName?: string | undefined
  /** Absolute http(s) link to the organization in the app. Without it the email has no button. */
  readonly organizationUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    organizationName: nonEmptyText,
    previousOwnerName: optionalName,
    organizationUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, OwnershipReceivedProps> = props

/**
 * Tells the new owner of an organization, team or workspace that its
 * ownership was transferred to them. The former owner gets `ownershipTransferred`.
 */
export const ownershipReceived = defineTemplate({
  name: 'ownershipReceived',
  schema,
  render: ({ props, ui, t }) => {
    const { organizationName, previousOwnerName } = props
    return {
      subject: t('ownershipReceived.subject', { organizationName }),
      preheader: t('ownershipReceived.preheader', { organizationName }),
      body: [
        ui.heading(t('ownershipReceived.heading', { organizationName })),
        greeting(ui, t, props.userName),
        ui.paragraph(
          previousOwnerName === undefined
            ? t('ownershipReceived.introAnonymous', { organizationName })
            : t('ownershipReceived.intro', { organizationName, previousOwner: previousOwnerName }),
        ),
        ui.paragraph(t('ownershipReceived.owner', { organizationName })),
        ...(props.organizationUrl === undefined
          ? []
          : [
              ui.button(t('ownershipReceived.button', { organizationName }), props.organizationUrl),
              ui.linkFallback(props.organizationUrl),
            ]),
      ],
    }
  },
})
