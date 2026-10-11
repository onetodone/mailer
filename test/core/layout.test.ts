import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createUi, joinBlocks } from '../../src/core/blocks'
import { html } from '../../src/core/html'
import { defaultLayout, defineLayout, type LayoutContext } from '../../src/core/layout'
import type { Branding } from '../../src/core/theme'
import { resolveBranding } from '../../src/core/theme-schema'

const brandingInput: Branding = {
  companyName: 'My App',
  appUrl: 'https://myapp.loc',
  supportEmail: 'support@myapp.loc',
  footerText: 'You received this email because you signed up for My App.',
  theme: { primary: '#3b82f6' },
}

function context(input: Branding, overrides: Partial<LayoutContext> = {}): LayoutContext {
  const branding = resolveBranding(input)
  const ui = createUi({
    theme: branding.theme,
    messages: { linkFallback: "If the button doesn't work, copy this link into your browser:" },
  })
  const verifyUrl = 'https://myapp.loc/verify?token=abc123'
  return {
    branding,
    theme: branding.theme,
    locale: 'en',
    dir: 'ltr',
    subject: 'Confirm your email',
    preheader: 'One click to finish signing up for My App',
    content: joinBlocks([
      ui.heading('Confirm your email'),
      ui.paragraph('Hi Lizzie,\nthanks for signing up. Confirm your email address to activate your account.'),
      ui.button('Confirm email', verifyUrl),
      ui.linkFallback(verifyUrl),
      ui.divider(),
      ui.note("If you didn't create an account, you can ignore this email."),
    ]),
    messages: { footerSupport: 'Questions? Write to us at', footerRights: 'All rights reserved.' },
    ...overrides,
  }
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-05-04T12:00:00Z'))
})

afterAll(() => {
  vi.useRealTimers()
})

describe('defaultLayout', () => {
  it('matches the snapshot with a logo', async () => {
    const result = defaultLayout(
      context({ ...brandingInput, logoUrl: 'https://myapp.loc/logo.png', logoWidth: 140, logoHeight: 36 }),
    )
    await expect(result.html.toString()).toMatchFileSnapshot('./__snapshots__/layout-with-logo.html')
    await expect(result.text).toMatchFileSnapshot('./__snapshots__/layout-with-logo.txt')
  })

  it('matches the snapshot without a logo', async () => {
    const result = defaultLayout(context(brandingInput))
    await expect(result.html.toString()).toMatchFileSnapshot('./__snapshots__/layout-without-logo.html')
    await expect(result.text).toMatchFileSnapshot('./__snapshots__/layout-without-logo.txt')
  })

  it('is a table-based document limited to 600px', () => {
    const { value } = defaultLayout(context(brandingInput)).html
    expect(value).toMatch(/^<!DOCTYPE html>\n<html lang="en" /)
    expect(value).toContain('<table role="presentation" width="100%"')
    expect(value).toContain('style="max-width:600px;"')
    expect(value).toContain('<!--[if mso]><table role="presentation" width="600"')
  })

  it('declares light and dark color scheme support', () => {
    const { value } = defaultLayout(context(brandingInput)).html
    expect(value).toContain('<meta name="color-scheme" content="light dark">')
    expect(value).toContain('<meta name="supported-color-schemes" content="light dark">')
  })

  it('keeps <style> inside the Outlook-only conditional comment', () => {
    const { value } = defaultLayout(context(brandingInput)).html
    const withoutMso = value.replace(/<!--\[if mso\]>[\s\S]*?<!\[endif\]-->/g, '')
    expect(withoutMso).not.toContain('<style')
  })

  it('hides the preheader and escapes it', () => {
    const { value } = defaultLayout(context(brandingInput, { preheader: 'Tom & <Jerry>' })).html
    expect(value).toMatch(/<div style="display:none;[^"]*mso-hide:all;">Tom &amp; &lt;Jerry&gt;&#847;/)
  })

  it('omits the preheader element when it is empty', () => {
    const { value } = defaultLayout(context(brandingInput, { preheader: '' })).html
    expect(value).not.toContain('display:none')
  })

  it('uses the subject as the document title and the locale as lang', () => {
    const { value } = defaultLayout(context(brandingInput, { subject: 'Сброс <пароля>', locale: 'ru' })).html
    expect(value).toContain('<title>Сброс &lt;пароля&gt;</title>')
    expect(value).toContain('<html lang="ru" ')
  })

  it('shows the logo with explicit dimensions and the company name as alt text', () => {
    const { value } = defaultLayout(
      context({ ...brandingInput, companyName: 'Tom & Jerry', logoUrl: 'https://myapp.loc/logo.png' }),
    ).html
    expect(value).toContain(
      '<a href="https://myapp.loc/" style="text-decoration:none;"><img src="https://myapp.loc/logo.png" width="120" alt="Tom &amp; Jerry"',
    )
    expect(value).not.toContain(' height="')
  })

  it('shows the company name when there is no logo', () => {
    const { value } = defaultLayout(context({ ...brandingInput, companyName: '<My App>' })).html
    expect(value).not.toContain('<img')
    expect(value).toMatch(/<a href="https:\/\/myapp\.loc\/" style="[^"]*font-size:20px;[^"]*">&lt;My App&gt;<\/a>/)
  })

  it('renders the footer text, support link and copyright', () => {
    const { value } = defaultLayout(context(brandingInput)).html
    expect(value).toContain('You received this email because you signed up for My App.</p>')
    expect(value).toContain(
      'Questions? Write to us at <a href="mailto:support@myapp.loc" style="color:#71717a;text-decoration:underline;">support@myapp.loc</a>',
    )
    expect(value).toContain('© 2026 My App. All rights reserved.</p>')
  })

  it('omits the footer text when there is none', () => {
    const result = defaultLayout(context({ ...brandingInput, footerText: undefined }))
    expect(result.html.value).not.toContain('You received this email')
    expect(result.text).not.toContain('You received this email')
  })

  it('escapes the footer', () => {
    const { value } = defaultLayout(
      context(
        { ...brandingInput, footerText: '<b>Hi</b>' },
        { messages: { footerSupport: 'Help & support:', footerRights: '<rights>' } },
      ),
    ).html
    expect(value).toContain('&lt;b&gt;Hi&lt;/b&gt;')
    expect(value).toContain('Help &amp; support: <a')
    expect(value).toContain('&lt;rights&gt;')
  })

  it('does not double the period after a company name that ends with one', () => {
    const result = defaultLayout(context({ ...brandingInput, companyName: 'MyApp Inc.' }))
    expect(result.text).toContain('© 2026 MyApp Inc. All rights reserved.')
  })

  it('builds the plain-text version from the content and footer', () => {
    const { text } = defaultLayout(context(brandingInput, { content: { html: html`<p>Body</p>`, text: 'Body' } }))
    expect(text).toBe(
      [
        'My App',
        'Body',
        '--\nYou received this email because you signed up for My App.\nQuestions? Write to us at support@myapp.loc\n© 2026 My App. All rights reserved.',
      ].join('\n\n'),
    )
  })
})

describe('defineLayout', () => {
  it('returns the layout unchanged', () => {
    const layout = defineLayout(({ branding, content }) => ({
      html: html`<main>${content.html}</main>`,
      text: `${content.text}\n\n— ${branding.companyName}`,
    }))
    const result = layout(context(brandingInput, { content: { html: html`<p>Hi</p>`, text: 'Hi' } }))
    expect(result.html.value).toBe('<main><p>Hi</p></main>')
    expect(result.text).toBe('Hi\n\n— My App')
    expect(defineLayout(defaultLayout)).toBe(defaultLayout)
  })
})

describe('defaultLayout right to left', () => {
  const rtlUi = createUi({
    theme: resolveBranding(brandingInput).theme,
    messages: { linkFallback: 'إذا لم يعمل الزر، انسخ هذا الرابط إلى متصفحك:' },
    dir: 'rtl',
  })
  const verifyUrl = 'https://myapp.loc/verify?token=abc123'
  const rtlContext = (input: Branding = brandingInput) =>
    context(input, {
      locale: 'ar',
      dir: 'rtl',
      subject: 'رمز التحقق الخاص بك',
      preheader: 'استخدم هذا الرمز للمتابعة في My App.',
      content: joinBlocks([
        rtlUi.heading('رمز التحقق الخاص بك'),
        rtlUi.paragraph('أدخل هذا الرمز في My App للمتابعة:'),
        rtlUi.code('123 456'),
        rtlUi.button('تأكيد البريد الإلكتروني', verifyUrl),
        rtlUi.linkFallback(verifyUrl),
        rtlUi.image('https://myapp.loc/banner.png', { alt: 'لافتة', width: 534, height: 200 }),
        rtlUi.note('إذا لم تطلب رمزًا، تجاهل هذه الرسالة.'),
      ]),
      messages: { footerSupport: 'أسئلة؟ راسلنا على', footerRights: 'جميع الحقوق محفوظة.' },
    })

  it('matches the snapshot', async () => {
    const result = defaultLayout(rtlContext({ ...brandingInput, logoUrl: 'https://myapp.loc/logo.png' }))
    await expect(result.html.toString()).toMatchFileSnapshot('./__snapshots__/layout-rtl.html')
    await expect(result.text).toMatchFileSnapshot('./__snapshots__/layout-rtl.txt')
  })

  it('sets the direction on the document and on the content table, and aligns the card right', () => {
    const { value } = defaultLayout(rtlContext()).html

    expect(value).toContain('<html lang="ar" dir="rtl" ')
    expect(value).toMatch(/<table role="presentation" dir="rtl" [^>]*style="max-width:600px;">/)
    expect(value).toMatch(/border-radius:8px;text-align:right;/)
    expect(value).not.toContain('text-align:left')
  })

  it('aligns spaced blocks right and keeps codes and links left to right', () => {
    const { value } = defaultLayout(rtlContext()).html

    expect(value.match(/<td align="right" style="padding:8px 0 24px;">/g)).toHaveLength(3)
    expect(value).toMatch(/<td dir="ltr" style="padding:12px 14px 12px 20px;[^"]*">123 456<\/td>/)
    expect(value).toContain(`<a href="${verifyUrl}" dir="ltr" style=`)
  })

  it('adds no direction markup left to right', () => {
    const { value } = defaultLayout(context(brandingInput)).html

    expect(value).not.toMatch(/\sdir=|\salign="right"/)
    expect(value).toContain('text-align:left;')
  })
})
