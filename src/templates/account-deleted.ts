import { z } from 'zod'

import { httpUrl, objectError } from '../validators'
import { defineTemplate } from './define'
import { greeting, supportBlocks, userName } from './shared'

/** Props of the built-in `accountDeleted` template. All optional. */
export interface AccountDeletedProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link to support. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject({ userName, supportUrl: httpUrl.optional() }, { error: objectError })
const schema: z.ZodType<z.output<typeof props>, AccountDeletedProps> = props

/**
 * Tells the former account owner that the account was deleted, with a way to
 * get help if it wasn't them.
 */
export const accountDeleted = defineTemplate({
  name: 'accountDeleted',
  schema,
  render: ({ props, ui, t, branding }) => ({
    subject: t('accountDeleted.subject'),
    preheader: t('accountDeleted.preheader'),
    body: [
      ui.heading(t('accountDeleted.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('accountDeleted.intro')),
      ui.paragraph(t('accountDeleted.farewell')),
      ui.divider(),
      ...supportBlocks({ ui, t, branding }, props.supportUrl, {
        text: 'accountDeleted.notYou',
        button: 'accountDeleted.button',
        email: 'accountDeleted.notYouEmail',
      }),
    ],
  }),
})
