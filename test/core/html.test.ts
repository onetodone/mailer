import { describe, expect, it } from 'vitest'

import { escapeHtml, html, isSafeHtml, raw, SafeHtml, safeUrl, toPlainText } from '../../src/core/html'
import { MailerError } from '../../src/errors'
import { catchError } from '../support/catch-error'

describe('html', () => {
  it('escapes interpolated strings', () => {
    expect(html`${'<script>'}`.toString()).toBe('&lt;script&gt;')
  })

  it('escapes all HTML-significant characters', () => {
    expect(escapeHtml(`& < > " '`)).toBe('&amp; &lt; &gt; &quot; &#39;')
    expect(html`<a title="${`"><img src=x onerror=alert(1)>`}">x</a>`.toString()).toBe(
      '<a title="&quot;&gt;&lt;img src=x onerror=alert(1)&gt;">x</a>',
    )
  })

  it('inserts raw() markup without escaping', () => {
    expect(html`${raw('<b>bold</b>')}`.toString()).toBe('<b>bold</b>')
  })

  it('does not escape nested html twice', () => {
    const inner = html`<i>${'a & b'}</i>`
    expect(html`<p>${inner}</p>`.toString()).toBe('<p><i>a &amp; b</i></p>')
  })

  it('concatenates arrays and escapes their items', () => {
    const items = ['<1>', html`<li>2</li>`, ['3', raw('<br>')]]
    expect(html`${items}`.toString()).toBe('&lt;1&gt;<li>2</li>3<br>')
  })

  it('renders false, null and undefined as nothing', () => {
    const show = (flag: boolean) => flag && html`<b>b</b>`
    expect(html`a${show(false)}${null}${undefined}c`.toString()).toBe('ac')
    expect(html`a${show(true)}c`.toString()).toBe('a<b>b</b>c')
  })

  it('renders numbers, including zero', () => {
    expect(html`${0}-${42}-${1.5}`.toString()).toBe('0-42-1.5')
  })

  it('returns SafeHtml', () => {
    const result = html`<p></p>`
    expect(result).toBeInstanceOf(SafeHtml)
    expect(result.value).toBe('<p></p>')
    expect(String(result)).toBe('<p></p>')
  })
})

describe('isSafeHtml', () => {
  it('recognizes values from html and raw', () => {
    expect(isSafeHtml(html`x`)).toBe(true)
    expect(isSafeHtml(raw('x'))).toBe(true)
  })

  it('recognizes values created by another copy of the package', () => {
    const foreign = { [Symbol.for('@onetodone/mailer/SafeHtml')]: true, value: '<b>x</b>' }
    expect(isSafeHtml(foreign)).toBe(true)
  })

  it('rejects look-alike objects without the brand', () => {
    expect(isSafeHtml({ value: '<b>x</b>' })).toBe(false)
    expect(isSafeHtml('<b>x</b>')).toBe(false)
    expect(isSafeHtml(null)).toBe(false)
  })
})

describe('safeUrl', () => {
  it.each([
    ['https://example.com/verify?token=abc', 'https://example.com/verify?token=abc'],
    ['http://localhost:3000/reset', 'http://localhost:3000/reset'],
    ['  https://example.com/path  ', 'https://example.com/path'],
    ['HTTPS://Example.com', 'https://example.com/'],
  ])('accepts %j', (input, expected) => {
    expect(safeUrl(input)).toBe(expected)
  })

  it('accepts URL objects', () => {
    expect(safeUrl(new URL('https://example.com/a'))).toBe('https://example.com/a')
  })

  it('percent-encodes characters that could break out of markup', () => {
    expect(safeUrl('https://example.com/a"b<c>d')).toBe('https://example.com/a%22b%3Cc%3Ed')
  })

  it('throws a MailerError for javascript: URLs', () => {
    const error = catchError(() => safeUrl('javascript:alert(1)'))
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({ code: 'UNSAFE_URL' })
  })

  it.each([
    'JaVaScRiPt:alert(1)',
    '  javascript:alert(1)',
    'java\tscript:alert(1)',
    'java\nscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'mailto:user@example.com',
    'ftp://example.com/file',
    '/relative/path',
    '//example.com/path',
    'example.com/verify',
    '',
  ])('rejects %j with code UNSAFE_URL', (input) => {
    expect(() => safeUrl(input)).toThrow(expect.objectContaining({ name: 'MailerError', code: 'UNSAFE_URL' }))
  })

  it('keeps the URL out of the error message', () => {
    expect(catchError(() => safeUrl('example.com/verify?token=secret')).message).not.toContain('secret')
    const unsafe = catchError(() => safeUrl('javascript:secret()'))
    expect(unsafe.message).toContain('"javascript:" scheme')
    expect(unsafe.message).not.toContain('secret')
  })
})

describe('toPlainText', () => {
  it('strips tags and decodes entities', () => {
    expect(toPlainText(html`<b>${'Tom & Jerry'}</b> say ${'"hi"'}&nbsp;&#8212;&#x41;`)).toBe('Tom & Jerry say "hi" —A')
  })

  it('turns line breaks and block ends into newlines', () => {
    expect(toPlainText(raw('<p>One<br>Two<br/>Three</p><p>Four</p>'))).toBe('One\nTwo\nThree\nFour')
  })

  it('collapses source whitespace', () => {
    expect(toPlainText(raw('<p>\n  Hello\n   world  </p>'))).toBe('Hello world')
  })

  it('writes links as "text (url)"', () => {
    expect(toPlainText(raw('Open <a href="https://example.com/a?x=1&amp;y=2">the <b>app</b></a> now'))).toBe(
      'Open the app (https://example.com/a?x=1&y=2) now',
    )
  })

  it('writes a link whose text is its URL only once', () => {
    expect(toPlainText(raw('<a href="https://example.com/">https://example.com/</a>'))).toBe('https://example.com/')
  })

  it('writes mailto links as the bare address', () => {
    expect(toPlainText(raw('Write to <a href="mailto:help@example.com">help@example.com</a>.'))).toBe(
      'Write to help@example.com.',
    )
    expect(toPlainText(raw('<a href="MAILTO:help@example.com">Contact us</a>'))).toBe('Contact us (help@example.com)')
  })

  it('drops comments', () => {
    expect(toPlainText(raw('a<!--[if mso]>outlook<![endif]-->b'))).toBe('ab')
  })
})
