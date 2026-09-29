import type { z } from 'zod'

/**
 * Machine-readable reason attached to every {@link MailerError}.
 *
 * - `INVALID_CONFIG`: branding, theme or another setting failed validation.
 * - `INVALID_OPTIONS`: the options passed to `send` or `render` failed
 *   validation, such as an address, a header, an attachment or the locale,
 *   or the HTML references a `cid:` that no attachment has.
 * - `INVALID_PROPS`: template props failed schema validation. `cause` holds the
 *   Standard Schema issues.
 * - `TRANSPORT_FAILED`: the transport could not deliver the email. `cause`
 *   holds the transport's error.
 * - `UNKNOWN_TEMPLATE`: no template is registered under the requested name.
 * - `UNSAFE_URL`: a URL is not an absolute `http:` or `https:` link, or an
 *   image source is neither such a link nor a valid `cid:` reference.
 */
export type MailerErrorCode =
  'INVALID_CONFIG' | 'INVALID_OPTIONS' | 'INVALID_PROPS' | 'TRANSPORT_FAILED' | 'UNKNOWN_TEMPLATE' | 'UNSAFE_URL'

/**
 * The error type thrown by the mailer. Check `code` to branch on the reason;
 * `cause` holds the underlying error when there is one.
 *
 * @example
 * try {
 *   safeUrl(input)
 * } catch (error) {
 *   if (error instanceof MailerError && error.code === 'UNSAFE_URL') {
 *     // handle
 *   }
 * }
 */
export class MailerError extends Error {
  override readonly name = 'MailerError'

  /** Machine-readable reason for the failure. */
  readonly code: MailerErrorCode

  /**
   * @param code - Machine-readable reason for the failure.
   * @param message - Human-readable description.
   * @param options - Standard error options, such as `cause`.
   */
  constructor(code: MailerErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.code = code
  }
}

function parse<T extends z.ZodType>(
  schema: T,
  input: unknown,
  code: MailerErrorCode,
  subject: string,
  root?: string,
): z.output<T> {
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const details = result.error.issues.map((issue) => {
    const path = [...(root === undefined ? [] : [root]), ...issue.path.map(String)].join('.')
    return path === '' ? issue.message : `${path} ${issue.message}`
  })
  throw new MailerError(code, `Invalid ${subject}: ${details.join('; ')}.`, { cause: result.error })
}

export function parseConfig<T extends z.ZodType>(schema: T, input: unknown, root?: string): z.output<T> {
  return parse(schema, input, 'INVALID_CONFIG', 'mailer configuration', root)
}

export function parseOptions<T extends z.ZodType>(schema: T, input: unknown, method: string): z.output<T> {
  return parse(schema, input, 'INVALID_OPTIONS', `${method} options`)
}
