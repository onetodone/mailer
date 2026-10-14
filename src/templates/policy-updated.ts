import { z } from 'zod'

import { date, expected, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, userName } from './shared'

/** Props of the built-in `policyUpdated` template. */
export interface PolicyUpdatedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Which document changed: `'terms'` for the terms of service, `'privacy'` for the privacy policy. */
  readonly policy: 'terms' | 'privacy'
  /** Absolute http(s) link to the updated document. */
  readonly policyUrl: string
  /** When the changes take effect. */
  readonly effectiveAt?: Date | undefined
  /** IANA time zone for `effectiveAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** Short summaries of the main changes, in the recipient's language, shown as a list. */
  readonly changes?: readonly string[] | undefined
}

const props = z.strictObject(
  {
    userName,
    policy: z.enum(['terms', 'privacy'], { error: expected('"terms" or "privacy"') }),
    policyUrl: httpUrl,
    effectiveAt: date.optional(),
    timeZone: timeZone.optional(),
    changes: z.array(nonEmptyText, { error: expected('an array of strings') }).optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, PolicyUpdatedProps> = props

/**
 * Tells users that the terms of service or the privacy policy are changing,
 * with a link to the updated document and an optional list of the main changes.
 */
export const policyUpdated = defineTemplate({
  name: 'policyUpdated',
  schema,
  render: ({ props, ui, t, format }) => {
    const { policy, changes = [] } = props
    return {
      subject: t(`policyUpdated.${policy}Subject`),
      preheader: t(`policyUpdated.${policy}Preheader`),
      body: [
        ui.heading(t(`policyUpdated.${policy}Heading`)),
        greeting(ui, t, props.userName),
        ui.paragraph(t(`policyUpdated.${policy}Intro`)),
        details(ui, [
          props.effectiveAt !== undefined &&
            t('policyUpdated.effectiveAt', { date: format.dateTime(props.effectiveAt, props.timeZone) }),
        ]),
        changes.length > 0 &&
          ui.paragraph([t('policyUpdated.changes'), ...changes.map((change) => `• ${change}`)].join('\n')),
        ui.button(t(`policyUpdated.${policy}Button`), props.policyUrl),
        ui.linkFallback(props.policyUrl),
        ui.divider(),
        ui.note(t(policy === 'terms' ? 'policyUpdated.termsAgree' : 'policyUpdated.privacyNoAction')),
      ],
    }
  },
})
