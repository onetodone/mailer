import { MailerError } from '../errors'
import { contentIdRule, isContentId } from './content-id'
import { html, raw as rawHtml, safeUrl, toPlainText, type SafeHtml } from './html'
import type { Theme } from './theme'

/** A piece of email content rendered both as HTML and as plain text. */
export interface Block {
  /** Markup with inline styles. */
  readonly html: SafeHtml
  /** Plain-text version; an empty string adds nothing to the text part. */
  readonly text: string
}

/** Texts the blocks use, resolved for one locale. */
export interface UiMessages {
  /** Line above the fallback link, such as "If the button doesn't work, copy this link into your browser:". */
  readonly linkFallback: string
}

/** Options for {@link Ui.heading}. */
export interface HeadingOptions {
  /** Heading level. Default `1`. */
  readonly level?: 1 | 2 | 3 | undefined
}

/** Options for {@link Ui.image}. */
export interface ImageOptions {
  /**
   * Text for screen readers and for clients that block images; the
   * plain-text version shows it too. Use `''` for a purely decorative image.
   */
  readonly alt: string
  /** Width in pixels, at most 534 (the width of the content). Default `534`. */
  readonly width?: number | undefined
  /**
   * Height in pixels, in the image's aspect ratio to `width`. Reserves space
   * while images are blocked; Outlook on Windows uses it as the height.
   */
  readonly height?: number | undefined
}

/**
 * Content blocks for email bodies, bound to the current theme and locale.
 * Plain strings are escaped; pass {@link SafeHtml} (from the `html` tag) to
 * include markup such as links. Each block returns a {@link Block}.
 */
export interface Ui {
  /** A heading. */
  readonly heading: (text: string | SafeHtml, options?: HeadingOptions) => Block
  /** A paragraph of body text. Line breaks in a string become `<br>`. */
  readonly paragraph: (content: string | SafeHtml) => Block
  /**
   * A call-to-action button that renders in every client, with a VML fallback for
   * Outlook on Windows.
   *
   * @throws {MailerError} With code `UNSAFE_URL` unless `url` is an absolute http(s) URL.
   */
  readonly button: (label: string, url: string | URL) => Block
  /**
   * The URL as a visible link for readers whose button does not work. Place it after {@link Ui.button}.
   *
   * @throws {MailerError} With code `UNSAFE_URL` unless `url` is an absolute http(s) URL.
   */
  readonly linkFallback: (url: string | URL) => Block
  /** A large monospace code, such as a one-time password. */
  readonly code: (value: string) => Block
  /**
   * An image from an absolute http(s) URL, or an attachment shown inline
   * through `cid:<cid>`. It shrinks to fit narrow screens. The plain-text
   * version shows the alt text.
   *
   * @throws {MailerError} With code `UNSAFE_URL` unless `src` is an absolute
   * http(s) URL or a `cid:` reference with a valid Content-ID.
   */
  readonly image: (src: string | URL, options: ImageOptions) => Block
  /** Muted secondary text, such as "If this wasn't you, ignore this email." */
  readonly note: (content: string | SafeHtml) => Block
  /** A horizontal rule. */
  readonly divider: () => Block
  /** Vertical space in pixels. Default `16`. */
  readonly spacer: (size?: number) => Block
  /** Trusted markup with its own plain-text version. Never pass user input as `html`. */
  readonly raw: (html: string | SafeHtml, text: string) => Block
}

export const fontFamily = rawHtml("-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif")
const monoFamily = rawHtml("ui-monospace,SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace")

const headingSizes = { 1: [24, 32], 2: [20, 28], 3: [16, 24] } as const

const buttonHeight = 44
const contentWidth = 534

// VML shapes need a fixed width, so it is estimated from the label length.
function buttonWidth(label: string): number {
  return Math.min(contentWidth, Math.max(160, label.length * 10 + 56))
}

function imageSource(src: string | URL): string {
  const value = String(src).trim()
  if (!/^cid:/i.test(value)) return safeUrl(src)
  const id = value.slice('cid:'.length)
  if (!isContentId(id)) {
    throw new MailerError('UNSAFE_URL', `Invalid image source: a cid: reference must use only ${contentIdRule}.`)
  }
  return `cid:${id}`
}

function validSize(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) && value >= 1 ? Math.round(value) : undefined
}

// Outlook on Windows ignores max-width, so a wider image would stretch the
// card. When the width is capped, the height shrinks by the same ratio.
function imageSize(options: ImageOptions): { width: number; height: number | undefined } {
  const requested = validSize(options.width) ?? contentWidth
  const width = Math.min(requested, contentWidth)
  const height = validSize(options.height)
  return { width, height: height === undefined ? undefined : Math.max(1, Math.round((height * width) / requested)) }
}

function inline(content: string | SafeHtml): Block {
  if (typeof content !== 'string') return { html: content, text: toPlainText(content) }
  const lines = content.split(/\r?\n/)
  return { html: html`${lines.map((line, index) => (index === 0 ? line : html`<br>${line}`))}`, text: content }
}

// Padding on a table cell is the only vertical spacing Outlook applies reliably.
function spaced(content: SafeHtml): SafeHtml {
  return html`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding:8px 0 24px;">${content}</td></tr></table>`
}

export function createUi({ theme, messages }: { theme: Theme; messages: UiMessages }): Ui {
  return {
    heading: (text, options = {}) => {
      const level = options.level === 2 || options.level === 3 ? options.level : 1
      const [fontSize, lineHeight] = headingSizes[level]
      const tag = rawHtml(`h${String(level)}`)
      const content = inline(text)
      return {
        html: html`<${tag} style="margin:0 0 16px;font-family:${fontFamily};font-size:${fontSize}px;line-height:${lineHeight}px;font-weight:700;color:${theme.text};mso-line-height-rule:exactly;">${content.html}</${tag}>`,
        text: content.text,
      }
    },

    paragraph: (text) => {
      const content = inline(text)
      return {
        html: html`<p style="margin:0 0 16px;font-family:${fontFamily};font-size:16px;line-height:24px;color:${theme.text};mso-line-height-rule:exactly;">${content.html}</p>`,
        text: content.text,
      }
    },

    button: (label, url) => {
      const href = safeUrl(url)
      const arcsize = Math.min(50, Math.round((theme.radius / buttonHeight) * 100))
      return {
        html: spaced(
          html`<!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:${buttonHeight}px;v-text-anchor:middle;width:${buttonWidth(label)}px;" arcsize="${arcsize}%" stroke="f" fillcolor="${theme.primary}"><w:anchorlock/><center style="color:${theme.primaryText};font-family:'Segoe UI',Arial,sans-serif;font-size:16px;font-weight:bold;">${label}</center></v:roundrect><![endif]--><!--[if !mso]><!--><a href="${href}" style="display:inline-block;padding:12px 28px;background-color:${theme.primary};border-radius:${theme.radius}px;color:${theme.primaryText};font-family:${fontFamily};font-size:16px;font-weight:700;line-height:20px;text-align:center;text-decoration:none;-webkit-text-size-adjust:none;">${label}</a><!--<![endif]-->`,
        ),
        text: `${label}: ${href}`,
      }
    },

    linkFallback: (url) => {
      const href = safeUrl(url)
      return {
        html: html`<p style="margin:0 0 16px;font-family:${fontFamily};font-size:13px;line-height:20px;color:${theme.mutedText};mso-line-height-rule:exactly;">${messages.linkFallback}<br><a href="${href}" style="color:${theme.primary};text-decoration:underline;word-break:break-all;">${href}</a></p>`,
        text: `${messages.linkFallback}\n${href}`,
      }
    },

    code: (value) => ({
      html: spaced(
        html`<table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td style="padding:12px 14px 12px 20px;background-color:${theme.background};border:1px solid ${theme.border};border-radius:${theme.radius}px;font-family:${monoFamily};font-size:28px;line-height:36px;font-weight:700;letter-spacing:6px;color:${theme.text};mso-line-height-rule:exactly;">${value}</td></tr></table>`,
      ),
      text: value,
    }),

    image: (src, options) => {
      const source = imageSource(src)
      const { width, height } = imageSize(options)
      const heightAttribute = height === undefined ? '' : html` height="${height}"`
      return {
        html: spaced(
          html`<img src="${source}" width="${width}"${heightAttribute} alt="${options.alt}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;font-family:${fontFamily};font-size:14px;line-height:20px;color:${theme.mutedText};">`,
        ),
        text: options.alt,
      }
    },

    note: (text) => {
      const content = inline(text)
      return {
        html: html`<p style="margin:0 0 16px;font-family:${fontFamily};font-size:14px;line-height:20px;color:${theme.mutedText};mso-line-height-rule:exactly;">${content.html}</p>`,
        text: content.text,
      }
    },

    divider: () => ({
      html: spaced(
        html`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td style="height:1px;font-size:1px;line-height:1px;background-color:${theme.border};mso-line-height-rule:exactly;">&nbsp;</td></tr></table>`,
      ),
      text: '---',
    }),

    spacer: (size = 16) => {
      const height = Number.isFinite(size) ? Math.max(0, Math.round(size)) : 16
      return {
        html: html`<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0"><tr><td height="${height}" style="height:${height}px;font-size:1px;line-height:${height}px;mso-line-height-rule:exactly;">&nbsp;</td></tr></table>`,
        text: '',
      }
    },

    raw: (markup, text) => ({ html: typeof markup === 'string' ? rawHtml(markup) : markup, text }),
  }
}

export function joinBlocks(blocks: readonly Block[]): Block {
  return {
    html: rawHtml(blocks.map((block) => block.html.value).join('\n')),
    text: blocks
      .map((block) => block.text)
      .filter((text) => text !== '')
      .join('\n\n'),
  }
}
