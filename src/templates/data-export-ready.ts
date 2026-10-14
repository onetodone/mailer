import { z } from 'zod'

import { httpUrl, objectError, positiveInteger } from '../validators'
import { defineTemplate } from './define'
import { greeting, supportBlocks, userName } from './shared'

/** Props of the built-in `dataExportReady` template. */
export interface DataExportReadyProps {
  /** Recipient's name for the greeting. Without it the greeting has no name. */
  readonly userName?: string | undefined
  /** Absolute http(s) link that downloads the export. */
  readonly downloadUrl: string
  /** How long the link works, in minutes, such as `10080` for 7 days. Without it the email does not mention expiry. */
  readonly expiresInMinutes?: number | undefined
  /** Absolute http(s) link to support. Without it the email points to the branding support address. */
  readonly supportUrl?: string | undefined
}

const props = z.strictObject(
  {
    userName,
    downloadUrl: httpUrl,
    expiresInMinutes: positiveInteger.optional(),
    supportUrl: httpUrl.optional(),
  },
  { error: objectError },
)
const schema: z.ZodType<z.output<typeof props>, DataExportReadyProps> = props

/**
 * Tells the account owner that the copy of their data they asked for, such as
 * under the GDPR, is ready to download.
 */
export const dataExportReady = defineTemplate({
  name: 'dataExportReady',
  schema,
  render: ({ props, ui, t, format, branding }) => ({
    subject: t('dataExportReady.subject'),
    preheader: t('dataExportReady.preheader'),
    body: [
      ui.heading(t('dataExportReady.heading')),
      greeting(ui, t, props.userName),
      ui.paragraph(t('dataExportReady.intro')),
      ui.button(t('dataExportReady.downloadButton'), props.downloadUrl),
      ui.linkFallback(props.downloadUrl),
      props.expiresInMinutes !== undefined &&
        ui.note(t('dataExportReady.expires', { duration: format.duration(props.expiresInMinutes) })),
      ui.note(t('dataExportReady.doNotShare')),
      ui.divider(),
      ...supportBlocks({ ui, t, branding }, props.supportUrl, {
        text: 'dataExportReady.notYou',
        button: 'dataExportReady.button',
        email: 'dataExportReady.notYouEmail',
      }),
    ],
  }),
})
