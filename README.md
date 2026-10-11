# Mailer from OneToDone

`@onetodone/mailer` sends transactional emails from Node.js applications. Configure your branding once (logo, company name, colors, footer) and send any email with a single typed call. The package ships with ready-made templates for common account flows. Every email renders to table-based HTML that holds up across major email clients and comes with a plain-text version. Texts are localizable, built-in templates can be restyled, reworded or replaced, and your own templates get the same typed API.

![Three emails sent with @onetodone/mailer: email verification, a one-time code and a new sign-in notice](https://raw.githubusercontent.com/onetodone/mailer/main/docs/images/hero.png)

Screenshots of every email are in [Built-in templates](https://github.com/onetodone/mailer/blob/main/docs/templates.md).

## Features

- Built-in templates for email verification, welcome emails, one-time codes, sign-in links, password reset, email address changes, security notices and account deletion.
- One call to send an email. Template names autocomplete, and props are checked at compile time and validated at runtime.
- Branding from configuration: logo, company name, colors, footer text and support address.
- Built-in texts in [many languages](https://github.com/onetodone/mailer/blob/main/docs/locales.md). Override any text, or add a locale that falls back to English key by key.
- Custom layouts and templates with the same typed API. Props are validated with any [Standard Schema](https://standardschema.dev) library, such as zod, valibot or arktype, and custom templates can bring their own texts per locale, plural forms included.
- Table-based HTML with inline styles and an Outlook button fallback, plus a plain-text version of every email.
- Attachments, such as invoices, and inline images through `cid:` for pictures without a public URL, such as QR codes.
- SMTP delivery through nodemailer, memory and console transports for tests and development, or a transport of your own.
- Safe defaults: interpolated values are escaped, links must be `http:` or `https:`, header injection is rejected, and hook events never contain the email body or attachment content.

## Requirements

- Node.js 22 or later.
- ESM or CommonJS. Type declarations are included and need TypeScript 5.4 or later.
- [nodemailer](https://nodemailer.com) 6 or later, only for SMTP delivery through `@onetodone/mailer/smtp`.

## Install

```sh
npm install @onetodone/mailer
```

For SMTP delivery, also install nodemailer:

```sh
npm install nodemailer
```

## Quick start

Create one mailer for your application:

```ts
// mailer.ts
import { createMailer } from '@onetodone/mailer'
import { smtpTransport } from '@onetodone/mailer/smtp'

export const mailer = createMailer({
  transport: smtpTransport({
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  }),
  from: 'My App <no-reply@example.com>',
  branding: {
    companyName: 'My App',
    appUrl: 'https://example.com',
    supportEmail: 'support@example.com',
  },
})
```

Then send emails from anywhere in your code:

```ts
import { mailer } from './mailer'

await mailer.send('verifyEmail', {
  to: 'lizzie@example.com',
  props: {
    userName: 'Lizzie',
    verifyUrl: 'https://example.com/verify?token=abc123',
    expiresInMinutes: 1440,
  },
})
```

`createMailer` validates every setting when it is called. A typo or an invalid value throws a `MailerError` with code `INVALID_CONFIG` at startup, not on the first send.

Call `await mailer.close()` on shutdown to close the SMTP connections.

In CommonJS, use `require`:

```js
const { createMailer } = require('@onetodone/mailer')
const { smtpTransport } = require('@onetodone/mailer/smtp')
```

## Documentation

- [Built-in templates](https://github.com/onetodone/mailer/blob/main/docs/templates.md): when to send each template, and its props.
- [Sending emails](https://github.com/onetodone/mailer/blob/main/docs/sending.md): send options, address forms, attachments and inline images, and rendering without sending.
- [Configuration](https://github.com/onetodone/mailer/blob/main/docs/configuration.md): every setting of `createMailer`.
- [Customization](https://github.com/onetodone/mailer/blob/main/docs/customization.md): branding and theme, layout, and your own templates with their texts.
- [Texts and locales](https://github.com/onetodone/mailer/blob/main/docs/locales.md): built-in languages, text overrides and your own locales.
- [Transports](https://github.com/onetodone/mailer/blob/main/docs/transports.md): SMTP, console, memory and your own transport.
- [Testing](https://github.com/onetodone/mailer/blob/main/docs/testing.md): tests with `memoryTransport` and `render`.
- [Recipes](https://github.com/onetodone/mailer/blob/main/docs/recipes.md): Better Auth, Auth.js, Express, Fastify, Next.js, NestJS and background jobs.
- [Hooks](https://github.com/onetodone/mailer/blob/main/docs/hooks.md): `onSent` and `onError` for logging and metrics.
- [Errors](https://github.com/onetodone/mailer/blob/main/docs/errors.md): `MailerError` codes and retries.
- [Security](https://github.com/onetodone/mailer/blob/main/docs/security.md): escaping, link and header checks, and email client support.

## Versioning

The package follows [semantic versioning](https://semver.org). While the version is 0.x, breaking changes bump the minor version, so npm's default `^0.1.0` range stays within 0.1.x. Changes are listed in the [changelog](https://github.com/onetodone/mailer/blob/main/CHANGELOG.md) and in the [GitHub releases](https://github.com/onetodone/mailer/releases).

## License

[MIT](LICENSE)
