# @onetodone/mailer

## 0.2.3

### Patch Changes

- f993009: Add built-in text in Belarusian (Latin).
  
  - `Locale` gains `be-Latn`. The `locale` setting and the `locale` option of `send` and `render` accept it without `messages`.
  - If you already send in Belarusian (Latin) through `messages`, your overrides still win, and the keys you leave out come from the built-in text instead of English.

## 0.2.2

### Patch Changes

- 51208d0: Add built-in texts in Czech, Estonian, French, Georgian, German, Italian, Japanese, Latvian, Lithuanian, Polish, Romanian, Thai and Ukrainian.
  
  - `Locale` gains `cs`, `de`, `et`, `fr`, `it`, `ja`, `ka`, `lt`, `lv`, `pl`, `ro`, `th` and `uk`. The `locale` setting and the `locale` option of `send` and `render` accept them without `messages`.
  - The texts address the reader politely (`Sie`, `vous`, `vy`, `ви` and so on), except Polish and Italian, which use the informal form common in apps there. Reword any text through `messages`.
  - If you already send in one of these languages through `messages`, your overrides still win, and the keys you leave out come from the built-in texts instead of English.

## 0.2.1

### Patch Changes

- 817dab4: Document the semver policy of the `Locale` type: built-in locales can be added in any release.
  
  - `Locale` lists the built-in locales and gains values whenever a built-in locale is added, in any release, so code that requires every `Locale` value (such as `Record<Locale, …>`) is not covered by semver.
  - If you already use a locale through `messages` and it becomes built-in, your overrides still win; keys you did not override come from the built-in texts instead of English.
- 1f1d989: Add per-locale texts to custom templates.
  
  - `defineTemplate` accepts `messages`: the template's texts by locale. `en` is required and lists every text key; other locales may leave keys out, which fall back to English key by key. Plural forms are not supported in template texts.
  - In a template with `messages`, `t` and `t.html` take the template's own keys under its name, such as `t('invoice.subject', { number })`, plus the `common` keys, and reject any other key at compile time. A template without `messages` keeps `t` for every built-in key.
  - The `messages` setting of `createMailer` overrides the texts of registered custom templates under their names, with the same English fallback as the built-in texts. `MessagesOverrides<typeof templates>` and `LocaleMessages<typeof templates>` type such overrides outside the `createMailer` call.
  - A custom template with `messages` that replaces a built-in template also replaces the built-in texts of that template in every locale.
  - `createMailer` throws `INVALID_CONFIG` for template texts that are not strings, a missing `en`, a key that `en` does not have, a locale that is neither built-in nor a key of `messages`, and a template with `messages` named `common` or containing a dot.
  - Types `TemplateMessages` and `TemplateTexts`. `Template`, `TemplateRenderContext`, `Translate`, `MessagesOverrides` and `LocaleMessages` take optional type parameters, and `TemplateProps` accepts templates with `messages`.

## 0.2.0

### Minor Changes

- 7bc8714: Add built-in emails that confirm an account deletion and tell the owner once the account is deleted.
  
  - `confirmAccountDeletion` asks the owner to confirm the deletion with a button to `confirmUrl`, and warns that a deleted account and its data can't be restored. Props: `confirmUrl`, `userName`, `expiresInMinutes` (`ConfirmAccountDeletionProps`).
  - `accountDeleted` tells the owner that the account was deleted, with a way to contact support if it wasn't them (`supportUrl`, else `branding.supportEmail`). Every prop is optional: `userName`, `supportUrl` (`AccountDeletedProps`).
  - Texts in English and Belarusian, overridable through `messages` in the `confirmAccountDeletion` and `accountDeleted` sections. Apps that keep deleted accounts for a grace period can reword `confirmAccountDeletion.warning` and `accountDeleted.farewell`.
- 45611f1: Add built-in templates for changing the email address.
  
  - `verifyEmailChange` goes to the new address and asks the user to confirm it. Props: `verifyUrl`, `userName`, `expiresInMinutes` (`VerifyEmailChangeProps`).
  - `emailChangeRequested` goes to the current address when a change is requested. It names `newEmail` and offers a button that cancels the change (`cancelUrl`), or a way to contact support without it (`supportUrl`, else `branding.supportEmail`). Props: `newEmail`, `userName`, `requestedAt`, `timeZone`, `ip`, `cancelUrl`, `supportUrl` (`EmailChangeRequestedProps`).
  - `emailChanged` goes to the old address once the change is done, with a way to contact support. Every prop is optional: `userName`, `newEmail`, `changedAt`, `timeZone`, `ip`, `supportUrl` (`EmailChangedProps`).
  - `newEmail` accepts any non-empty text, so a masked address such as `l***@example.com` works.
  - Texts in English and Belarusian, overridable through `messages` in the `verifyEmailChange`, `emailChangeRequested` and `emailChanged` sections.
  - `Messages` describes the full built-in dictionary and gains keys whenever built-in templates are added, in any release, so a full dictionary typed as `Messages` is not covered by semver. Use `MessagesOverrides` (or `LocaleMessages` for one locale) for your own texts; keys you leave out fall back to English.
  - Polish the Belarusian wording of the `resetPassword` intro: «Націсніце кнопку, каб задаць новы пароль.»
  - Migration: if you type a full dictionary as `Messages`, add the `verifyEmailChange`, `emailChangeRequested` and `emailChanged` sections, or check it with `satisfies MessagesOverrides` instead, so that missing keys fall back to English.
- ffa8d14: Add built-in security notices for new sign-ins, two-factor authentication changes and locked accounts.
  
  - `newSignIn` tells the owner about a sign-in, such as from a new device, and lists `signedInAt`, `device`, `location` and `ip` when you pass them. It offers a button to a page that secures the account (`secureUrl`), or a way to contact support without it (`supportUrl`, else `branding.supportEmail`). Every prop is optional: `userName`, `signedInAt`, `timeZone`, `ip`, `device`, `location`, `secureUrl`, `supportUrl` (`NewSignInProps`).
  - `twoFactorEnabled` and `twoFactorDisabled` tell the owner that two-factor authentication was turned on or off, with a way to contact support. Every prop is optional: `userName`, `changedAt`, `timeZone`, `ip`, `supportUrl` (`TwoFactorEnabledProps`, `TwoFactorDisabledProps`).
  - `accountLocked` tells the owner that the account was locked after too many failed sign-in attempts, shows `lockedUntil` and `ip` when you pass them, and offers a button that unlocks the account (`unlockUrl`), or help from support without it (`supportUrl`, else `branding.supportEmail`). It ends with advice to choose a new password for owners who did not try to sign in. Every prop is optional: `userName`, `lockedUntil`, `timeZone`, `ip`, `unlockUrl`, `supportUrl` (`AccountLockedProps`).
  - Texts in English and Belarusian, overridable through `messages` in the `newSignIn`, `twoFactorEnabled`, `twoFactorDisabled` and `accountLocked` sections.
- a32a33f: Add built-in templates for one-time codes, sign-in links and welcome emails.
  
  - `otpCode` sends a one-time code for sign-in, two-step verification or confirming an action. Props: `code`, `userName`, `expiresInMinutes` (`OtpCodeProps`). The subject and inbox preview leave out the code, because they show in notifications and on lock screens; both texts accept `{code}`, so a `messages` override can add it.
  - `magicLink` sends a link that signs the user in without a password and tells the reader not to share it. Props: `signInUrl`, `userName`, `expiresInMinutes` (`MagicLinkProps`).
  - `welcome` greets a new user with a button to `ctaUrl`, or to `branding.appUrl` without it. Every prop is optional: `userName`, `ctaUrl` (`WelcomeProps`).
  - Texts in English and Belarusian, overridable through `messages` in the `otpCode`, `magicLink` and `welcome` sections.

### Patch Changes

- 99f9462: Add attachments and inline images.
  
  - `mailer.send` accepts `attachments`: files with a `filename`, `content` (a `Buffer`, a `Uint8Array`, or text sent as UTF-8), an optional `contentType` and an optional `cid`. Without `contentType`, the type is guessed from the file name extension, with `application/octet-stream` as the fallback, and text content gets `; charset=utf-8`.
  - An attachment with a `cid` is an inline image that the HTML shows through `cid:<cid>`. After rendering, `send` checks the HTML, layout included, and rejects with `INVALID_OPTIONS` naming every `cid:` reference without an attachment, before anything is sent. An attachment whose `cid` the HTML never references is sent as a regular attachment.
  - `ui.image(src, { alt, width, height })` shows an image from an absolute `http:` or `https:` URL, or an attachment through a `cid:` reference. It renders email-safe markup with an explicit width (534 px, the content width, by default and at most), shrinks on narrow screens, and shows the alt text in the plain-text version. An invalid source throws `UNSAFE_URL`.
  - File names and content types with line breaks or other control characters are rejected with `INVALID_OPTIONS`, so attachments cannot inject MIME headers through any transport. Content types must be MIME types, and a `cid` uses ASCII letters, digits, `.`, `_`, `-` and `@` and is unique within an email.
  - `smtpTransport` delivers attachments, with inline images next to the HTML. `consoleTransport` prints the name, type and size of each attachment, and `memoryTransport` records them in `sent`.
  - `OutgoingMessage` has an optional `attachments` list, in which `contentType` is always set and `cid` is set only on referenced inline images. A custom transport must deliver every attachment or reject.
  - Hook events list the `filename`, `contentType` and `size` of each attachment, never its content.
  - Types `Attachment`, `OutgoingAttachment`, `AttachmentInfo` and `ImageOptions`.

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
