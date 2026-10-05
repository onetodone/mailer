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

const cart = defineTemplate({
  name: 'cart',
  schema: z.strictObject({ items: z.number() }),
  messages: {
    en: {
      subject: 'Your cart',
      items: { one: '{count} item in your cart', other: '{count} items in your cart' },
      total: { one: 'Total for {count} item: {sum}', other: 'Total for {count} items: {sum}' },
    },
    be: {
      subject: 'Ваш кошык',
      items: {
        one: '{count} тавар у кошыку',
        few: '{count} тавары ў кошыку',
        many: '{count} тавараў у кошыку',
        other: '{count} тавару ў кошыку',
      },
    },
  },
  render: ({ props, ui, t }) => ({
    subject: t('cart.subject'),
    body: [
      ui.paragraph(t('cart.items', { count: props.items })),
      ui.paragraph(t.html('cart.total', { count: props.items, sum: html`<b>$5 &amp; more</b>` })),
    ],
  }),
})

function cartMailer(messages?: MessagesOverrides<{ cart: typeof cart }>) {
  return createMailer({ transport: memoryTransport(), from, branding, templates: { cart }, messages })
}

describe('plural template texts', () => {
  it('picks the form for count with the plural rules of the locale', async () => {
    const mailer = cartMailer()
    const text = async (items: number, locale?: 'be') =>
      (await mailer.render('cart', { locale, props: { items } })).text

    expect(await text(1)).toContain('1 item in your cart')
    expect(await text(3)).toContain('3 items in your cart')
    expect(await text(21, 'be')).toContain('21 тавар у кошыку')
    expect(await text(3, 'be')).toContain('3 тавары ў кошыку')
    expect(await text(5, 'be')).toContain('5 тавараў у кошыку')
    expect(await text(1.5, 'be')).toContain('1,5 тавару ў кошыку')
  })

  it('formats count for the locale', async () => {
    const mailer = cartMailer()

    const en = await mailer.render('cart', { props: { items: 1000 } })

    expect(en.text).toContain('1,000 items in your cart')
  })

  it('falls back to English plural forms a locale leaves out', async () => {
    const mailer = cartMailer()

    const be = await mailer.render('cart', { locale: 'be', props: { items: 2 } })

    expect(be.text).toContain('Total for 2 items: $5 & more')
  })

  it('uses other for a category without a form', async () => {
    const items = defineTemplate({
      name: 'items',
      schema: z.strictObject({}),
      messages: { en: { subject: { other: '{count} items' } } },
      render: ({ t }) => ({ subject: t('items.subject', { count: 1 }), body: [] }),
    })
    const mailer = createMailer({ transport: memoryTransport(), from, branding, templates: { items } })

    const en = await mailer.render('items')

    expect(en.subject).toBe('1 items')
  })

  it('takes overrides that add categories the English texts leave out', async () => {
    const mailer = cartMailer({
      sk: {
        cart: {
          items: { one: '{count} položka', few: '{count} položky', many: '{count} položky', other: '{count} položiek' },
        },
      },
    })

    const few = await mailer.render('cart', { locale: 'sk', props: { items: 3 } })
    const other = await mailer.render('cart', { locale: 'sk', props: { items: 5 } })

    expect(few.text).toContain('3 položky')
    expect(other.text).toContain('5 položiek')
  })

  it('escapes the form in HTML and inserts safe params as markup', async () => {
    const mailer = cartMailer({ en: { cart: { total: { other: '{count} <items>: {sum}' } } } })

    const en = await mailer.render('cart', { props: { items: 2 } })

    expect(en.html).toContain('2 &lt;items&gt;: <b>$5 &amp; more</b>')
  })

  it('requires count for texts with plural forms', () => {
    defineTemplate({
      ...cart,
      render: ({ t }) => {
        // @ts-expect-error: count is required
        t('cart.items')
        // @ts-expect-error: count is a number
        t('cart.items', { count: '2' })
        // @ts-expect-error: count is required
        t.html('cart.total', { sum: '$5' })
        return { subject: t('cart.subject'), body: [] }
      },
    })
  })
})
