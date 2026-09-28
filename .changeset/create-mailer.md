---
'@onetodone/mailer': patch
---

Add `createMailer`, the entry point for sending emails.

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
