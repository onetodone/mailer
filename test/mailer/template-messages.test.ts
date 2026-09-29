import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { html } from '../../src/core/html'
import type { MessagesOverrides } from '../../src/i18n'
import { createMailer } from '../../src/mailer'
import { defineTemplate } from '../../src/templates/define'
import { memoryTransport } from '../../src/transports/memory'
import { branding, from } from '../support/mailer'

const to = 'lizzie@example.com'

const invoice = defineTemplate({
  name: 'invoice',
  schema: z.strictObject({ number: z.string(), userName: z.string().optional() }),
  messages: {
    en: {
      subject: 'Invoice #{number}',
      intro: 'Your invoice from {companyName} is attached.',
      help: 'Questions? Write to {email}.',
    },
    be: { subject: 'Рахунак №{number}', intro: 'Рахунак ад {companyName} у ўкладанні.' },
  },
  render: ({ props, ui, t, branding: { supportEmail } }) => ({
    subject: t('invoice.subject', { number: props.number }),
    body: [
      ui.paragraph(
        props.userName === undefined ? t('common.greetingAnonymous') : t('common.greeting', { name: props.userName }),
      ),
      ui.paragraph(t('invoice.intro')),
      ui.paragraph(t.html('invoice.help', { email: html`<a href="mailto:${supportEmail}">${supportEmail}</a>` })),
    ],
  }),
})

const receiptTexts = { subject: 'Your receipt', intro: 'Thanks for your order.' }

const receipt = defineTemplate({
  name: 'receipt',
  schema: z.strictObject({}),
  messages: { en: receiptTexts },
  render: ({ ui, t }) => ({ subject: t('receipt.subject'), body: [ui.paragraph(t('receipt.intro'))] }),
})

const resetPassword = defineTemplate({
  name: 'resetPassword',
  schema: z.strictObject({ code: z.string() }),
  messages: { en: { subject: 'Your reset code', intro: 'Enter this code to choose a new password.' } },
  render: ({ props, ui, t }) => ({
    subject: t('resetPassword.subject'),
    body: [ui.paragraph(t('resetPassword.intro')), ui.code(props.code)],
  }),
})

function setup(messages?: MessagesOverrides<{ invoice: typeof invoice }>) {
  const transport = memoryTransport()
  const mailer = createMailer({ transport, from, branding, templates: { invoice }, messages })
  return { transport, mailer }
}

describe('template texts', () => {
  it('renders the texts of the template in each locale', async () => {
    const { mailer } = setup()

    const en = await mailer.render('invoice', { props: { number: '42', userName: 'Lizzie' } })
    const be = await mailer.render('invoice', { locale: 'be', props: { number: '42' } })

    expect(en.subject).toBe('Invoice #42')
    expect(en.text).toContain('Hi Lizzie,')
    expect(en.text).toContain('Your invoice from My App is attached.')
    expect(be.subject).toBe('Рахунак №42')
    expect(be.text).toContain('Рахунак ад My App у ўкладанні.')
  })

  it('falls back to English for each text a locale leaves out', async () => {
    const { mailer } = setup()

    const be = await mailer.render('invoice', { locale: 'be', props: { number: '42' } })

    expect(be.text).toContain('Questions? Write to support@myapp.loc.')
    expect(be.html).toContain('Questions? Write to <a href="mailto:support@myapp.loc">support@myapp.loc</a>.')
  })

  it('uses the common texts of the locale', async () => {
    const { mailer } = setup()

    const be = await mailer.render('invoice', { locale: 'be', props: { number: '42', userName: 'Ліза' } })

    expect(be.text).toContain('Вітаем, Ліза!')
  })

  it('applies overrides, with the English ones reaching the fallback', async () => {
    const { mailer } = setup({
      en: { invoice: { help: 'Need help? Write to {email}.' } },
      be: { invoice: { subject: 'Ваш рахунак №{number}' } },
    })

    const en = await mailer.render('invoice', { props: { number: '7' } })
    const be = await mailer.render('invoice', { locale: 'be', props: { number: '7' } })

    expect(en.subject).toBe('Invoice #7')
    expect(en.text).toContain('Need help? Write to support@myapp.loc')
    expect(be.subject).toBe('Ваш рахунак №7')
    expect(be.text).toContain('Рахунак ад My App у ўкладанні.')
    expect(be.text).toContain('Need help? Write to support@myapp.loc')
  })

  it('renders a locale defined in messages', async () => {
    const withSlovak = defineTemplate({
      ...receipt,
      messages: { en: receiptTexts, sk: { subject: 'Vaša účtenka' } },
    })
    const mailer = createMailer({
      transport: memoryTransport(),
      from,
      branding,
      templates: { receipt: withSlovak },
      messages: { sk: { common: { greetingAnonymous: 'Dobrý deň,' } } },
    })

    const sk = await mailer.render('receipt', { locale: 'sk' })

    expect(sk.subject).toBe('Vaša účtenka')
    expect(sk.text).toContain('Thanks for your order.')
    expect(sk.html).toContain('<html lang="sk" ')
  })

  it('keeps the texts of each template apart', async () => {
    const transport = memoryTransport()
    const mailer = createMailer({ transport, from, branding, templates: { invoice, receipt } })

    await mailer.send('invoice', { to, props: { number: '42' } })
    await mailer.send('receipt', { to, locale: 'be' })
    await mailer.send('verifyEmail', { to, locale: 'be', props: { verifyUrl: 'https://myapp.loc/verify' } })

    expect(transport.sent.map((message) => message.subject)).toEqual([
      'Invoice #42',
      'Your receipt',
      'Пацвердзіце email',
    ])
    expect(transport.sent[1]?.text).toContain('Thanks for your order.')
  })

  it('replaces the texts of a built-in template it replaces, in every locale', async () => {
    const mailer = createMailer({
      transport: memoryTransport(),
      from,
      branding,
      templates: { resetPassword },
      messages: { be: { resetPassword: { intro: 'Увядзіце гэты код, каб задаць новы пароль.' } } },
    })

    const be = await mailer.render('resetPassword', { locale: 'be', props: { code: '481516' } })

    expect(be.subject).toBe('Your reset code')
    expect(be.text).toContain('Увядзіце гэты код, каб задаць новы пароль.')
    expect(be.text).not.toContain('Скід пароля')
  })

  it('types the props of templates with texts', () => {
    const { mailer } = setup()
    const check = async () => {
      await mailer.send('invoice', { to, props: { number: '42' } })
      // @ts-expect-error: number is required
      await mailer.send('invoice', { to, props: {} })
    }
    expect(check).toBeTypeOf('function')
    expectTypeOf<Parameters<typeof mailer.send<'invoice'>>[1]['props']>().toEqualTypeOf<{
      number: string
      userName?: string | undefined
    }>()
  })
})
