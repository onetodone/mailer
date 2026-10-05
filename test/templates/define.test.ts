import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import type { MessagesOverrides, Translate } from '../../src/i18n'
import { defineTemplate, type Template, type TemplateProps } from '../../src/templates/define'
import type { TemplateMessages, TemplateTexts } from '../../src/templates/messages'
import type { StandardSchemaV1 } from '../../src/templates/standard-schema'

describe('defineTemplate', () => {
  it('returns the template unchanged', () => {
    const template = { name: 'plain', schema: z.object({}), render: () => ({ subject: 'Plain', body: [] }) }
    expect(defineTemplate(template)).toBe(template)
  })

  it('infers the name and the props from the schema', () => {
    const orderShipped = defineTemplate({
      name: 'orderShipped',
      schema: z.object({ orderId: z.string(), items: z.number().default(1) }),
      render: ({ props, ui }) => {
        expectTypeOf(props).toEqualTypeOf<{ orderId: string; items: number }>()
        return { subject: `Order #${props.orderId} shipped`, body: [ui.paragraph(String(props.items))] }
      },
    })
    expectTypeOf(orderShipped.name).toEqualTypeOf<'orderShipped'>()
    expectTypeOf<TemplateProps<typeof orderShipped>>().toEqualTypeOf<{
      orderId: string
      items?: number | undefined
    }>()
    expectTypeOf(orderShipped).toExtend<Template>()
  })

  it('accepts any Standard Schema implementation', () => {
    const schema: StandardSchemaV1<{ id: string }> = {
      '~standard': {
        version: 1,
        vendor: 'handwritten',
        validate: (value) => Promise.resolve({ value: value as { id: string } }),
      },
    }
    const template = defineTemplate({
      name: 'custom',
      schema,
      render: ({ props }) => ({ subject: props.id, body: [] }),
    })
    expectTypeOf<TemplateProps<typeof template>>().toEqualTypeOf<{ id: string }>()
    expect(template.schema).toBe(schema)
  })
})

describe('defineTemplate with messages', () => {
  const schema = z.object({ number: z.string() })

  it('types t with the template keys and the common keys', () => {
    const invoice = defineTemplate({
      name: 'invoice',
      schema,
      messages: {
        en: { subject: 'Invoice #{number}', intro: 'Your invoice is attached.' },
        be: { subject: 'Рахунак №{number}' },
      },
      render: ({ props, ui, t }) => {
        expectTypeOf<Parameters<typeof t>[0]>().toEqualTypeOf<
          | 'invoice.subject'
          | 'invoice.intro'
          | 'common.greeting'
          | 'common.greetingAnonymous'
          | 'common.linkFallback'
          | 'common.footerSupport'
          | 'common.footerRights'
        >()
        expectTypeOf<Parameters<typeof t.html>[0]>().toEqualTypeOf<Parameters<typeof t>[0]>()
        return { subject: t('invoice.subject', { number: props.number }), body: [ui.paragraph(t('invoice.intro'))] }
      },
    })
    expectTypeOf<TemplateProps<typeof invoice>>().toEqualTypeOf<{ number: string }>()
    expectTypeOf(invoice).toExtend<Template<string, unknown, unknown, TemplateTexts>>()
    expectTypeOf(invoice).not.toExtend<Template>()
  })

  it('keeps every built-in key for templates without messages', () => {
    defineTemplate({
      name: 'plain',
      schema,
      render: ({ t }) => {
        expectTypeOf(t).toEqualTypeOf<Translate>()
        return { subject: t('verifyEmail.subject'), body: [] }
      },
    })
  })

  it('returns the template with its messages unchanged', () => {
    const template = {
      name: 'invoice',
      schema,
      messages: { en: { subject: 'Invoice' } },
      render: () => ({ subject: 'Invoice', body: [] }),
    }
    expect(defineTemplate(template)).toBe(template)
  })

  it('rejects keys and texts outside the English dictionary', () => {
    const check = () => {
      defineTemplate({
        name: 'invoice',
        schema,
        messages: { en: { subject: 'Invoice' } },
        render: ({ t }) => ({
          // @ts-expect-error: not a key of the template
          subject: t('invoice.title'),
          // @ts-expect-error: built-in texts other than common are not available
          preheader: t('verifyEmail.subject'),
          body: [],
        }),
      })
      defineTemplate({
        name: 'invoice',
        schema,
        // @ts-expect-error: be has a key that en does not
        messages: { en: { subject: 'Invoice' }, be: { title: 'Рахунак' } },
        render: () => ({ subject: 'Invoice', body: [] }),
      })
      defineTemplate({
        name: 'invoice',
        schema,
        // @ts-expect-error: texts are strings
        messages: { en: { subject: 42 } },
        render: () => ({ subject: 'Invoice', body: [] }),
      })
      defineTemplate({
        name: 'invoice',
        schema,
        // @ts-expect-error: en is required
        messages: { be: { subject: 'Рахунак' } },
        render: () => ({ subject: 'Invoice', body: [] }),
      })
    }
    expect(check).toBeTypeOf('function')
  })
})

describe('defineTemplate with plural forms', () => {
  const schema = z.object({ items: z.number() })
  const messages = {
    en: { subject: 'Your cart', items: { one: '{count} item', other: '{count} items' } },
    be: { items: { one: '{count} тавар', few: '{count} тавары', many: '{count} тавараў' } },
  } satisfies TemplateMessages

  it('types t with the plural keys apart from the text keys', () => {
    defineTemplate({
      name: 'cart',
      schema,
      messages,
      render: ({ props, t }) => {
        expectTypeOf(t).toEqualTypeOf<
          Translate<
            | 'cart.subject'
            | 'common.greeting'
            | 'common.greetingAnonymous'
            | 'common.linkFallback'
            | 'common.footerSupport'
            | 'common.footerRights',
            'cart.items'
          >
        >()
        expectTypeOf<Parameters<typeof t>[0]>().not.toEqualTypeOf<'cart.items'>()
        return { subject: t('cart.subject'), body: [], preheader: t('cart.items', { count: props.items }) }
      },
    })
  })

  it('types overrides of plural forms with every category', () => {
    const cart = defineTemplate({ name: 'cart', schema, messages, render: () => ({ subject: 'Cart', body: [] }) })
    const overrides = {
      sk: { cart: { items: { few: '{count} položky', other: '{count} položiek' } } },
    } satisfies MessagesOverrides<{ cart: typeof cart }>
    expect(overrides.sk.cart.items.few).toBe('{count} položky')
    expect(cart.messages).toBe(messages)

    // @ts-expect-error: plural forms, not a string
    const asText: MessagesOverrides<{ cart: typeof cart }> = { sk: { cart: { items: '{count}' } } }
    expect(asText).toBeDefined()
  })

  it('rejects plural forms that do not match the English texts', () => {
    const check = () => {
      defineTemplate({
        name: 'cart',
        schema,
        // @ts-expect-error: other is required in English plural forms
        messages: { en: { items: { one: '{count} item' } } },
        render: () => ({ subject: 'Cart', body: [] }),
      })
      defineTemplate({
        name: 'cart',
        schema,
        // @ts-expect-error: be keeps the plural forms of en
        messages: { en: { items: { one: '{count} item', other: '{count} items' } }, be: { items: '{count}' } },
        render: () => ({ subject: 'Cart', body: [] }),
      })
      defineTemplate({
        name: 'cart',
        schema,
        // @ts-expect-error: be keeps the string of en
        messages: { en: { subject: 'Cart' }, be: { subject: { other: 'Кошык' } } },
        render: () => ({ subject: 'Cart', body: [] }),
      })
      defineTemplate({
        name: 'cart',
        schema,
        // @ts-expect-error: an unknown plural category
        messages: { en: { items: { single: '{count} item', other: '{count} items' } } },
        render: () => ({ subject: 'Cart', body: [] }),
      })
    }
    expect(check).toBeTypeOf('function')
  })
})
