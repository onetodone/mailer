import { MailerError } from '../errors'

const brand = Symbol.for('@onetodone/mailer/SafeHtml')

/**
 * Markup that is inserted into emails without escaping. Create it with the
 * {@link html} tag or with {@link raw}; convert it to a string with `toString()`.
 */
export class SafeHtml {
  readonly [brand] = true

  /** The markup. */
  readonly value: string

  /** @param value - Trusted markup. */
  constructor(value: string) {
    this.value = value
  }

  /** Returns the markup. */
  toString(): string {
    return this.value
  }
}

/**
 * A value accepted inside the {@link html} tag. Strings and numbers are
 * escaped, {@link SafeHtml} is inserted as-is, arrays are concatenated, and
 * `false`, `null` and `undefined` render nothing.
 */
export type HtmlValue = SafeHtml | string | number | false | null | undefined | readonly HtmlValue[]

// Checked by brand rather than `instanceof` so values created by the ESM and CJS
// builds of this package are interchangeable when both are loaded.
export function isSafeHtml(value: unknown): value is SafeHtml {
  return typeof value === 'object' && value !== null && brand in value && value[brand] === true
}

const escapes: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => escapes[char] ?? char)
}

function renderValue(value: HtmlValue): string {
  if (value === null || value === undefined || value === false) return ''
  if (typeof value === 'string') return escapeHtml(value)
  if (typeof value === 'number') return String(value)
  if (isSafeHtml(value)) return value.value
  return value.map(renderValue).join('')
}

/**
 * Tagged template for email markup. Every interpolated value is HTML-escaped
 * unless it is {@link SafeHtml}, so user input such as names cannot inject markup.
 *
 * @example
 * html`<p>Hello, ${user.name}!</p>`
 * html`<ul>${items.map((item) => html`<li>${item}</li>`)}</ul>`
 */
export function html(strings: TemplateStringsArray, ...values: readonly HtmlValue[]): SafeHtml {
  let markup = strings[0] ?? ''
  values.forEach((value, index) => {
    markup += renderValue(value) + (strings[index + 1] ?? '')
  })
  return new SafeHtml(markup)
}

/**
 * Marks trusted markup as {@link SafeHtml} so the {@link html} tag inserts it
 * without escaping. Never pass user input to it.
 *
 * @param markup - Trusted HTML.
 */
export function raw(markup: string): SafeHtml {
  return new SafeHtml(markup)
}

/**
 * Validates a link target and returns it in normalized form. Only absolute
 * `http:` and `https:` URLs pass; anything else, such as `javascript:`, `data:`
 * or a relative path, throws.
 *
 * @param url - The URL to check.
 * @returns The normalized URL (`URL.href`).
 * @throws {MailerError} With code `UNSAFE_URL`. The message never contains the
 * URL itself, because links often carry tokens.
 */
export function safeUrl(url: string | URL): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch (error) {
    throw new MailerError('UNSAFE_URL', 'Invalid URL: expected an absolute http: or https: URL.', { cause: error })
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new MailerError(
      'UNSAFE_URL',
      `Unsafe URL: expected an absolute http: or https: URL, received the "${parsed.protocol}" scheme.`,
    )
  }
  return parsed.href
}

const namedEntities: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (!body.startsWith('#')) return namedEntities[body.toLowerCase()] ?? entity
    const hex = body[1] === 'x' || body[1] === 'X'
    const codePoint = Number.parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
    return codePoint > 0 && codePoint <= 0x10ffff ? String.fromCodePoint(codePoint) : entity
  })
}

function stripTags(markup: string): string {
  return markup.replace(/<[^>]*>/g, '')
}

export function toPlainText(markup: SafeHtml): string {
  const text = markup.value
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s+/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/gi, '\n')
    .replace(
      /<a\b[^>]*?\bhref\s*=\s*(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi,
      (_match, _quote, href: string, label: string) => {
        const linkText = stripTags(label).trim()
        return linkText === '' || decodeEntities(linkText) === decodeEntities(href) ? href : `${linkText} (${href})`
      },
    )
  return decodeEntities(stripTags(text))
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}
