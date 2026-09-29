import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `magicLink` template. */
export interface MagicLinkProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link that signs the user in. */
  readonly signInUrl: string
  /** How long the link works, in minutes. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
}

const props = z.strictObject(
  { userName, signInUrl: httpUrl, expiresInMinutes: positiveInteger.optional() },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, MagicLinkProps> = props

/** Sends a link that signs the user in without a password. */
export const magicLink = defineTemplate({
  name: 'magicLink',
  schema,
  render: ({ props, ui, t, format }) => ({
    subject: t('magicLink.subject'),
    preheader: t('magicLink.preheader'),
    body: [
      ui.heading(t('magicLink.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('magicLink.intro')),
      ui.button(t('magicLink.button'), props.signInUrl),
      ui.linkFallback(props.signInUrl),
      ui.divider(),
      props.expiresInMinutes !== undefined &&
        ui.note(t('magicLink.expires', { duration: format.duration(props.expiresInMinutes) })),
      ui.note(t('magicLink.doNotShare')),
      ui.note(t('magicLink.ignore')),
    ],
  }),
})
