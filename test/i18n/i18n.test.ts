import { describe, expect, it } from 'vitest'
import { z } from 'zod'

import { html, isSafeHtml } from '../../src/core/html'
import { be } from '../../src/i18n/be'
import { en } from '../../src/i18n/en'
import { buildMessages, createI18n, dictionaries, type Locale, type MessagesOverrides } from '../../src/i18n'
import type { TemplateRegistry } from '../../src/templates/define'
import { withTemplateMessages } from '../../src/templates/messages'

function i18n(
  locale: Locale,
  overrides: MessagesOverrides = {},
  options: { companyName?: string; timeZone?: string } = {},
) {
  return createI18n({
    locale,
    messages: buildMessages(overrides)[locale],
    companyName: options.companyName ?? 'My App',
    timeZone: options.timeZone,
  })
}

// ICU data differs between Node versions (spacing, "at" vs ","), so dates are
// checked by their parts after normalizing whitespace.
function normalize(value: string): string {
  return value.replace(/\s+/g, ' ')
}

describe('buildMessages', () => {
  it('keeps the other keys when one key is overridden', () => {
    const messages = buildMessages({ en: { verifyEmail: { subject: 'Verify it' } } })
    expect(messages.en.verifyEmail).toEqual({ ...en.verifyEmail, subject: 'Verify it' })
    expect(messages.en.resetPassword).toEqual(en.resetPassword)
    expect(messages.en.common).toEqual(en.common)
    expect(messages.be).toEqual(be)
  })

  it('overrides single plural forms', () => {
    const messages = buildMessages({ be: { common: { minutes: { one: '{count} хв' } } } })
    expect(messages.be.common.minutes).toEqual({ ...be.common.minutes, one: '{count} хв' })
  })

  it('skips undefined values', () => {
    const messages = buildMessages({ en: { verifyEmail: { subject: undefined } }, be: undefined })
    expect(messages.en).toEqual(en)
    expect(messages.be).toEqual(be)
  })

  it('does not mutate the dictionaries', () => {
    const before = structuredClone(dictionaries)
    buildMessages({ en: { common: { greeting: 'Hey {name}' } }, be: { passwordChanged: { subject: 'Зменена' } } })
    expect(dictionaries).toEqual(before)
  })

  it('falls back to English for keys a locale leaves out', () => {
    const source = { en, xx: { verifyEmail: { subject: 'XX subject' } } }
    const messages = buildMessages({ en: { verifyEmail: { heading: 'Custom heading' } } }, source)
    expect(messages.xx?.verifyEmail).toEqual({ ...en.verifyEmail, subject: 'XX subject', heading: 'Custom heading' })
    expect(messages.xx?.passwordChanged).toEqual(en.passwordChanged)
  })

  it('adds a locale that exists only in the overrides', () => {
    const messages = buildMessages({ pl: { common: { greeting: 'Cześć {name},' } } })
    expect(messages.pl?.common.greeting).toBe('Cześć {name},')
    expect(messages.pl?.verifyEmail).toEqual(en.verifyEmail)
  })

  it('keeps the overrides of a custom locale that becomes built-in', () => {
    const overrides = { xx: { verifyEmail: { subject: 'My subject' } } }
    const custom = buildMessages(overrides, { en })
    const builtIn = buildMessages(overrides, {
      en,
      xx: { verifyEmail: { subject: 'XX subject', heading: 'XX heading' } },
    })
    expect(custom.xx?.verifyEmail).toEqual({ ...en.verifyEmail, subject: 'My subject' })
    expect(builtIn.xx?.verifyEmail).toEqual({ ...en.verifyEmail, subject: 'My subject', heading: 'XX heading' })
  })
})

describe('withTemplateMessages', () => {
  const texts = { subject: 'Invoice', intro: 'Attached.' }
  const template = { name: 'invoice', schema: z.object({}), render: () => ({ subject: '', body: [] }) }

  function build(templates: TemplateRegistry) {
    const messages = buildMessages({}, withTemplateMessages(dictionaries, templates))
    return messages as unknown as Readonly<Record<string, Readonly<Record<string, unknown>> | undefined>>
  }

  it('returns the dictionaries as they are without template texts', () => {
    expect(withTemplateMessages(dictionaries, { invoice: template })).toBe(dictionaries)
  })

  it('adds the texts of a template as a section of every locale', () => {
    const messages = build({ invoice: { ...template, messages: { en: texts, be: { subject: 'Рахунак' } } } })
    expect(messages.en?.invoice).toEqual(texts)
    expect(messages.be?.invoice).toEqual({ subject: 'Рахунак', intro: 'Attached.' })
    expect(messages.be?.verifyEmail).toEqual(be.verifyEmail)
  })

  it('replaces a built-in section, so the other locales fall back to the template texts', () => {
    const messages = build({ resetPassword: { ...template, name: 'resetPassword', messages: { en: texts } } })
    expect(messages.en?.resetPassword).toEqual(texts)
    expect(messages.be?.resetPassword).toEqual(texts)
  })

  it('adds the locales of template texts', () => {
    const messages = build({ invoice: { ...template, messages: { en: texts, pl: { subject: 'Faktura' } } } })
    expect(messages.pl?.invoice).toEqual({ subject: 'Faktura', intro: 'Attached.' })
    expect(messages.pl?.common).toEqual(en.common)
  })

  it('does not mutate the dictionaries', () => {
    const snapshot = structuredClone(dictionaries)
    build({ resetPassword: { ...template, name: 'resetPassword', messages: { en: texts } } })
    expect(dictionaries).toEqual(snapshot)
  })
})

describe('dictionaries', () => {
  it.each(Object.entries(dictionaries))('%s has a plural form for every category of the locale', (locale, messages) => {
    const { minutes, hours, days } = messages.common
    const categories = new Intl.PluralRules(locale).resolvedOptions().pluralCategories
    for (const forms of [minutes, hours, days]) {
      for (const category of categories) {
        expect(forms[category] ?? '', `${locale} ${category}`).toContain('{count}')
      }
    }
  })
})

describe('t', () => {
  it('fills placeholders', () => {
    expect(i18n('en').t('common.greeting', { name: 'Lizzie' })).toBe('Hi Lizzie,')
    expect(i18n('be').t('common.greeting', { name: 'Ліза' })).toBe('Вітаем, Ліза!')
  })

  it('always provides the company name', () => {
    expect(i18n('en').t('verifyEmail.preheader')).toBe('One step left to finish signing up for My App.')
    expect(i18n('en').t('verifyEmail.preheader', { companyName: 'MyApp' })).toBe(
      'One step left to finish signing up for MyApp.',
    )
  })

  it('leaves placeholders without a value as they are', () => {
    expect(i18n('en').t('common.greeting')).toBe('Hi {name},')
    const { t } = i18n('en', { en: { common: { greeting: 'Hi {constructor},' } } })
    expect(t('common.greeting')).toBe('Hi {constructor},')
  })

  it('returns plain text, leaving escaping to the blocks', () => {
    expect(i18n('en').t('common.greeting', { name: '<b>Tom & Jerry</b>' })).toBe('Hi <b>Tom & Jerry</b>,')
  })

  it('uses overridden texts', () => {
    const { t } = i18n('en', { en: { verifyEmail: { subject: 'Welcome to {companyName}' } } })
    expect(t('verifyEmail.subject')).toBe('Welcome to My App')
  })
})

describe('t.html', () => {
  it('escapes the text and string params and keeps SafeHtml params', () => {
    const { t } = i18n('en', { en: { passwordChanged: { notYouEmail: '<Write> to {email} & {name}' } } })
    const result = t.html('passwordChanged.notYouEmail', {
      email: html`<a href="mailto:help@myapp.loc">help@myapp.loc</a>`,
      name: '<b>',
    })
    expect(isSafeHtml(result)).toBe(true)
    expect(result.value).toBe('&lt;Write&gt; to <a href="mailto:help@myapp.loc">help@myapp.loc</a> &amp; &lt;b&gt;')
  })

  it('escapes the company name', () => {
    const { t } = i18n('en', {}, { companyName: 'Tom & Jerry' })
    expect(t.html('verifyEmail.preheader').value).toBe('One step left to finish signing up for Tom &amp; Jerry.')
  })

  it('leaves placeholders without a value as they are', () => {
    expect(i18n('en').t.html('common.greeting').value).toBe('Hi {name},')
  })
})

describe('format.duration', () => {
  it.each([
    [1, '1 minute'],
    [2, '2 minutes'],
    [30, '30 minutes'],
    [60, '1 hour'],
    [90, '90 minutes'],
    [120, '2 hours'],
    [1440, '24 hours'],
    [1500, '25 hours'],
    [2880, '2 days'],
    [4320, '3 days'],
    [1501, '1,501 minutes'],
  ])('en: %i minutes → %s', (minutes, expected) => {
    expect(i18n('en').format.duration(minutes)).toBe(expected)
  })

  it.each([
    [1, '1 хвіліну'],
    [2, '2 хвіліны'],
    [5, '5 хвілін'],
    [11, '11 хвілін'],
    [21, '21 хвіліну'],
    [22, '22 хвіліны'],
    [25, '25 хвілін'],
    [30, '30 хвілін'],
    [60, '1 гадзіну'],
    [120, '2 гадзіны'],
    [300, '5 гадзін'],
    [1260, '21 гадзіну'],
    [1440, '24 гадзіны'],
    [2880, '2 дні'],
    [7200, '5 дзён'],
    [30240, '21 дзень'],
  ])('be: %i minutes → %s', (minutes, expected) => {
    expect(i18n('be').format.duration(minutes)).toBe(expected)
  })

  it('falls back to the "other" form when the category has none', () => {
    const { format } = createI18n({
      locale: 'be',
      messages: { ...be, common: { ...be.common, minutes: { other: '{count} хв' } } },
      companyName: 'My App',
    })
    expect(format.duration(1)).toBe('1 хв')
    expect(format.duration(5)).toBe('5 хв')
  })
})

describe('format.dateTime', () => {
  const changedAt = new Date('2026-05-04T09:30:00Z')

  it('shows the date, time and zone in UTC by default', () => {
    const value = normalize(i18n('en').format.dateTime(changedAt))
    expect(value).toContain('2026')
    expect(value).toMatch(/\b4\b/)
    expect(value).toContain('9:30')
    expect(value).toContain('UTC')
  })

  it('uses the time zone argument', () => {
    const value = normalize(i18n('en').format.dateTime(changedAt, 'Europe/Minsk'))
    expect(value).toContain('12:30')
    expect(value).toContain('GMT+3')
  })

  it('uses the default time zone of the renderer', () => {
    const value = normalize(i18n('en', {}, { timeZone: 'Asia/Tokyo' }).format.dateTime(changedAt))
    expect(value).toContain('6:30')
    expect(value).toContain('GMT+9')
  })

  it('formats for the locale', () => {
    const value = normalize(i18n('be').format.dateTime(changedAt, 'Europe/Minsk'))
    expect(value).toContain('2026')
    expect(value).toMatch(/(?:^|\D)4(?:\D|$)/)
    expect(value).toContain('12:30')
    expect(value).toContain('GMT+3')
    expect(value).not.toContain('May')
  })
})
