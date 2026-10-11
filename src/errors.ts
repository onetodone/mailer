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
 *
 * Codes may be added in a minor release, so a `switch` over them needs a
 * `default` branch. Existing codes keep their meaning.
 */
export type MailerErrorCode =
  'INVALID_CONFIG' | 'INVALID_OPTIONS' | 'INVALID_PROPS' | 'TRANSPORT_FAILED' | 'UNKNOWN_TEMPLATE' | 'UNSAFE_URL'

const brand = Symbol.for('@onetodone/mailer/MailerError')

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
  static {
    Object.defineProperty(this.prototype, brand, { value: true })
  }

  // Checked by brand rather than the prototype chain, so errors from the ESM and CJS
  // builds of this package match either class when both are loaded.
  /** Whether `value` is a `MailerError`, from either the ESM or the CJS build of this package. */
  static [Symbol.hasInstance](value: unknown): value is MailerError {
    if (this !== MailerError) return Function.prototype[Symbol.hasInstance].call(this, value)
    return typeof value === 'object' && value !== null && (value as { readonly [brand]?: unknown })[brand] === true
  }

  /** Always `'MailerError'`. */
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
