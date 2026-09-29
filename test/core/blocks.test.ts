import { describe, expect, it } from 'vitest'

import { createUi, joinBlocks, type Block, type Ui } from '../../src/core/blocks'
import { html, isSafeHtml, raw } from '../../src/core/html'
import { resolveTheme } from '../../src/core/theme'
import { MailerError } from '../../src/errors'
import { catchError } from '../support/catch-error'

const theme = resolveTheme({ primary: '#7c3aed', radius: 11 })
const ui = createUi({ theme, messages: { linkFallback: 'Button not working? Open this link:' } })
const url = 'https://myapp.loc/verify?token=abc&next=%2Fhome'
const evil = '<img src=x onerror=alert(1)>'

const everyBlock: [name: keyof Ui, render: (ui: Ui) => Block][] = [
  ['heading', (ui) => ui.heading('Confirm your email')],
  ['paragraph', (ui) => ui.paragraph('Thanks for signing up.')],
  ['button', (ui) => ui.button('Confirm email', url)],
  ['linkFallback', (ui) => ui.linkFallback(url)],
  ['code', (ui) => ui.code('123456')],
  ['image', (ui) => ui.image('https://myapp.loc/chart.png', { alt: 'Sales chart' })],
  ['note', (ui) => ui.note("If this wasn't you, ignore this email.")],
  ['divider', (ui) => ui.divider()],
  ['spacer', (ui) => ui.spacer()],
  ['raw', (ui) => ui.raw('<b>Hi</b>', 'Hi')],
]

describe('blocks', () => {
  it('cover every Ui method', () => {
    expect(everyBlock.map(([name]) => name).sort()).toEqual(Object.keys(ui).sort())
  })

  it.each(everyBlock)('%s returns html and text', (_name, render) => {
    const block = render(ui)
    expect(isSafeHtml(block.html)).toBe(true)
    expect(block.html.value).not.toBe('')
    expect(typeof block.text).toBe('string')
  })

  it.each<[string, (ui: Ui) => Block]>([
    ['heading', (ui) => ui.heading(evil)],
    ['paragraph', (ui) => ui.paragraph(evil)],
    ['button label', (ui) => ui.button(evil, url)],
    ['code', (ui) => ui.code(evil)],
    ['note', (ui) => ui.note(evil)],
  ])('%s escapes user text', (_name, render) => {
    const block = render(ui)
    expect(block.html.value).not.toContain('<img')
    expect(block.html.value).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(block.text).toContain(evil)
  })
})

describe('heading', () => {
  it.each([
    [undefined, 'h1', '24px'],
    [1, 'h1', '24px'],
    [2, 'h2', '20px'],
    [3, 'h3', '16px'],
  ] as const)('level %s renders <%s> at %s', (level, tag, size) => {
    const { html: markup, text } = ui.heading('Title', level === undefined ? undefined : { level })
    expect(markup.value).toMatch(new RegExp(`^<${tag} style="[^"]*font-size:${size};[^"]*">Title</${tag}>$`))
    expect(text).toBe('Title')
  })

  it('falls back to level 1 for unsupported levels', () => {
    expect(ui.heading('Title', { level: 7 as never }).html.value).toMatch(/^<h1 /)
  })
})

describe('paragraph', () => {
  it('uses the theme text color', () => {
    expect(ui.paragraph('Hello').html.value).toContain(`color:${theme.text};`)
  })

  it('turns line breaks in strings into <br>', () => {
    const block = ui.paragraph('Line one\nLine <two>\r\nLine three')
    expect(block.html.value).toContain('Line one<br>Line &lt;two&gt;<br>Line three')
    expect(block.text).toBe('Line one\nLine <two>\r\nLine three')
  })

  it('accepts SafeHtml and derives the text version from it', () => {
    const block = ui.paragraph(html`Read the <a href="https://myapp.loc/terms">terms</a> &amp; ${'<rules>'}.`)
    expect(block.html.value).toContain('Read the <a href="https://myapp.loc/terms">terms</a> &amp; &lt;rules&gt;.')
    expect(block.text).toBe('Read the terms (https://myapp.loc/terms) & <rules>.')
  })
})

describe('button', () => {
  const block = ui.button('Confirm email', url)
  const escapedUrl = 'https://myapp.loc/verify?token=abc&amp;next=%2Fhome'

  it('renders a VML roundrect for Outlook', () => {
    expect(block.html.value).toContain('<!--[if mso]><v:roundrect')
    expect(block.html.value).toContain(`href="${escapedUrl}"`)
    expect(block.html.value).toContain('fillcolor="#7c3aed"')
    expect(block.html.value).toContain('arcsize="25%"')
    expect(block.html.value).toContain('<w:anchorlock/>')
    expect(block.html.value).toContain('</v:roundrect><![endif]-->')
  })

  it('renders a styled link for every other client', () => {
    expect(block.html.value).toContain(`<!--[if !mso]><!--><a href="${escapedUrl}"`)
    expect(block.html.value).toContain('background-color:#7c3aed;border-radius:11px;color:#ffffff;')
    expect(block.html.value).toContain('>Confirm email</a><!--<![endif]-->')
  })

  it('sizes the VML shape from the label', () => {
    const width = (label: string) => /width:(\d+)px;" arcsize/.exec(ui.button(label, url).html.value)?.[1]
    expect(width('OK')).toBe('160')
    expect(width('Confirm email')).toBe('186')
    expect(width('x'.repeat(100))).toBe('534')
  })

  it('writes the label and URL to the text version', () => {
    expect(block.text).toBe(`Confirm email: ${url}`)
  })

  it('rejects unsafe URLs', () => {
    const error = catchError(() => ui.button('Click', 'javascript:alert(1)'))
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({ code: 'UNSAFE_URL' })
  })
})

describe('linkFallback', () => {
  it('shows the intro and the URL as a link', () => {
    const block = ui.linkFallback(url)
    expect(block.html.value).toContain('Button not working? Open this link:<br><a href=')
    expect(block.html.value).toContain('word-break:break-all;')
    expect(block.text).toBe(`Button not working? Open this link:\n${url}`)
  })

  it('escapes the intro text', () => {
    const custom = createUi({ theme, messages: { linkFallback: 'Use <this>:' } })
    expect(custom.linkFallback(url).html.value).toContain('Use &lt;this&gt;:<br>')
  })

  it('rejects unsafe URLs', () => {
    expect(() => ui.linkFallback('data:text/html,hi')).toThrow(MailerError)
  })
})

describe('code', () => {
  it('renders a large monospace value', () => {
    const block = ui.code('482913')
    expect(block.html.value).toMatch(/font-family:ui-monospace[^"]*font-size:28px[^"]*">482913<\/td>/)
    expect(block.text).toBe('482913')
  })
})

describe('image', () => {
  const imageSize = (block: Block) => {
    const tag = /<img [^>]*>/.exec(block.html.value)?.[0] ?? ''
    return {
      width: /\swidth="(\d+)"/.exec(tag)?.[1],
      height: /\sheight="(\d+)"/.exec(tag)?.[1],
      styleWidth: /[";]width:(\d+)px;/.exec(tag)?.[1],
    }
  }

  it('renders an email-safe image from an http(s) URL', () => {
    const block = ui.image('https://myapp.loc/chart.png?v=2&size=large', { alt: 'Sales in May', width: 300 })
    expect(block.html.value).toContain(
      '<img src="https://myapp.loc/chart.png?v=2&amp;size=large" width="300" alt="Sales in May" style="display:block;width:300px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;',
    )
    expect(block.html.value).toContain(`color:${theme.mutedText};">`)
    expect(block.html.value).toMatch(/^<table role="presentation"/)
    expect(block.text).toBe('Sales in May')
  })

  it('shows an attachment through a cid: reference', () => {
    expect(ui.image('cid:qr-code@myapp.loc', { alt: 'QR code' }).html.value).toContain(
      '<img src="cid:qr-code@myapp.loc" ',
    )
    expect(ui.image(' CID:qr_1.png ', { alt: 'QR code' }).html.value).toContain('<img src="cid:qr_1.png" ')
    expect(ui.image(new URL('cid:qr'), { alt: 'QR code' }).html.value).toContain('<img src="cid:qr" ')
  })

  it('normalizes URLs like safeUrl', () => {
    expect(ui.image(new URL('HTTPS://MyApp.loc/a b.png'), { alt: '' }).html.value).toContain(
      'src="https://myapp.loc/a%20b.png"',
    )
  })

  it('escapes the alt text', () => {
    const block = ui.image('cid:x', { alt: '" onerror="alert(1)' })
    expect(block.html.value).toContain(' alt="&quot; onerror=&quot;alert(1)" ')
    expect(block.text).toBe('" onerror="alert(1)')
  })

  it('keeps an empty alt for decorative images and adds nothing to the text', () => {
    const block = ui.image('cid:divider', { alt: '' })
    expect(block.html.value).toContain(' alt="" ')
    expect(block.text).toBe('')
  })

  it('defaults to the full content width without a height', () => {
    expect(imageSize(ui.image('cid:banner', { alt: 'Banner' }))).toEqual({
      width: '534',
      height: undefined,
      styleWidth: '534',
    })
  })

  it('sets the height attribute when given', () => {
    expect(imageSize(ui.image('cid:qr', { alt: 'QR code', width: 200, height: 200 }))).toEqual({
      width: '200',
      height: '200',
      styleWidth: '200',
    })
  })

  it('caps the width at the content width and scales the height with it', () => {
    expect(imageSize(ui.image('cid:wide', { alt: 'Wide', width: 1068, height: 400 }))).toEqual({
      width: '534',
      height: '200',
      styleWidth: '534',
    })
  })

  it.each([
    [
      { width: 199.6, height: 99.5 },
      { width: '200', height: '100' },
    ],
    [{ width: 0 }, { width: '534', height: undefined }],
    [
      { width: Number.NaN, height: -1 },
      { width: '534', height: undefined },
    ],
    [{ width: Number.POSITIVE_INFINITY }, { width: '534', height: undefined }],
  ])('sanitizes the size %j', (size, expected) => {
    expect(imageSize(ui.image('cid:x', { alt: 'x', ...size }))).toMatchObject(expected)
  })

  it.each([
    'javascript:alert(1)',
    'data:image/png;base64,iVBORw0KGgo=',
    '/images/logo.png',
    'cid:',
    'cid:logo<script>',
    'cid:logo"onerror=alert(1)',
    'cid:%6Cogo',
  ])('rejects the source %j', (src) => {
    const error = catchError(() => ui.image(src, { alt: 'x' }))
    expect(error).toBeInstanceOf(MailerError)
    expect(error).toMatchObject({ code: 'UNSAFE_URL' })
  })

  it('explains what a cid: reference may contain', () => {
    expect(catchError(() => ui.image('cid:a b', { alt: 'x' })).message).toBe(
      'Invalid image source: a cid: reference must use only ASCII letters, digits, ".", "_", "-" and "@".',
    )
  })
})

describe('note', () => {
  it('uses the muted text color', () => {
    const block = ui.note('Ignore this email if it was not you.')
    expect(block.html.value).toContain(`color:${theme.mutedText};`)
    expect(block.text).toBe('Ignore this email if it was not you.')
  })
})

describe('divider', () => {
  it('draws a one-pixel line in the border color', () => {
    expect(ui.divider().html.value).toContain(
      `height:1px;font-size:1px;line-height:1px;background-color:${theme.border};`,
    )
    expect(ui.divider().text).toBe('---')
  })
})

describe('spacer', () => {
  it('defaults to 16px and adds nothing to the text', () => {
    const block = ui.spacer()
    expect(block.html.value).toContain('height="16" style="height:16px;')
    expect(block.text).toBe('')
  })

  it.each([
    [32, '32'],
    [7.6, '8'],
    [-5, '0'],
    [Number.NaN, '16'],
  ])('renders size %s as %spx', (size, expected) => {
    expect(ui.spacer(size).html.value).toContain(`height="${expected}"`)
  })
})

describe('raw', () => {
  it('inserts markup unchanged with the given text', () => {
    expect(ui.raw('<b>Hi</b>', 'Hi')).toEqual({ html: raw('<b>Hi</b>'), text: 'Hi' })
    const markup = html`<i>${'x'}</i>`
    expect(ui.raw(markup, 'x').html).toBe(markup)
  })
})

describe('joinBlocks', () => {
  it('joins html and separates non-empty text with blank lines', () => {
    const joined = joinBlocks([ui.heading('Hi'), ui.spacer(), ui.paragraph('Body'), ui.raw('<br>', '')])
    expect(joined.html.value.split('\n')).toHaveLength(4)
    expect(joined.text).toBe('Hi\n\nBody')
  })

  it('handles an empty list', () => {
    expect(joinBlocks([])).toEqual({ html: raw(''), text: '' })
  })
})
