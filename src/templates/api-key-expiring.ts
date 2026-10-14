import { z } from 'zod'

import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, userName } from './shared'

/** Props of the built-in `apiKeyExpiring` template. */
export interface ApiKeyExpiringProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Name or label of the key, such as `CI deploy`, shown as given. Never the key itself. */
  readonly keyName?: string | undefined
  /** When the key expires. */
  readonly expiresAt: Date
  /** IANA time zone for `expiresAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** Absolute http(s) link to the page where the owner creates and manages keys. Without it the email has no button. */
  readonly manageUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    keyName: nonEmptyText.optional(),
    expiresAt: date,
    timeZone: timeZone.optional(),
    manageUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, ApiKeyExpiringProps> = props

/**
 * Reminds the account owner that an API key or personal access token expires
 * soon, so they can replace it before requests start to fail.
 */
export const apiKeyExpiring = defineTemplate({
  name: 'apiKeyExpiring',
  schema,
  render: ({ props, ui, t, format }) => ({
    subject: t('apiKeyExpiring.subject'),
    preheader: t('apiKeyExpiring.preheader'),
    body: [
      ui.heading(t('apiKeyExpiring.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('apiKeyExpiring.intro')),
      details(ui, [
        props.keyName !== undefined && t('apiKeyExpiring.keyName', { keyName: props.keyName }),
        t('apiKeyExpiring.expiresAt', { date: format.dateTime(props.expiresAt, props.timeZone) }),
      ]),
      ui.paragraph(t('apiKeyExpiring.renew')),
      ...(props.manageUrl === undefined
        ? []
        : [ui.button(t('apiKeyExpiring.button'), props.manageUrl), ui.linkFallback(props.manageUrl)]),
      ui.divider(),
      ui.note(t('apiKeyExpiring.unused')),
    ],
  }),
})
