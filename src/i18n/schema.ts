import { z } from 'zod'

import { expected, isLocaleTag, isRecord, objectError } from '../validators'
import type { LocaleMessages, MessagesOverrides, PluralForms } from './index'

export const text = z.string({ error: expected('a string') })

export const localeTag = z.string().refine(isLocaleTag)

/** Error for a record keyed by locale: a key that is not a BCP 47 tag, or a value that is not an object. */
export function localeRecordError(issue: { code?: string }): string {
  return issue.code === 'invalid_key' ? 'is not a BCP 47 language tag like "pl" or "pt-BR"' : 'must be an object'
}

const pluralForms = z.strictObject(
  {
    zero: text.optional(),
    one: text.optional(),
    two: text.optional(),
    few: text.optional(),
    many: text.optional(),
    other: text.optional(),
  },
  { error: objectError },
)

const textOrForms = z.string({ error: expected('a string or plural forms') })

/**
 * A text, or plural forms when the value is an object. Unlike a union, problems
 * inside the forms keep their own paths, such as `items.one`.
 */
export const textOrPluralForms = z.unknown().superRefine((value, ctx) => {
  if (value === undefined) return
  const result = (isRecord(value) ? pluralForms : textOrForms).safeParse(value)
  for (const { path, message } of result.error?.issues ?? [])
    ctx.addIssue({ code: 'custom', path, message, input: value })
}) as z.ZodType<string | Readonly<Partial<PluralForms>> | undefined>

function sectionSchema(texts: object) {
  const shape = Object.fromEntries(
    Object.entries(texts).map(([key, value]: [string, unknown]) => [
      key,
      (typeof value === 'string' ? text : pluralForms).optional(),
    ]),
  )
  return z.strictObject(shape, { error: objectError }).optional()
}

/**
 * Schema for the texts of one locale, built from the keys of a complete
 * dictionary (the built-in texts plus the sections of custom templates with
 * their own texts): every key is optional and unknown keys fail.
 */
export function localeMessagesSchema(
  dictionary: Readonly<Record<string, object>>,
): z.ZodType<LocaleMessages, LocaleMessages> {
  const shape = Object.fromEntries(Object.entries(dictionary).map(([name, texts]) => [name, sectionSchema(texts)]))
  return z.strictObject(shape, { error: objectError })
}

/** Schema for `messages` overrides: texts of each locale, keyed by BCP 47 language tag. */
export function messagesOverridesSchema(
  dictionary: Readonly<Record<string, object>>,
): z.ZodType<MessagesOverrides, MessagesOverrides> {
  return z.record(localeTag, localeMessagesSchema(dictionary).optional(), { error: localeRecordError })
}
