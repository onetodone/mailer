import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, optionalName, supportBlocks, userName } from './shared'

/** Props of the built-in `ownershipTransferred` template. */
export interface OwnershipTransferredProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name of the organization, team or workspace. */
  readonly organizationName: string
  /** Name of the new owner. Without it the email says another member. */
  readonly newOwnerName?: string | undefined
  /** The recipient's role after the transfer, such as `Admin`, shown as given. */
  readonly newRole?: string | undefined
  /** When the ownership was transferred. */
  readonly transferredAt?: Date | undefined
  /** IANA time zone for `transferredAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the transfer came from. */
  readonly ip?: string | undefined
  /** Absolute http(s) link to support. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    organizationName: nonEmptyText,
    newOwnerName: optionalName,
    newRole: nonEmptyText.optional(),
    transferredAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, OwnershipTransferredProps> = props

/**
 * Tells the former owner of an organization, team or workspace that its
 * ownership was transferred, with a way to get help if it wasn't them. The
 * new owner gets `ownershipReceived`.
 */
export const ownershipTransferred = defineTemplate({
  name: 'ownershipTransferred',
  schema,
  render: ({ props, ui, t, format, branding }) => {
    const { organizationName, newOwnerName } = props
    return {
      subject: t('ownershipTransferred.subject', { organizationName }),
      preheader: t('ownershipTransferred.preheader', { organizationName }),
      body: [
        ui.heading(t('ownershipTransferred.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(
          newOwnerName === undefined
            ? t('ownershipTransferred.introAnonymous', { organizationName })
            : t('ownershipTransferred.intro', { organizationName, newOwner: newOwnerName }),
        ),
        details(ui, [
          props.newRole !== undefined && t('ownershipTransferred.newRole', { role: props.newRole }),
          props.transferredAt !== undefined &&
            t('ownershipTransferred.transferredAt', { date: format.dateTime(props.transferredAt, props.timeZone) }),
          props.ip !== undefined && t('ownershipTransferred.ip', { ip: props.ip }),
        ]),
        ui.paragraph(t('ownershipTransferred.ifYou')),
        ui.divider(),
        ...supportBlocks({ ui, t, branding }, props.supportUrl, {
          text: 'ownershipTransferred.notYou',
          button: 'ownershipTransferred.button',
          email: 'ownershipTransferred.notYouEmail',
        }),
      ],
    }
  },
})
