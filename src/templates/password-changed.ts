import { z } from 'zod'

import { html } from '../core/html'
import { date, httpUrl, nonEmptyText, objectError, timeZone } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `passwordChanged` template. All optional. */
export interface PasswordChangedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** When the password was changed. */
  readonly changedAt?: Date | undefined
  /** IANA time zone for `changedAt`, such as `Europe/Berlin`. Default: the mailer's time zone, UTC unless configured. */
  readonly timeZone?: string | undefined
  /** IP address the change came from. */
  readonly ip?: string | undefined
  /** Absolute http(s) link to support. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    changedAt: date.optional(),
    timeZone: timeZone.optional(),
    ip: nonEmptyText.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, PasswordChangedProps> = props

/** Tells the account owner that their password was changed, with a way to get help if it wasn't them. */
export const passwordChanged = defineTemplate({
  name: 'passwordChanged',
  schema,
  render: ({ props, ui, t, format, branding, theme }) => {
    const details = [
      props.changedAt !== undefined &&
        t('passwordChanged.changedAt', { date: format.dateTime(props.changedAt, props.timeZone) }),
      props.ip !== undefined && t('passwordChanged.ip', { ip: props.ip }),
    ].filter((line) => line !== false)
    const email = branding.supportEmail
    const notYou =
      props.supportUrl === undefined
        ? [
            ui.paragraph(
              t.html('passwordChanged.notYouEmail', {
                email: html`<a href="mailto:${email}" style="color:${theme.primary};text-decoration:underline;">${email}</a>`,
              }),
            ),
          ]
        : [
            ui.paragraph(t('passwordChanged.notYou')),
            ui.button(t('passwordChanged.button'), props.supportUrl),
            ui.linkFallback(props.supportUrl),
          ]
    return {
      subject: t('passwordChanged.subject'),
      preheader: t('passwordChanged.preheader'),
      body: [
        ui.heading(t('passwordChanged.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(t('passwordChanged.intro')),
        details.length > 0 && ui.paragraph(details.join('\n')),
        ui.paragraph(t('passwordChanged.ifYou')),
        ui.divider(),
        ...notYou,
      ],
    }
  },
})
