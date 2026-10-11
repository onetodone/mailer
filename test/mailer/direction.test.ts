import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { html } from '../../src/core/html'
import { defineLayout, type LayoutContext } from '../../src/core/layout'
import { createMailer } from '../../src/mailer'
import { defineTemplate } from '../../src/templates/define'
import { memoryTransport } from '../../src/transports/memory'
import { branding, from } from '../support/mailer'

const arabic = {
  common: {
    footerSupport: 'أسئلة؟ راسلنا على',
    footerRights: 'جميع الحقوق محفوظة.',
  },
  otpCode: {
    subject: 'رمز التحقق الخاص بك',
    heading: 'رمز التحقق الخاص بك',
    intro: 'أدخل هذا الرمز في {companyName} للمتابعة:',
  },
}

const direction = defineTemplate({
  name: 'direction',
  schema: z.object({}),
  render: ({ dir, ui }) => ({
    subject: 'Direction',
    body: [ui.raw(html`<p style="text-align:${dir === 'rtl' ? 'right' : 'left'};">${dir}</p>`, dir)],
  }),
})

function setup() {
  const contexts: LayoutContext[] = []
  const layout = defineLayout((context) => {
    contexts.push(context)
    return { html: html`<main dir="${context.dir}">${context.content.html}</main>`, text: context.content.text }
  })
  const mailer = createMailer({
    transport: memoryTransport(),
    from,
    branding,
    messages: { ar: arabic, he: {} },
    templates: { direction },
  })
  const withLayout = createMailer({
    transport: memoryTransport(),
    from,
    branding,
    layout,
    messages: { ar: arabic },
    templates: { direction },
  })
  return { mailer, withLayout, contexts }
}

describe('text direction', () => {
  it('renders a right-to-left locale right to left', async () => {
    const { mailer } = setup()

    const email = await mailer.render('otpCode', { locale: 'ar', props: { code: '123 456' } })

    expect(email.subject).toBe('رمز التحقق الخاص بك')
    expect(email.html).toContain('<html lang="ar" dir="rtl" ')
    expect(email.html).toMatch(/<table role="presentation" dir="rtl" /)
    expect(email.html).toContain('text-align:right;')
    expect(email.html).toMatch(/<td dir="ltr" [^>]*>123 456<\/td>/)
  })

  it('follows the locale, not the texts', async () => {
    const { mailer } = setup()

    const hebrew = await mailer.render('passwordChanged', { locale: 'he' })
    const english = await mailer.render('passwordChanged', { locale: 'en' })

    expect(hebrew.html).toContain('<html lang="he" dir="rtl" ')
    expect(english.html).not.toMatch(/\sdir=/)
  })

  it('passes the direction to templates and layouts', async () => {
    const { mailer, withLayout, contexts } = setup()

    expect((await mailer.render('direction', { locale: 'ar' })).text).toContain('rtl')
    expect((await mailer.render('direction')).text).toContain('ltr')
    const email = await withLayout.render('direction', { locale: 'ar' })
    expect(email.html).toBe('<main dir="rtl"><p style="text-align:right;">rtl</p></main>')
    expect(contexts.map((context) => context.dir)).toEqual(['rtl'])
  })
})
