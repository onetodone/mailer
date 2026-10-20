import 'reflect-metadata'

import { Module, type DynamicModule, type Type } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import { z } from 'zod'

import { createMailer } from '../../src/mailer'
import * as nestjs from '../../src/nestjs'
import { MailerModule, MailerService } from '../../src/nestjs'
import type { BuiltInTemplates } from '../../src/templates/built-in'
import { defineTemplate } from '../../src/templates/define'
import { memoryTransport } from '../../src/transports/memory'
import type { MailTransport } from '../../src/transports/types'
import { catchRejection } from '../support/catch-error'
import { branding, from, mailerError } from '../support/mailer'

const ping = defineTemplate({
  name: 'ping',
  schema: z.object({ name: z.string() }),
  render: ({ props, ui }) => ({ subject: `Ping ${props.name}`, body: [ui.paragraph('Pong')] }),
})

const templates = { ping }

const CONFIG = Symbol('CONFIG')

function moduleClass(name: string, metadata: Parameters<typeof Module>[0]): Type {
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class -- a NestJS module is an empty class with metadata
  const target = { [name]: class {} }[name] as Type
  Module(metadata)(target)
  return target
}

// A feature module that injects the service without importing MailerModule.
const FEATURE = Symbol('FEATURE')
const FeatureModule = moduleClass('FeatureModule', {
  providers: [{ provide: FEATURE, inject: [MailerService], useFactory: (mailer: MailerService) => mailer }],
  exports: [FEATURE],
})

async function compile(...imports: (DynamicModule | Type)[]) {
  const moduleRef = await Test.createTestingModule({ imports }).compile()
  return moduleRef
}

function closingTransport() {
  const close = vi.fn(() => Promise.resolve())
  const transport: MailTransport = { send: () => Promise.resolve({ messageId: 'id-1' }), close }
  return { transport, close }
}

describe('@onetodone/mailer/nestjs', () => {
  it('exports the module and the service', () => {
    expect(Object.keys(nestjs).sort()).toEqual(['MailerModule', 'MailerService'])
  })

  describe('forRoot', () => {
    it('provides a MailerService that sends through the transport', async () => {
      const transport = memoryTransport()
      const moduleRef = await compile(MailerModule.forRoot({ transport, from, branding }))

      const mailer = moduleRef.get(MailerService)
      expect(mailer).toBeInstanceOf(MailerService)
      await mailer.send('passwordChanged', { to: 'user@example.com' })

      expect(transport.sent).toHaveLength(1)
      expect(transport.sent[0]?.to).toBe('user@example.com')
      await moduleRef.close()
    })

    it('passes the settings to createMailer', async () => {
      const transport = memoryTransport()
      const moduleRef = await compile(
        MailerModule.forRoot({ transport, from, branding, locale: 'be', templates, isGlobal: false }),
      )

      const mailer = moduleRef.get<MailerService<typeof templates>>(MailerService)
      const email = await mailer.render('ping', { props: { name: 'Lizzie' } })
      expect(email.subject).toBe('Ping Lizzie')
      expect((await mailer.render('passwordChanged')).subject).toBe(
        (await createMailer({ transport, from, branding, locale: 'be' }).render('passwordChanged')).subject,
      )
      await moduleRef.close()
    })

    it('is global by default', async () => {
      const moduleRef = await compile(
        MailerModule.forRoot({ transport: memoryTransport(), from, branding }),
        FeatureModule,
      )

      expect(moduleRef.get(FEATURE)).toBe(moduleRef.get(MailerService))
      await moduleRef.close()
    })

    it('stays local with isGlobal: false', async () => {
      const error = await catchRejection(
        compile(MailerModule.forRoot({ transport: memoryTransport(), from, branding, isGlobal: false }), FeatureModule),
      )

      expect(error.message).toMatch(/MailerService/)
    })

    it('fails at startup on invalid settings', async () => {
      const error = await catchRejection(
        compile(MailerModule.forRoot({ transport: memoryTransport(), from, branding: {} as never })),
      )

      expect(mailerError(error).code).toBe('INVALID_CONFIG')
    })

    it('closes the transport when the application shuts down', async () => {
      const { transport, close } = closingTransport()
      const moduleRef = await compile(MailerModule.forRoot({ transport, from, branding }))
      expect(close).not.toHaveBeenCalled()

      await moduleRef.close()

      expect(close).toHaveBeenCalledOnce()
    })
  })

  describe('forRootAsync', () => {
    const ConfigModule = moduleClass('ConfigModule', {
      providers: [{ provide: CONFIG, useValue: { from: 'App <no-reply@myapp.loc>' } }],
      exports: [CONFIG],
    })

    it('builds the settings with injected providers', async () => {
      const transport = memoryTransport()
      const useFactory = vi.fn((config: { from: string }) =>
        Promise.resolve({ transport, from: config.from, branding }),
      )
      const moduleRef = await compile(
        MailerModule.forRootAsync({ imports: [ConfigModule], inject: [CONFIG], useFactory }),
      )

      await moduleRef.get(MailerService).send('passwordChanged', { to: 'user@example.com' })

      expect(useFactory).toHaveBeenCalledOnce()
      expect(useFactory).toHaveBeenCalledWith({ from: 'App <no-reply@myapp.loc>' })
      expect(transport.sent[0]?.from).toBe('App <no-reply@myapp.loc>')
      await moduleRef.close()
    })

    it('accepts a synchronous factory and is global by default', async () => {
      const moduleRef = await compile(
        MailerModule.forRootAsync({ useFactory: () => ({ transport: memoryTransport(), from, branding }) }),
        FeatureModule,
      )

      expect(moduleRef.get(FEATURE)).toBeInstanceOf(MailerService)
      await moduleRef.close()
    })

    it('stays local with isGlobal: false', async () => {
      const error = await catchRejection(
        compile(
          MailerModule.forRootAsync({
            isGlobal: false,
            useFactory: () => ({ transport: memoryTransport(), from, branding }),
          }),
          FeatureModule,
        ),
      )

      expect(error.message).toMatch(/MailerService/)
    })

    it('fails at startup on invalid settings', async () => {
      const error = await catchRejection(
        compile(
          MailerModule.forRootAsync({ useFactory: () => ({ transport: memoryTransport(), from: 'nobody', branding }) }),
        ),
      )

      expect(mailerError(error).code).toBe('INVALID_CONFIG')
    })

    it('closes the transport when the application shuts down', async () => {
      const { transport, close } = closingTransport()
      const moduleRef = await compile(MailerModule.forRootAsync({ useFactory: () => ({ transport, from, branding }) }))

      await moduleRef.close()

      expect(close).toHaveBeenCalledOnce()
    })
  })

  describe('MailerService', () => {
    it('wraps a mailer without the module', async () => {
      const transport = memoryTransport()
      const mailer = new MailerService(createMailer({ transport, from, branding, templates }))

      await mailer.send('ping', { to: 'user@example.com', props: { name: 'Lizzie' } })

      expect(transport.sent[0]?.subject).toBe('Ping Lizzie')
    })

    it('types send and render after its type arguments', () => {
      type DefaultMailer = ReturnType<typeof createMailer<BuiltInTemplates>>
      expectTypeOf<MailerService['send']>().toEqualTypeOf<DefaultMailer['send']>()
      expectTypeOf<MailerService['render']>().toEqualTypeOf<DefaultMailer['render']>()

      const check = () => {
        const mailer = new MailerService<typeof templates, 'ca'>(
          createMailer({ transport: memoryTransport(), from, branding, templates }),
        )
        void mailer.send('ping', { to: 'user@example.com', locale: 'ca', props: { name: 'Lizzie' } })
        void mailer.send('verifyEmail', { to: 'user@example.com', props: { verifyUrl: 'https://myapp.loc/v' } })
        // @ts-expect-error: ping needs props.name
        void mailer.render('ping', { props: {} })
        // @ts-expect-error: unknown locale
        void mailer.render('passwordChanged', { locale: 'is' })
        // @ts-expect-error: the default service knows only the built-in templates
        void new MailerService(createMailer({ transport: memoryTransport(), from, branding })).render('ping')
      }
      expect(check).toBeTypeOf('function')
    })

    it('checks the settings of forRoot and forRootAsync', () => {
      // @ts-expect-error: unknown setting
      MailerModule.forRoot({ transport: memoryTransport(), from, branding, retries: 3 })
      MailerModule.forRootAsync({
        // @ts-expect-error: from is required
        useFactory: () => ({ transport: memoryTransport(), branding }),
      })
      MailerModule.forRootAsync({
        inject: [CONFIG],
        useFactory: (config: { from: string }) => ({ transport: memoryTransport(), from: config.from, branding }),
      })
      MailerModule.forRootAsync({
        useFactory: () => ({ transport: memoryTransport(), from, branding, templates, locale: 'be' }),
      })
      MailerModule.forRoot({
        transport: memoryTransport(),
        from,
        branding,
        // @ts-expect-error: the template name must match its key
        templates: { pong: ping },
      })
    })
  })
})
