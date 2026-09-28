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
