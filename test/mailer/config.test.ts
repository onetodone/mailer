import { describe, expect, expectTypeOf, it } from 'vitest'
import { z } from 'zod'

import { defineLayout } from '../../src/core/layout'
import { createMailer, type Mailer } from '../../src/mailer'
import { defineTemplate } from '../../src/templates/define'
import { memoryTransport } from '../../src/transports/memory'
import { branding, configError, createUnchecked, from } from '../support/mailer'

const ping = defineTemplate({
  name: 'ping',
  schema: z.object({}),
  render: ({ ui }) => ({ subject: 'Ping', body: [ui.paragraph('Pong')] }),
})

function config(override: Record<string, unknown> = {}): Record<string, unknown> {
  return { transport: memoryTransport(), from, branding, ...override }
}

describe('createMailer config', () => {
  it('fails at startup, before anything is sent', () => {
    const transport = memoryTransport()
    const error = configError(() => createMailer({ transport, from: 'not an address', branding }))
    expect(error.message).toBe(
      'Invalid mailer configuration: from must be an email address like "user@example.com" or "Name <user@example.com>", received "not an address".',
    )
    expect(transport.sent).toHaveLength(0)
  })

  it('reports every problem at once', () => {
    const error = configError(() =>
      createUnchecked({
        transport: {},
        from: 'no-reply@myapp.loc',
        branding: { ...branding, supportEmail: 'support' },
        timeZone: 'Mars/Base',
        sender: 'no-reply@myapp.loc',
      }),
    )
    expect(error.message).toBe(
      'Invalid mailer configuration: transport must be an object with a send method, received object; ' +
        'timeZone must be an IANA time zone like "Europe/Berlin", received "Mars/Base"; ' +
        'branding.supportEmail must be an email address, received "support"; has unknown key "sender".',
    )
    expect(error.cause).toBeInstanceOf(z.ZodError)
  })

  it.each<[string, Record<string, unknown>, string]>([
    [
      'a missing config',
      { transport: undefined, from: undefined, branding: undefined },
      'transport is required; from is required; branding is required',
    ],
    [
      'a line break in the sender name',
      { from: { name: 'App\r\nBcc: x@evil.co', address: 'a@myapp.loc' } },
      'from.name must not contain line breaks',
    ],
    [
      'a line break in the sender string',
      { from: 'App\nBcc: x@evil.co <a@myapp.loc>' },
      'from must not contain line breaks',
    ],
    [
      'a list as the sender',
      { from: ['a@myapp.loc'] },
      'from must be an email address like "user@example.com" or "Name <user@example.com>", received object',
    ],
    ['an empty replyTo list', { replyTo: [] }, 'replyTo must list at least one address'],
    [
      'an invalid replyTo address',
      { replyTo: ['support@myapp.loc', { address: 'help' }] },
      'replyTo.1.address must be an email address, received "help"',
    ],
    [
      'a missing branding field',
      { branding: { ...branding, companyName: undefined } },
      'branding.companyName is required',
    ],
    [
      'an unknown locale',
      { locale: 'de' },
      'locale must be a built-in locale ("en", "be") or a key of messages, received "de"',
    ],
    [
      'an unknown message key',
      { messages: { en: { common: { greting: 'Hey {name},' } } } },
      'messages.en.common has unknown key "greting"',
    ],
    [
      'an unknown message section',
      { messages: { en: { orderShipped: { subject: 'Hi' } } } },
      'messages.en has unknown key "orderShipped"',
    ],
    [
      'a message that is not a string',
      { messages: { be: { verifyEmail: { subject: 42 } } } },
      'messages.be.verifyEmail.subject must be a string, received number',
    ],
    [
      'plural forms as a string',
      { messages: { be: { common: { minutes: 'хвілін' } } } },
      'messages.be.common.minutes must be an object',
    ],
    [
      'an invalid locale tag',
      { messages: { en_US: {} } },
      'messages.en_US is not a BCP 47 language tag like "pl" or "pt-BR"',
    ],
    [
      'a layout that is not a function',
      { layout: '<main></main>' },
      'layout must be a function, received "<main></main>"',
    ],
    [
      'a hook that is not a function',
      { onSent: true, onError: 'log' },
      'onSent must be a function, received boolean; onError must be a function, received "log"',
    ],
    [
      'a template under another name',
      { templates: { orderShipped: ping } },
      'templates.orderShipped.name must match its key "orderShipped", received "ping"',
    ],
    [
      'something that is not a template',
      { templates: { ping: { name: 'ping' } } },
      'templates.ping must be a template from defineTemplate, received object',
    ],
    ['templates that are not an object', { templates: [ping] }, 'templates must be an object'],
  ])('rejects %s', (_case, override, detail) => {
    const error = configError(() => createUnchecked(config(override)))
    expect(error.message).toBe(`Invalid mailer configuration: ${detail}.`)
  })

  it('accepts every address form', () => {
    for (const sender of [
      'no-reply@myapp.loc',
      'My App <no-reply@myapp.loc>',
      '"My App, Inc." <no-reply@myapp.loc>',
      from,
    ]) {
      expect(() =>
        createMailer({
          transport: memoryTransport(),
          from: sender,
          replyTo: ['a@myapp.loc', { address: 'b@myapp.loc' }],
          branding,
        }),
      ).not.toThrow()
    }
  })

  it('accepts locales defined only in messages', () => {
    const mailer = createMailer({
      transport: memoryTransport(),
      from,
      branding,
      locale: 'pt-BR',
      messages: { 'pt-BR': { verifyEmail: { subject: 'Confirme seu email' } }, be: undefined },
    })
    expectTypeOf(mailer).toExtend<Mailer>()
  })

  it('accepts templates whose schema is a function, as in arktype', () => {
    const schema = Object.assign(() => undefined, {
      '~standard': { version: 1 as const, vendor: 'arktype', validate: (value: unknown) => ({ value }) },
    })
    const template = defineTemplate({ name: 'ping', schema, render: () => ({ subject: 'Ping', body: [] }) })
    expect(() =>
      createMailer({ transport: memoryTransport(), from, branding, templates: { ping: template } }),
    ).not.toThrow()
  })

  it('accepts a custom layout and hooks', () => {
    const layout = defineLayout(({ content }) => ({ html: content.html, text: content.text }))
    expect(() =>
      createMailer({
        transport: memoryTransport(),
        from,
        branding,
        layout,
        onSent: () => undefined,
        onError: () => undefined,
      }),
    ).not.toThrow()
  })

  it('types the locale as the built-in locales plus the keys of messages', () => {
    const check = () => {
      createMailer({
        transport: memoryTransport(),
        from,
        branding,
        // @ts-expect-error: "de" has no texts
        locale: 'de',
      })
      createMailer({ transport: memoryTransport(), from, branding, locale: 'pl', messages: { pl: {} } })
      createMailer({
        transport: memoryTransport(),
        from,
        branding,
        // @ts-expect-error: a template name must match its key
        templates: { orderShipped: ping },
      })
    }
    expect(check).toBeTypeOf('function')
  })
})
