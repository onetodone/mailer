import { z } from 'zod'

import { httpUrl, objectError } from '../validators'
import { defineTemplate } from './define'
import { greeting, userName } from './shared'

/** Props of the built-in `welcome` template. All optional. */
export interface WelcomeProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link behind the button, such as an onboarding page. Default: `branding.appUrl`. */
  readonly ctaUrl?: string | undefined
}

const props = z.strictObject({ userName, ctaUrl: httpUrl.optional() }, { error: objectError })
const schema: z.ZodType<z.output<typeof props>, WelcomeProps> = props

/** Welcomes a new user once their account is ready, with a button into the app. */
export const welcome = defineTemplate({
  name: 'welcome',
  schema,
  render: ({ props, ui, t, branding }) => {
    const url = props.ctaUrl ?? branding.appUrl
    return {
      subject: t('welcome.subject'),
      preheader: t('welcome.preheader'),
      body: [
        ui.heading(t('welcome.heading')),
        greeting(ui, t, props.userName),
        ui.paragraph(t('welcome.intro')),
        ui.button(t('welcome.button'), url),
        ui.linkFallback(url),
      ],
    }
  },
})
