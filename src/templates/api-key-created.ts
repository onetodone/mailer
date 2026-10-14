import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, linkBlocks, supportBlocks, userName } from './shared'

/**
 * Props of the built-in `apiKeyCreated` template. All optional. There is no
 * prop for the key itself: never put a secret in an email.
 */
export interface ApiKeyCreatedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name or label of the key, such as `CI deploy`, shown as given. Never the key itself. */
  readonly keyName?: string | undefined
  /** When the key was created. */
  readonly createdAt?: Date | undefined
  /** When the key expires. */
  readonly expiresAt?: Date | undefined
  /** IANA time zone for `createdAt` and `expiresAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the key was created from. */
  readonly ip?: string | undefined
  /** Absolute http(s) link to the page where the owner manages and revokes keys. Without it the email points to support. */
  readonly manageUrl?: string | undefined
  /** Absolute http(s) link to support, used when there is no `manageUrl`. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    keyName: nonEmptyText.optional(),
    createdAt: date.optional(),
    expiresAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    manageUrl: httpUrl.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, ApiKeyCreatedProps> = props

/**
 * Tells the account owner that an API key or personal access token was
 * created, with a way to revoke it if it wasn't them.
 */
export const apiKeyCreated = defineTemplate({
  name: 'apiKeyCreated',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('apiKeyCreated.subject'),
    preheader: t('apiKeyCreated.preheader'),
    body: [
      ui.heading(t('apiKeyCreated.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('apiKeyCreated.intro')),
      details(ui, [
        props.keyName !== undefined && t('apiKeyCreated.keyName', { keyName: props.keyName }),
        props.createdAt !== undefined &&
          t('apiKeyCreated.createdAt', { date: format.dateTime(props.createdAt, props.timeZone) }),
        props.expiresAt !== undefined &&
          t('apiKeyCreated.expiresAt', { date: format.dateTime(props.expiresAt, props.timeZone) }),
        props.ip !== undefined && t('apiKeyCreated.ip', { ip: props.ip }),
      ]),
      ui.paragraph(t('apiKeyCreated.ifYou')),
      ui.divider(),
      ...(props.manageUrl === undefined
        ? supportBlocks({ ui, t, branding }, props.supportUrl, {
            text: 'apiKeyCreated.notYou',
            button: 'apiKeyCreated.button',
            email: 'apiKeyCreated.notYouEmail',
          })
        : linkBlocks(ui, t('apiKeyCreated.notYouRevoke'), t('apiKeyCreated.manageButton'), props.manageUrl)),
    ],
  }),
})
