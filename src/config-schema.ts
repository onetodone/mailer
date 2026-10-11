import { z } from 'zod'

import type { MailErrorEvent, MailSentEvent } from './config'
import type { Layout } from './core/layout'
import type { Branding } from './core/theme'
import { brandingSchema } from './core/theme-schema'
import { dictionaries, type MessagesOverrides } from './i18n'
import { messagesOverridesSchema } from './i18n/schema'
import type { AnyTemplate } from './templates/define'
import type { TemplateTexts } from './templates/messages'
import { sectionNameProblem, templateMessagesSchema } from './templates/messages-schema'
import type { MailTransport } from './transports/types'
import { describeInput, expected, isRecord, mailAddress, mailAddresses, objectError, timeZone } from './validators'

function isFunction(value: unknown): boolean {
  return typeof value === 'function'
}

function isTransport(value: unknown): value is MailTransport {
  return isRecord(value) && typeof value.send === 'function'
}

// Standard Schema values can be functions too, such as arktype types.
function isTemplate(value: unknown): value is AnyTemplate {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.render !== 'function') return false
  const { schema } = value
  if ((typeof schema !== 'object' && typeof schema !== 'function') || schema === null) return false
  const standard: unknown = (schema as { readonly '~standard'?: unknown })['~standard']
  return isRecord(standard) && typeof standard.validate === 'function'
}

function callable<T>(description: string) {
  return z.custom<T>(isFunction, { error: expected(description) })
}

const templatesSchema = z
  .record(z.string(), z.custom<AnyTemplate>(isTemplate, { error: expected('a template from defineTemplate') }), {
    error: objectError,
  })
  .superRefine((templates, ctx) => {
    for (const [key, template] of Object.entries(templates)) {
      if (template.name !== key) {
        ctx.addIssue({
          code: 'custom',
          path: [key, 'name'],
          message: `must match its key "${key}", received ${describeInput(template.name)}`,
          input: template.name,
        })
      }
      if (template.messages === undefined) continue
      const nameProblem = sectionNameProblem(key)
      if (nameProblem !== undefined) {
        ctx.addIssue({ code: 'custom', path: [key, 'name'], message: nameProblem, input: template.name })
      }
      for (const issue of templateMessagesSchema.safeParse(template.messages).error?.issues ?? []) {
        ctx.addIssue({
          code: 'custom',
          path: [key, 'messages', ...issue.path],
          message: issue.message,
          input: undefined,
        })
      }
    }
  })

export function knownLocales(overrides: MessagesOverrides = {}): string[] {
  return [...new Set([...Object.keys(dictionaries), ...Object.keys(overrides)])]
}

export function describeLocales(locales: readonly string[]): string {
  return locales.map((locale) => `"${locale}"`).join(', ')
}

/**
 * Schema for the settings. `sections` are the English texts of the custom
 * templates with their own `messages`, so that `messages` can override them.
 */
export function configSchema(sections: Readonly<Record<string, TemplateTexts>> = {}) {
  return z
    .strictObject(
      {
        transport: z.custom<MailTransport>(isTransport, { error: expected('an object with a send method') }),
        from: mailAddress,
        replyTo: mailAddresses.optional(),
        locale: z.string({ error: expected('a string') }).optional(),
        timeZone: timeZone.optional(),
        branding: z.custom<Branding>((value) => value !== undefined, { error: 'is required' }).pipe(brandingSchema),
        messages: messagesOverridesSchema({ ...dictionaries.en, ...sections }).optional(),
        layout: callable<Layout>('a function').optional(),
        templates: templatesSchema.optional(),
        onSent: callable<(event: MailSentEvent) => unknown>('a function').optional(),
        onError: callable<(event: MailErrorEvent) => unknown>('a function').optional(),
      },
      { error: objectError },
    )
    .superRefine((config, ctx) => {
      const locales = knownLocales(config.messages)
      const expectedLocale = `a built-in locale (${describeLocales(Object.keys(dictionaries))}) or a key of messages`
      if (config.locale !== undefined && !locales.includes(config.locale)) {
        ctx.addIssue({
          code: 'custom',
          path: ['locale'],
          message: `must be ${expectedLocale}, received ${describeInput(config.locale)}`,
          input: config.locale,
        })
      }
      for (const [key, template] of Object.entries(config.templates ?? {})) {
        const texts = templateMessagesSchema.safeParse(template.messages).data ?? {}
        for (const [locale, localeTexts] of Object.entries(texts)) {
          if (localeTexts === undefined || locales.includes(locale)) continue
          ctx.addIssue({
            code: 'custom',
            path: ['templates', key, 'messages', locale],
            message: `is not a locale of the mailer: use ${expectedLocale}`,
            input: locale,
          })
        }
      }
    })
}
