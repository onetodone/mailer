import { fontFamily, type Block } from './blocks'
import { html, raw, type SafeHtml } from './html'
import type { ResolvedBranding, Theme } from './theme'

/** Texts the layout uses, resolved for one locale. */
export interface LayoutMessages {
  /** Lead-in before the support email link, such as "Questions? Write to us at". */
  readonly footerSupport: string
  /** Text after the copyright notice, such as "All rights reserved." */
  readonly footerRights: string
}

/** Everything a layout receives to wrap the rendered email body. */
export interface LayoutContext {
  /** Validated branding with defaults applied. */
  readonly branding: ResolvedBranding
  /** Resolved theme tokens, the same object as `branding.theme`. */
  readonly theme: Theme
  /** Locale of the email, used for the `lang` attribute. */
  readonly locale: string
  /** Email subject, used for the document title. */
  readonly subject: string
  /** Inbox preview text shown after the subject. Empty for none. */
  readonly preheader: string
  /** The rendered body blocks. */
  readonly content: Block
  /** Layout texts for the current locale. */
  readonly messages: LayoutMessages
}

/** The complete email produced by a layout. */
export interface LayoutResult {
  /** The full HTML document. */
  readonly html: SafeHtml
  /** The full plain-text version. */
  readonly text: string
}

/** Wraps the rendered body in the surrounding document: header, footer, preheader. */
export type Layout = (context: LayoutContext) => LayoutResult

/**
 * Declares a custom layout with full type inference for its context. Build the
 * markup with the `html` tag so interpolated values stay escaped.
 *
 * @example
 * const layout = defineLayout(({ branding, content }) => ({
 *   html: html`<!DOCTYPE html><html><body>${content.html}</body></html>`,
 *   text: `${content.text}\n\n— ${branding.companyName}`,
 * }))
 */
export function defineLayout(layout: Layout): Layout {
  return layout
}

// Invisible characters after the preheader keep clients from filling the inbox
// preview with the start of the body text.
const preheaderFiller = raw('&#847;&zwnj;&nbsp;'.repeat(60))

function copyright({ branding, messages }: LayoutContext, year: number): string {
  const name = /[.!?]$/.test(branding.companyName) ? branding.companyName : `${branding.companyName}.`
  return [`© ${String(year)} ${name}`, messages.footerRights].filter((part) => part !== '').join(' ')
}

function header({ branding, theme }: LayoutContext): SafeHtml {
  if (branding.logoUrl === undefined) {
    return html`<a href="${branding.appUrl}" style="font-family:${fontFamily};font-size:20px;line-height:28px;font-weight:700;color:${theme.text};text-decoration:none;">${branding.companyName}</a>`
  }
  const height = branding.logoHeight === undefined ? '' : html` height="${branding.logoHeight}"`
  return html`<a href="${branding.appUrl}" style="text-decoration:none;"><img src="${branding.logoUrl}" width="${branding.logoWidth}"${height} alt="${branding.companyName}" style="display:block;margin:0 auto;width:${branding.logoWidth}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;font-family:${fontFamily};font-size:20px;line-height:28px;font-weight:700;color:${theme.text};"></a>`
}

function footer(context: LayoutContext, year: number): SafeHtml {
  const { branding, theme, messages } = context
  const paragraph = (content: SafeHtml | string) =>
    html`<p style="margin:0 0 8px;font-family:${fontFamily};font-size:13px;line-height:20px;text-align:center;color:${theme.mutedText};mso-line-height-rule:exactly;">${content}</p>`
  const lines = [
    branding.footerText !== undefined && paragraph(branding.footerText),
    paragraph(
      html`${messages.footerSupport} <a href="mailto:${branding.supportEmail}" style="color:${theme.mutedText};text-decoration:underline;">${branding.supportEmail}</a>`,
    ),
    paragraph(copyright(context, year)),
  ]
  return raw(
    lines
      .filter((line) => line !== false)
      .map((line) => line.value)
      .join('\n'),
  )
}

function plainText(context: LayoutContext, year: number): string {
  const { branding, content, messages } = context
  const footerLines = [
    branding.footerText,
    `${messages.footerSupport} ${branding.supportEmail}`,
    copyright(context, year),
  ].filter((line) => line !== undefined)
  return [branding.companyName, content.text, ['--', ...footerLines].join('\n')]
    .filter((part) => part !== '')
    .join('\n\n')
}

/**
 * The built-in layout: a centered 600px table-based card with inline styles,
 * the logo (or company name) on top and a footer with the footer text, a
 * support link and a copyright line. Includes a hidden preheader and declares
 * light and dark color scheme support.
 */
export const defaultLayout: Layout = (context) => {
  const { theme } = context
  const year = new Date().getFullYear()
  const markup = html`<!DOCTYPE html>
<html lang="${context.locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no, url=no">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${context.subject}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table,td,p,a,h1,h2,h3,center{font-family:'Segoe UI',Arial,sans-serif !important;}</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;word-spacing:normal;background-color:${theme.background};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
${context.preheader !== '' && html`<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;color:${theme.background};mso-hide:all;">${context.preheader}${preheaderFiller}</div>`}
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:${theme.background};">
<tr>
<td align="center" style="padding:32px 12px;">
<!--[if mso]><table role="presentation" width="600" border="0" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;">
<tr>
<td align="center" style="padding:0 0 24px;">${header(context)}</td>
</tr>
<tr>
<td style="padding:32px 32px 16px;background-color:${theme.surface};border:1px solid ${theme.border};border-radius:${theme.radius}px;text-align:left;font-family:${fontFamily};font-size:16px;line-height:24px;color:${theme.text};">
${context.content.html}
</td>
</tr>
<tr>
<td align="center" style="padding:24px 16px 0;">
${footer(context, year)}
</td>
</tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td>
</tr>
</table>
</body>
</html>
`
  return { html: markup, text: plainText(context, year) }
}
