import { z } from 'zod'

import { date, httpUrl, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { details, greeting, userName } from './shared'

/** Props of the built-in `inactiveAccountWarning` template. */
export interface InactiveAccountWarningProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When the account will be deleted unless the owner signs in. */
  readonly deletionDate: Date
  /** When the owner last signed in. */
  readonly lastSignInAt?: Date | undefined
  /** IANA time zone for the dates, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** Absolute http(s) link to the sign-in page. Default: `branding.appUrl`. */
  readonly signInUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    deletionDate: date,
    lastSignInAt: date.optional(),
    timeZone: timeZone.optional(),
    signInUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, InactiveAccountWarningProps> = props

/**
 * Warns the owner of an inactive account that it will be deleted on a given
 * date unless they sign in before then.
 */
export const inactiveAccountWarning = defineTemplate({
  name: 'inactiveAccountWarning',
  schema,
  render: ({ props, ui, t, format, branding }) => {
    const url = props.signInUrl ?? branding.appUrl
    return {
      subject: t('inactiveAccountWarning.subject'),
      preheader: t('inactiveAccountWarning.preheader'),
      body: [
        ui.heading(t('inactiveAccountWarning.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(t('inactiveAccountWarning.intro')),
        details(ui, [
          t('inactiveAccountWarning.deletionDate', { date: format.dateTime(props.deletionDate, props.timeZone) }),
          props.lastSignInAt !== undefined &&
            t('inactiveAccountWarning.lastSignInAt', { date: format.dateTime(props.lastSignInAt, props.timeZone) }),
        ]),
        ui.paragraph(t('inactiveAccountWarning.keep')),
        ui.button(t('inactiveAccountWarning.button'), url),
        ui.linkFallback(url),
        ui.divider(),
        ui.note(t('inactiveAccountWarning.noAction')),
      ],
    }
  },
})
