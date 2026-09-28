# @onetodone/mailer

## 0.1.1

### Patch Changes

- d50257b: Remove source maps from the published package, which halves its unpacked size. The JavaScript and type declarations are unchanged apart from their `sourceMappingURL` comments. The JavaScript is not minified, so stack traces that point into `dist` stay readable.

## 0.1.0

### Minor Changes

- 894134a: First public release: typed transactional emails for Node.js. It ships built-in templates for email verification, password reset and password change notices, branding from configuration, English and Belarusian texts with overrides and extra locales, custom layouts and templates, and SMTP, memory and console transports. The README covers setup and every customization level.

### Patch Changes

- 4a50654: Add `createMailer`, the entry point for sending emails.
  
  - `createMailer(config)` validates every setting when it is called, so a wrong setting fails at startup with `INVALID_CONFIG` instead of on the first send. Settings: `transport`, `from`, and optionally `replyTo`, `locale`, `timeZone`, `branding`, `messages`, `layout`, `templates`, `onSent` and `onError`.
  - `mailer.send(name, { to, cc, bcc, replyTo, headers, locale, props })` renders a template and hands it to the transport. It resolves with the transport's result. `props` can be left out when every prop of the template is optional, as for `passwordChanged`.
  - `mailer.render(name, { locale, props })` returns `{ subject, html, text }` without sending, for previews and tests.
  - `mailer.close()` closes the transport, such as an SMTP connection pool.
  - Templates from `defineTemplate` passed in `templates` are added to the built-in ones or replace a built-in one with the same name. `send` and `render` accept only registered names and check each template's props at compile time. A template's `name` must match its key.
  - `messages` overrides texts key by key and can add locales without built-in texts, such as `pl`, which fall back to English. The `locale` setting and the per-call `locale` accept the built-in locales and the keys of `messages`. Unknown text keys and invalid locale tags fail validation.
  - Addresses can be `user@example.com`, `Name <user@example.com>` or `{ name, address }`, one or a list, and reach the transport exactly as passed. Line breaks in addresses, display names and header values are rejected, and header names must be printable ASCII without spaces or colons, which blocks header injection with any transport.
  - `MailerError` code `INVALID_OPTIONS` for invalid `send` and `render` options. Errors from custom transports are wrapped in `TRANSPORT_FAILED` with the error as `cause`; a `MailerError` from the transport passes through.
  - `onSent` and `onError` hooks receive the template name, locale, addresses, subject, headers and duration, plus the transport result or the error. Events never contain the email body or the props, so they are safe to log. `send` waits for the hooks, but a failing hook never changes its outcome; the failure is reported with `process.emitWarning` as a `MailerWarning`.
  - Types `Mailer`, `MailerConfig`, `SendOptions`, `RenderOptions`, `RenderedEmail`, `MailEvent`, `MailSentEvent`, `MailErrorEvent`, `MessagesOverrides`, `LocaleMessages`, and the props of the built-in templates: `VerifyEmailProps`, `ResetPasswordProps` and `PasswordChangedProps`.
  - `Branding` and `ThemeInput` show field documentation in editors.
- b1c2ccd: Add the email rendering core.
  
  - `html` tagged template that escapes every interpolated value, `raw()` for trusted markup, and `safeUrl()`, which accepts only absolute `http:` and `https:` links.
  - `MailerError` with a machine-readable `code` (`INVALID_CONFIG`, `UNSAFE_URL`).
  - `defaultLayout`: a 600px table-based layout with inline styles, a hidden preheader, a `color-scheme` meta tag, the logo or company name in the header, and a footer with footer text, a support link and a copyright line. Every email also gets a plain-text version.
  - `defineLayout` for custom layouts, with types for the layout context, branding and theme tokens.
  - Content blocks (`heading`, `paragraph`, `button`, `linkFallback`, `code`, `note`, `divider`, `spacer`, `raw`) that render to HTML and plain text. The button renders in Outlook through a VML fallback.
  - Branding and theme validation: HEX colors, http(s) URLs and email addresses are checked, and every theme token has a default.
- 15d55e2: Add email templates and translations.
  
  - `defineTemplate` declares a template from a name, a props schema and a render function. Props are validated with any Standard Schema library (zod 4, valibot, arktype): callers pass the schema input, and `render` receives the validated output. The render context provides `props`, `ui` blocks, `t` for texts, `format` for durations and dates, `locale`, `branding` and `theme`.
  - Built-in templates `verifyEmail`, `resetPassword` and `passwordChanged`, with texts in English (default) and Belarusian. `passwordChanged` accepts a `timeZone` prop for the change time (UTC by default).
  - Texts can be overridden key by key; a locale falls back to English for any key it leaves out. `t` fills `{name}` placeholders (with `{companyName}` always available), and `t.html` escapes the text and plain values while inserting markup from the `html` tag as-is. Durations use the plural rules of the locale.
  - `MailerError` codes `INVALID_PROPS` (with the schema issues as `cause`) and `UNKNOWN_TEMPLATE`.
  - Types `Template`, `TemplateContent`, `TemplateProps`, `TemplateRenderContext`, `Translate`, `Formatters`, `Messages`, `MessageKey` and `Locale`.
  - The plain-text version of a `mailto:` link shows the bare address.
- 5347fbc: Add mail transports.
  
  - `MailTransport` interface for delivering rendered emails through any provider, with the `OutgoingMessage`, `SendResult`, `MailAddress` and `MailAddresses` types. Addresses can be strings (`user@example.com`, `My App <no-reply@myapp.loc>`) or `{ name, address }` objects, one or a list, with `cc`, `bcc`, `replyTo` and custom `headers`.
  - `memoryTransport()` records emails in `sent` instead of sending them, with `clear()` to reset between tests.
  - `consoleTransport()` prints the addresses, subject and plain-text version of each email, for local development. Pass `log` to send the output somewhere else.
  - `smtpTransport()` from `@onetodone/mailer/smtp` sends over SMTP with nodemailer (optional peer dependency, `>=6`). It accepts connection settings (host, port, TLS, credentials, pooling, timeouts), which are validated when the transport is created, or an existing `nodemailer.createTransport()` transporter for setups such as DKIM or OAuth2. `close()` releases pooled connections. The main entry does not load nodemailer.
  - `MailerError` code `TRANSPORT_FAILED`: SMTP failures reject with it, and `cause` holds nodemailer's error.
