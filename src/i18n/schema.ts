import { z } from 'zod'

import { expected, isLocaleTag, objectError } from '../validators'
import type { LocaleMessages, Messages, MessagesOverrides } from './index'

const text = z.string({ error: expected('a string') })

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
 * dictionary: every key is optional and unknown keys fail.
 */
export function localeMessagesSchema(dictionary: Messages): z.ZodType<LocaleMessages, LocaleMessages> {
  const sections: Readonly<Record<keyof Messages, object>> = dictionary
  const shape = Object.fromEntries(Object.entries(sections).map(([name, texts]) => [name, sectionSchema(texts)]))
  return z.strictObject(shape, { error: objectError })
}

/** Schema for `messages` overrides: texts of each locale, keyed by BCP 47 language tag. */
export function messagesOverridesSchema(dictionary: Messages): z.ZodType<MessagesOverrides, MessagesOverrides> {
  const locale = z.string().refine(isLocaleTag)
  return z.record(locale, localeMessagesSchema(dictionary).optional(), {
    error: (issue) =>
      issue.code === 'invalid_key' ? 'is not a BCP 47 language tag like "pl" or "pt-BR"' : 'must be an object',
  })
}
