# Mailer from OneToDone

`@onetodone/mailer` sends transactional emails from Node.js applications. Configure your branding once (logo, company name, colors, footer) and send any email with a single typed call. The package ships with ready-made templates for common account flows. Every email renders to table-based HTML that holds up across major email clients and comes with a plain-text version. Texts are localizable, built-in templates can be restyled, reworded or replaced, and your own templates get the same typed API.

- [Features](#features)
- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Built-in templates](#built-in-templates)
- [Sending emails](#sending-emails)
- [Configuration](#configuration)
- [Customization](#customization): [branding and theme](#1-branding-and-theme), [texts and locales](#2-texts-and-locales), [layout](#3-layout), [templates](#4-templates)
- [Transports](#transports)
- [Testing](#testing)
- [Hooks](#hooks)
- [Errors](#errors)
- [Security](#security)
- [Email client support](#email-client-support)
- [Versioning](#versioning)

## Features

- Built-in templates for email verification, welcome emails, one-time codes, sign-in links, password reset, email address changes and security notices.
- One call to send an email. Template names autocomplete, and props are checked at compile time and validated at runtime.
- Branding from configuration: logo, company name, colors, footer text and support address.
- Texts in English and Belarusian. Override any text, or add a locale that falls back to English key by key.
- Custom layouts and templates with the same typed API. Props are validated with any [Standard Schema](https://standardschema.dev) library, such as zod, valibot or arktype.
- Table-based HTML with inline styles and an Outlook button fallback, plus a plain-text version of every email.
- Attachments, such as invoices, and inline images through `cid:` for pictures without a public URL, such as QR codes.
- SMTP delivery through nodemailer, memory and console transports for tests and development, or a transport of your own.
- Safe defaults: interpolated values are escaped, links must be `http:` or `https:`, header injection is rejected, and hook events never contain the email body or attachment content.

## Requirements

- Node.js 22 or later.
- ESM or CommonJS. Type declarations are included.
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

## Built-in templates

| Template               | When to send it                                                                                                | Subject in English                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `verifyEmail`          | A user signed up and needs to confirm their email address                                                      | Confirm your email                       |
| `resetPassword`        | A user asked to reset a forgotten password                                                                     | Reset your password                      |
| `passwordChanged`      | A password was changed, so the owner can act if it was not them                                                | Your password was changed                |
| `verifyEmailChange`    | A user asked to change their email; sent to the new address to confirm it                                      | Confirm your new email                   |
| `emailChangeRequested` | A user asked to change their email; sent to the current address, so the owner can cancel it if it was not them | Email change requested                   |
| `emailChanged`         | The email was changed; sent to the old address, so the owner can act if it was not them                        | Your email was changed                   |
| `otpCode`              | A user needs a one-time code, such as for sign-in, two-step verification or confirming an action               | Your verification code                   |
| `magicLink`            | A user signs in with a link instead of a password                                                              | Your sign-in link                        |
| `welcome`              | A new account is ready                                                                                         | Welcome to {companyName}                 |
| `newSignIn`            | Someone signed in to an account, such as from a new device, so the owner can act if it was not them            | New sign-in to your account              |
| `twoFactorEnabled`     | Two-factor authentication was turned on, so the owner can act if it was not them                               | Two-factor authentication was turned on  |
| `twoFactorDisabled`    | Two-factor authentication was turned off, so the owner can act if it was not them                              | Two-factor authentication was turned off |
| `accountLocked`        | An account was locked after too many failed sign-in attempts                                                   | Your account is locked                   |

Each email has an inbox preview text, a heading, a greeting and a short explanation. Where there is a link, it adds a button and the same link as plain text for readers whose button does not work. Every email except `welcome` ends with a note for recipients who did not ask for it.

### `verifyEmail`

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `verifyUrl`        | `string` | yes      | Absolute `http:` or `https:` link that confirms the address.                        |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

### `resetPassword`

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `resetUrl`         | `string` | yes      | Absolute `http:` or `https:` link to the page where the user sets a new password.   |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

### `passwordChanged`

Every prop is optional, so `props` can be left out.

| Prop         | Type     | Description                                                                                                                         |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `userName`   | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                                   |
| `changedAt`  | `Date`   | When the password was changed.                                                                                                      |
| `timeZone`   | `string` | IANA time zone for `changedAt`, such as `Europe/Berlin`. Default: the mailer's `timeZone`, which is UTC unless you set it.          |
| `ip`         | `string` | IP address the change came from.                                                                                                    |
| `supportUrl` | `string` | Absolute `http:` or `https:` link to your support page, shown as a button. Without it, the email points to `branding.supportEmail`. |

```ts
await mailer.send('passwordChanged', { to: 'lizzie@example.com' })

await mailer.send('passwordChanged', {
  to: 'lizzie@example.com',
  props: {
    userName: 'Lizzie',
    changedAt: new Date(),
    timeZone: 'Europe/Berlin',
    ip: '203.0.113.7',
    supportUrl: 'https://example.com/support',
  },
})
```

### `verifyEmailChange`

Send it to the new address. The account keeps its current email until the link is opened.

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `verifyUrl`        | `string` | yes      | Absolute `http:` or `https:` link that confirms the new address.                    |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

### `emailChangeRequested`

Send it to the current address when the change is requested, so the owner can stop a change they did not make.

| Prop          | Type     | Required | Description                                                                                                                                                          |
| ------------- | -------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newEmail`    | `string` | yes      | The address the account is moving to. Any non-empty text, so you can pass a masked address such as `l***@example.com`.                                               |
| `userName`    | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                                                                    |
| `requestedAt` | `Date`   | no       | When the change was requested.                                                                                                                                       |
| `timeZone`    | `string` | no       | IANA time zone for `requestedAt`, such as `Europe/Berlin`. Default: the mailer's `timeZone`, which is UTC unless you set it.                                         |
| `ip`          | `string` | no       | IP address the request came from.                                                                                                                                    |
| `cancelUrl`   | `string` | no       | Absolute `http:` or `https:` link that cancels the change, shown as a button. Without it, the email points to support.                                               |
| `supportUrl`  | `string` | no       | Absolute `http:` or `https:` link to your support page, shown as a button when there is no `cancelUrl`. Without either, the email points to `branding.supportEmail`. |

### `emailChanged`

Send it to the old address once the new one is confirmed. Every prop is optional, so `props` can be left out.

| Prop         | Type     | Description                                                                                                                                            |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `userName`   | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                                                      |
| `newEmail`   | `string` | The new address. Any non-empty text, so you can pass a masked address such as `l***@example.com`. Without it, the email does not name the new address. |
| `changedAt`  | `Date`   | When the email was changed.                                                                                                                            |
| `timeZone`   | `string` | IANA time zone for `changedAt`, such as `Europe/Berlin`. Default: the mailer's `timeZone`, which is UTC unless you set it.                             |
| `ip`         | `string` | IP address the change came from.                                                                                                                       |
| `supportUrl` | `string` | Absolute `http:` or `https:` link to your support page, shown as a button. Without it, the email points to `branding.supportEmail`.                    |

An email change uses all three:

```ts
// When the user asks for the change
await mailer.send('emailChangeRequested', {
  to: 'lizzie@example.com',
  props: { newEmail: 'lizzie.new@example.com', cancelUrl: 'https://example.com/email/cancel?token=abc123' },
})
await mailer.send('verifyEmailChange', {
  to: 'lizzie.new@example.com',
  props: { verifyUrl: 'https://example.com/email/verify?token=def456', expiresInMinutes: 1440 },
})

// Once the new address is confirmed
await mailer.send('emailChanged', {
  to: 'lizzie@example.com',
  props: { newEmail: 'lizzie.new@example.com', changedAt: new Date() },
})
```

### `otpCode`

A one-time code for any purpose, such as sign-in, two-step verification or confirming an action.

| Prop               | Type     | Required | Description                                                                                   |
| ------------------ | -------- | -------- | --------------------------------------------------------------------------------------------- |
| `code`             | `string` | yes      | The code to enter, such as `482913`. Codes of up to 8 characters fit on narrow phone screens. |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.             |
| `expiresInMinutes` | `number` | no       | How long the code works, in minutes. Without it, the email does not mention expiry.           |

```ts
await mailer.send('otpCode', {
  to: 'lizzie@example.com',
  props: { code: '482913', expiresInMinutes: 10 },
})
```

The subject and the inbox preview leave out the code, because they show in notifications and on lock screens. Both texts accept `{code}`, so a [text override](#2-texts-and-locales) such as `{ en: { otpCode: { subject: 'Your code: {code}' } } }` puts it back.

### `magicLink`

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `signInUrl`        | `string` | yes      | Absolute `http:` or `https:` link that signs the user in.                           |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

Anyone who has the link can sign in, and the email tells the reader not to share it. Make the link work once and for a short time, such as 15 minutes.

### `welcome`

Send it once the account is ready, for example after the email address is confirmed. Every prop is optional, so `props` can be left out.

| Prop       | Type     | Description                                                                                                                |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `userName` | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                          |
| `ctaUrl`   | `string` | Absolute `http:` or `https:` link behind the "Get started" button, such as an onboarding page. Default: `branding.appUrl`. |

```ts
await mailer.send('welcome', { to: 'lizzie@example.com', props: { userName: 'Lizzie' } })
```

### `newSignIn`

Send it when someone signs in to the account, for example from a device or place the account has not used before. Every prop is optional, so `props` can be left out.

| Prop         | Type     | Description                                                                                                                                                                                                   |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userName`   | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                                                                                                             |
| `signedInAt` | `Date`   | When the sign-in happened.                                                                                                                                                                                    |
| `timeZone`   | `string` | IANA time zone for `signedInAt`, such as `Europe/Berlin`. Default: the mailer's `timeZone`, which is UTC unless you set it.                                                                                   |
| `ip`         | `string` | IP address the sign-in came from.                                                                                                                                                                             |
| `device`     | `string` | Device or browser of the sign-in, such as `Chrome on macOS`.                                                                                                                                                  |
| `location`   | `string` | Approximate location of the sign-in, such as `Berlin, Germany`.                                                                                                                                               |
| `secureUrl`  | `string` | Absolute `http:` or `https:` link to a page where the owner secures the account, such as by changing the password and signing out other sessions, shown as a button. Without it, the email points to support. |
| `supportUrl` | `string` | Absolute `http:` or `https:` link to your support page, shown as a button when there is no `secureUrl`. Without either, the email points to `branding.supportEmail`.                                          |

```ts
await mailer.send('newSignIn', {
  to: 'lizzie@example.com',
  props: {
    signedInAt: new Date(),
    device: 'Chrome on macOS',
    location: 'Berlin, Germany',
    ip: '203.0.113.7',
    secureUrl: 'https://example.com/security',
  },
})
```

The email shows `device` and `location` as you pass them, for example from the user agent and an IP geolocation lookup.

### `twoFactorEnabled` and `twoFactorDisabled`

Send them when two-factor authentication is turned on or off for an account. Both take the same props. Every prop is optional, so `props` can be left out.

| Prop         | Type     | Description                                                                                                                         |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `userName`   | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                                   |
| `changedAt`  | `Date`   | When two-factor authentication was turned on or off.                                                                                |
| `timeZone`   | `string` | IANA time zone for `changedAt`, such as `Europe/Berlin`. Default: the mailer's `timeZone`, which is UTC unless you set it.          |
| `ip`         | `string` | IP address the change came from.                                                                                                    |
| `supportUrl` | `string` | Absolute `http:` or `https:` link to your support page, shown as a button. Without it, the email points to `branding.supportEmail`. |

```ts
await mailer.send('twoFactorDisabled', {
  to: 'lizzie@example.com',
  props: { changedAt: new Date(), ip: '203.0.113.7' },
})
```

### `accountLocked`

Send it when the account is locked after too many failed sign-in attempts. Every prop is optional, so `props` can be left out.

| Prop          | Type     | Description                                                                                                                                                          |
| ------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `userName`    | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                                                                    |
| `lockedUntil` | `Date`   | When the lock ends. Without it, the email does not say when.                                                                                                         |
| `timeZone`    | `string` | IANA time zone for `lockedUntil`, such as `Europe/Berlin`. Default: the mailer's `timeZone`, which is UTC unless you set it.                                         |
| `ip`          | `string` | IP address the failed sign-in attempts came from.                                                                                                                    |
| `unlockUrl`   | `string` | Absolute `http:` or `https:` link that unlocks the account, shown as a button. Without it, the email offers help from support.                                       |
| `supportUrl`  | `string` | Absolute `http:` or `https:` link to your support page, shown as a button when there is no `unlockUrl`. Without either, the email points to `branding.supportEmail`. |

```ts
await mailer.send('accountLocked', {
  to: 'lizzie@example.com',
  props: { lockedUntil: new Date(Date.now() + 30 * 60_000), ip: '203.0.113.7' },
})
```

The email ends with advice for owners who did not try to sign in: someone may be guessing the password, so choose a new one.

Durations are written in whole days (from 2 days on), hours or minutes, with the plural rules of the locale: `30` gives "30 minutes", `60` gives "1 hour", `1440` gives "24 hours" and `2880` gives "2 days". Dates include the time zone name, such as "May 4, 2026 at 9:30 AM UTC".

Props are checked twice. TypeScript reports missing, unknown or mistyped props, and at runtime invalid values, such as a `javascript:` link, throw a `MailerError` with code `INVALID_PROPS`.

## Sending emails

`mailer.send(template, options)` renders the template and hands the email to the transport. It resolves with the transport's result: `{ messageId, accepted?, rejected? }`.

| Option        | Description                                                                           |
| ------------- | ------------------------------------------------------------------------------------- |
| `to`          | Recipients: one address or a list. Required.                                          |
| `cc`          | Carbon-copy recipients.                                                               |
| `bcc`         | Blind carbon-copy recipients.                                                         |
| `replyTo`     | Where replies go. Replaces the mailer's `replyTo` for this email.                     |
| `headers`     | Extra message headers, such as `{ 'X-Entity-Ref-ID': 'order-1042' }`.                 |
| `attachments` | Files to attach and inline images. See [attachments](#attachments-and-inline-images). |
| `locale`      | Locale of this email. Default: the mailer's `locale`.                                 |
| `props`       | Template props. Can be left out when every prop of the template is optional.          |

An address is written in one of three forms: `'lizzie@example.com'`, `'Lizzie Smith <lizzie@example.com>'` or `{ name: 'Lizzie Smith', address: 'lizzie@example.com' }`. Any field that takes addresses also accepts a non-empty list of them. Addresses reach the transport exactly as you passed them.

```ts
await mailer.send('resetPassword', {
  to: { name: 'Lizzie Smith', address: 'lizzie@example.com' },
  replyTo: 'support@example.com',
  headers: { 'X-Entity-Ref-ID': 'reset-8f14e45f' },
  locale: 'be',
  props: { resetUrl: 'https://example.com/reset?token=abc123', expiresInMinutes: 30 },
})
```

The options are validated before anything is sent. These throw a `MailerError` with code `INVALID_OPTIONS`:

- a malformed address;
- a line break in an address, a display name or a header value;
- a header name with spaces, a colon or non-ASCII characters;
- an attachment without `filename` or `content`, a line break or another control character in a file name or content type, a content type that is not a MIME type, or an invalid or repeated `cid`;
- a `cid:` reference in the HTML without an attachment of that `cid`;
- an unknown locale or option.

### Attachments and inline images

Pass files in `attachments`, such as an invoice your application generated. `orderShipped` is the custom template from [templates](#4-templates):

```ts
import { readFile } from 'node:fs/promises'

await mailer.send('orderShipped', {
  to: 'lizzie@example.com',
  props: { orderId: '1042', trackUrl: 'https://example.com/orders/1042/tracking' },
  attachments: [
    { filename: 'invoice-1042.pdf', content: await readFile('invoices/1042.pdf') },
    { filename: 'items.csv', content: 'sku,quantity\nA-17,2\n' },
  ],
})
```

| Field         | Description                                                                                                                                                                                                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `filename`    | Required. File name the recipient sees.                                                                                                                                                                                                         |
| `content`     | Required. The file as a `Buffer` or `Uint8Array`, or text, which is sent as UTF-8.                                                                                                                                                              |
| `contentType` | MIME type, such as `application/pdf`. Default: guessed from the extension of `filename` (PDF, office documents, CSV, text, calendar, common images), or `application/octet-stream`. A guessed text type of text content gets `; charset=utf-8`. |
| `cid`         | Content-ID that makes the file an inline image, see below.                                                                                                                                                                                      |

There is no `path` option: read files yourself, so every transport receives the same data.

To show an image inside the email, such as a QR code generated for this recipient, attach it with a `cid` and reference it as `cid:<cid>`, for example with `ui.image` in a [custom template](#4-templates). Here `qrCodePng` is the image as a `Buffer`, such as the output of a QR code library:

```ts
import { createMailer, defineTemplate } from '@onetodone/mailer'
import { z } from 'zod'

const ticket = defineTemplate({
  name: 'ticket',
  schema: z.object({ eventName: z.string() }),
  render: ({ props, ui }) => ({
    subject: `Your ticket for ${props.eventName}`,
    body: [
      ui.heading(props.eventName),
      ui.paragraph('Show this code at the entrance:'),
      ui.image('cid:ticket-qr', { alt: 'Ticket QR code', width: 200, height: 200 }),
    ],
  }),
})

const mailer = createMailer({ transport, from, branding, templates: { ticket } })

await mailer.send('ticket', {
  to: 'lizzie@example.com',
  props: { eventName: 'Spring Meetup' },
  attachments: [{ filename: 'ticket.png', content: qrCodePng, cid: 'ticket-qr' }],
})
```

- A `cid` consists of ASCII letters, digits, `.`, `_`, `-` and `@`, and is unique within one email. References are case-sensitive.
- After rendering, `send` checks the whole HTML, layout included: every `cid:` reference needs an attachment with that `cid`. Otherwise `send` throws `INVALID_OPTIONS` naming the missing cid, and nothing is sent.
- An attachment whose `cid` the HTML never references is sent as a regular attachment.
- An image with a public URL needs no attachment: `ui.image('https://example.com/banner.png', { alt: 'Spring sale' })`.
- Use PNG, JPEG or GIF for images in emails: Gmail and Outlook do not show SVG.
- `render` takes no attachments and does not check `cid:` references.

### Rendering without sending

`mailer.render(template, options)` returns `{ subject, html, text }` without calling the transport or the hooks. Use it for previews, snapshot tests or your own delivery:

```ts
const { subject, html, text } = await mailer.render('resetPassword', {
  locale: 'be',
  props: { resetUrl: 'https://example.com/reset?token=abc123' },
})
```

## Configuration

| Setting     | Description                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `transport` | Required. Delivers the emails: `smtpTransport(…)`, `memoryTransport()`, `consoleTransport()` or [your own](#your-own-transport). |
| `from`      | Required. Sender of every email, in any [address form](#sending-emails).                                                         |
| `branding`  | Required. Company name, links, logo, footer text and theme. See [branding and theme](#1-branding-and-theme).                     |
| `replyTo`   | Default address or addresses for replies.                                                                                        |
| `locale`    | Default locale: `en` (the default), `be`, or a key of `messages`.                                                                |
| `timeZone`  | IANA time zone for dates in emails, such as `Europe/Berlin`. Default `UTC`.                                                      |
| `messages`  | Text overrides and extra locales. See [texts and locales](#2-texts-and-locales).                                                 |
| `layout`    | Replaces the built-in layout. See [layout](#3-layout).                                                                           |
| `templates` | Adds templates or replaces built-in ones. See [templates](#4-templates).                                                         |
| `onSent`    | Called after the transport accepted an email. See [hooks](#hooks).                                                               |
| `onError`   | Called when sending fails. See [hooks](#hooks).                                                                                  |

Unknown settings, such as `sender` instead of `from`, are rejected, so typos surface at startup. The error lists every problem at once, with the path to each setting:

```text
MailerError: Invalid mailer configuration: from must be an email address like "user@example.com" or "Name <user@example.com>", received "no-reply"; branding.theme.primary must be a HEX color like "#3b82f6", received "blue".
```

## Customization

There are four levels of customization, from a few settings to full control:

1. [Branding and theme](#1-branding-and-theme): logo, company name, colors and footer.
2. [Texts and locales](#2-texts-and-locales): reword any text or add a language.
3. [Layout](#3-layout): replace the header, footer and document around every email.
4. [Templates](#4-templates): add your own templates or replace built-in ones.

The examples below reuse `transport`, `from` and `branding` from the [quick start](#quick-start).

### 1. Branding and theme

```ts
import type { Branding } from '@onetodone/mailer'

const branding: Branding = {
  companyName: 'My App',
  appUrl: 'https://example.com',
  supportEmail: 'support@example.com',
  logoUrl: 'https://example.com/email/logo.png',
  logoWidth: 120,
  logoHeight: 32,
  footerText: 'You received this email because you signed up for My App.',
  theme: { primary: '#7c3aed', radius: 12 },
}
```

| Field          | Description                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `companyName`  | Required. Shown in the header when there is no logo, in the logo's alt text and in the copyright line. Texts can use it as `{companyName}`. |
| `appUrl`       | Required. Absolute `http:` or `https:` link behind the logo or company name.                                                                |
| `supportEmail` | Required. Address in the footer's support line.                                                                                             |
| `logoUrl`      | Absolute `http:` or `https:` URL of the logo image. Without it, the header shows the company name.                                          |
| `logoWidth`    | Logo width in pixels. Default `120`.                                                                                                        |
| `logoHeight`   | Logo height in pixels. Keeps the header's height while images are blocked.                                                                  |
| `footerText`   | Extra line at the top of the footer, such as why the recipient gets the email.                                                              |
| `theme`        | Colors and corner radius, all optional.                                                                                                     |

Theme colors are HEX values such as `#3b82f6` or `#fff`.

| Token         | Used for                                     | Default                                                     |
| ------------- | -------------------------------------------- | ----------------------------------------------------------- |
| `primary`     | Buttons and links                            | `#2563eb`                                                   |
| `primaryText` | Text on `primary`, such as button labels     | White, or `#18181b` when white is hard to read on `primary` |
| `background`  | Page around the email card                   | `#f4f4f5`                                                   |
| `surface`     | Email card                                   | `#ffffff`                                                   |
| `text`        | Main text                                    | `#18181b`                                                   |
| `mutedText`   | Notes, footer and fallback links             | `#71717a`                                                   |
| `border`      | Card border and dividers                     | `#e4e4e7`                                                   |
| `radius`      | Corner radius of the card and buttons, in px | `8`                                                         |

Tips for the logo:

- Use an absolute `https:` URL to a PNG. Many email clients do not display SVG.
- Set `logoWidth` and `logoHeight` to the displayed size, and serve an image twice that size so it stays sharp on high-density screens.
- A transparent PNG that reads well on both light and dark backgrounds holds up best when a client switches to dark mode.

### 2. Texts and locales

The built-in texts are in English (`en`, the default) and Belarusian (`be`). Set the default with `locale`, and the locale of a single email with the `locale` option of `send` or `render`.

`messages` overrides texts key by key. Every key you leave out keeps its built-in text:

```ts
const mailer = createMailer({
  transport,
  from,
  branding,
  messages: {
    en: {
      resetPassword: { subject: 'Forgot your password?' },
      common: { footerRights: 'All rights reserved worldwide.' },
    },
    be: {
      resetPassword: { subject: 'Аднаўленне доступу', heading: 'Забыліся пароль?' },
    },
  },
})
```

Placeholders in braces are filled in when the email renders. `{companyName}` works in every text, and some texts have their own placeholders (see the table below). An unknown text key throws `INVALID_CONFIG`.

To add a locale, add its tag to `messages`. It must be a BCP 47 tag such as `pl` or `pt-BR`. Every key the locale leaves out falls back to English, including your `en` overrides. `send`, `render` and the `locale` setting then accept the tag, and TypeScript rejects locales the mailer does not know:

```ts
const mailer = createMailer({
  transport,
  from,
  branding,
  locale: 'pl',
  messages: {
    pl: {
      common: {
        greeting: 'Cześć {name},',
        minutes: { one: '{count} minutę', few: '{count} minuty', many: '{count} minut', other: '{count} minuty' },
      },
      verifyEmail: {
        subject: 'Potwierdź swój adres e-mail',
        heading: 'Potwierdź swój adres e-mail',
        button: 'Potwierdź adres',
      },
    },
  },
})

await mailer.send('verifyEmail', {
  to: 'ola@example.com',
  props: { verifyUrl: 'https://example.com/verify?token=abc123' },
})

await mailer.render('passwordChanged', { locale: 'de' }) // type error: "de" is not a locale of this mailer
```

Plural forms (`common.minutes`, `common.hours`, `common.days`) take one text per [plural category](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules/select) of the locale: `zero`, `one`, `two`, `few`, `many` and `other`. `{count}` is replaced by the number. A category without a text uses `other`.

When you declare `messages` outside the `createMailer` call, check it with `satisfies MessagesOverrides` rather than a type annotation. An annotation widens the keys to `string`, and the mailer loses its list of locales:

```ts
import type { MessagesOverrides } from '@onetodone/mailer'

const messages = {
  pl: { verifyEmail: { subject: 'Potwierdź swój adres e-mail' } },
} satisfies MessagesOverrides
```

Text keys:

| Section                | Keys                                                                                                                                                             | Placeholders                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `common`               | `greeting`, `greetingAnonymous`, `linkFallback`, `footerSupport`, `footerRights`, `minutes`, `hours`, `days`                                                     | `{name}` in `greeting`, `{count}` in the plural forms                                                                    |
| `verifyEmail`          | `subject`, `preheader`, `heading`, `intro`, `button`, `expires`, `ignore`                                                                                        | `{duration}` in `expires`                                                                                                |
| `resetPassword`        | `subject`, `preheader`, `heading`, `intro`, `button`, `expires`, `ignore`                                                                                        | `{duration}` in `expires`                                                                                                |
| `passwordChanged`      | `subject`, `preheader`, `heading`, `intro`, `changedAt`, `ip`, `ifYou`, `notYou`, `button`, `notYouEmail`                                                        | `{date}` in `changedAt`, `{ip}` in `ip`, `{email}` in `notYouEmail`                                                      |
| `verifyEmailChange`    | `subject`, `preheader`, `heading`, `intro`, `button`, `expires`, `ignore`                                                                                        | `{duration}` in `expires`                                                                                                |
| `emailChangeRequested` | `subject`, `preheader`, `heading`, `intro`, `requestedAt`, `ip`, `ifYou`, `notYouCancel`, `cancelButton`, `notYou`, `button`, `notYouEmail`                      | `{newEmail}` in `intro` and `ifYou`, `{date}` in `requestedAt`, `{ip}` in `ip`, `{email}` in `notYouEmail`               |
| `emailChanged`         | `subject`, `preheader`, `heading`, `intro`, `newEmail`, `changedAt`, `ip`, `newAddress`, `ifYou`, `notYou`, `button`, `notYouEmail`                              | `{newEmail}` in `newEmail`, `{date}` in `changedAt`, `{ip}` in `ip`, `{email}` in `notYouEmail`                          |
| `otpCode`              | `subject`, `preheader`, `heading`, `intro`, `expires`, `doNotShare`, `ignore`                                                                                    | `{code}` in `subject` and `preheader`, `{duration}` in `expires`                                                         |
| `magicLink`            | `subject`, `preheader`, `heading`, `intro`, `button`, `expires`, `doNotShare`, `ignore`                                                                          | `{duration}` in `expires`                                                                                                |
| `welcome`              | `subject`, `preheader`, `heading`, `intro`, `button`                                                                                                             |                                                                                                                          |
| `newSignIn`            | `subject`, `preheader`, `heading`, `intro`, `signedInAt`, `device`, `location`, `ip`, `ifYou`, `notYouSecure`, `secureButton`, `notYou`, `button`, `notYouEmail` | `{date}` in `signedInAt`, `{device}` in `device`, `{location}` in `location`, `{ip}` in `ip`, `{email}` in `notYouEmail` |
| `twoFactorEnabled`     | `subject`, `preheader`, `heading`, `intro`, `changedAt`, `ip`, `ifYou`, `notYou`, `button`, `notYouEmail`                                                        | `{date}` in `changedAt`, `{ip}` in `ip`, `{email}` in `notYouEmail`                                                      |
| `twoFactorDisabled`    | `subject`, `preheader`, `heading`, `intro`, `changedAt`, `ip`, `ifYou`, `notYou`, `button`, `notYouEmail`                                                        | `{date}` in `changedAt`, `{ip}` in `ip`, `{email}` in `notYouEmail`                                                      |
| `accountLocked`        | `subject`, `preheader`, `heading`, `intro`, `lockedUntil`, `ip`, `unlock`, `unlockButton`, `help`, `button`, `helpEmail`, `notYou`                               | `{date}` in `lockedUntil`, `{ip}` in `ip`, `{email}` in `helpEmail`                                                      |

The `Messages` type describes every key, so your editor shows what each text is for as you type.

`Messages` is the full built-in dictionary, and it gains keys whenever built-in templates are added, in any release. A full dictionary typed as `Messages` is therefore not covered by semver. Check your own texts with `satisfies MessagesOverrides` (or type one locale as `LocaleMessages`); keys you leave out fall back to English.

### 3. Layout

The built-in layout centers the email in a 600px card. The logo or company name sits above the card, and the footer holds the footer text, the support address and a copyright line. To replace it, pass a layout from `defineLayout`:

```ts
import { createMailer, defineLayout, html } from '@onetodone/mailer'

const layout = defineLayout(({ branding, theme, locale, subject, preheader, content, messages }) => ({
  html: html`<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;background-color:${theme.background};">
<div style="display:none;">${preheader}</div>
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:${theme.surface};">
<tr><td style="padding:32px;">${content.html}</td></tr>
<tr><td style="padding:0 32px 32px;font-family:Arial,sans-serif;font-size:13px;color:${theme.mutedText};">
${messages.footerSupport} <a href="mailto:${branding.supportEmail}">${branding.supportEmail}</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`,
  text: `${content.text}\n\n--\n${messages.footerSupport} ${branding.supportEmail}`,
}))

const mailer = createMailer({ transport, from, branding, layout })
```

A layout receives:

| Field       | Description                                                                 |
| ----------- | --------------------------------------------------------------------------- |
| `branding`  | Validated branding with defaults applied.                                   |
| `theme`     | Theme tokens with defaults applied, the same object as `branding.theme`.    |
| `locale`    | Locale of the email, for the `lang` attribute.                              |
| `subject`   | Subject of the email, for the document title.                               |
| `preheader` | Inbox preview text. Empty when the template has none.                       |
| `content`   | The rendered body: `content.html` (markup) and `content.text` (plain text). |
| `messages`  | Layout texts for the locale: `footerSupport` and `footerRights`.            |

It returns the full `html` document, built with the `html` tag, and the full plain-text version as `text`. The `html` tag escapes every interpolated value and inserts `content.html` as markup.

### 4. Templates

Create a template with `defineTemplate` and register it under `templates`. The template's `name` must match its key:

```ts
import { createMailer, defineTemplate } from '@onetodone/mailer'
import { z } from 'zod'

const orderShipped = defineTemplate({
  name: 'orderShipped',
  schema: z.object({
    orderId: z.string(),
    trackUrl: z.url({ protocol: /^https?$/ }),
    userName: z.string().optional(),
  }),
  render: ({ props, ui, t }) => ({
    subject: `Order #${props.orderId} has shipped`,
    preheader: 'Your order is on its way.',
    body: [
      ui.heading('Your order is on its way'),
      props.userName !== undefined && ui.paragraph(t('common.greeting', { name: props.userName })),
      ui.paragraph(`Order #${props.orderId} has left our warehouse. Follow the delivery with the button below.`),
      ui.button('Track order', props.trackUrl),
      ui.linkFallback(props.trackUrl),
    ],
  }),
})

const mailer = createMailer({ transport, from, branding, templates: { orderShipped } })

await mailer.send('orderShipped', {
  to: 'lizzie@example.com',
  props: { orderId: '1042', trackUrl: 'https://example.com/orders/1042/tracking' },
})
```

`send` and `render` autocomplete `orderShipped` and check its props against the schema's input type. Any [Standard Schema](https://standardschema.dev) library works for `schema`, such as zod, valibot or arktype. Invalid props throw `INVALID_PROPS` with the schema's issues as `cause`.

`render` receives:

| Field      | Description                                                                                                |
| ---------- | ---------------------------------------------------------------------------------------------------------- |
| `props`    | Props after validation, with the schema's defaults and transforms applied.                                 |
| `ui`       | Content blocks styled with the theme.                                                                      |
| `t`        | Built-in texts for the email's locale, with placeholders filled in: `t('common.greeting', { name })`.      |
| `t.html`   | The same texts as markup: the text and plain values are escaped, and `html` values are inserted as markup. |
| `format`   | `format.duration(minutes)` and `format.dateTime(date, timeZone?)` for the email's locale.                  |
| `locale`   | Locale of the email.                                                                                       |
| `branding` | Validated branding with defaults applied.                                                                  |
| `theme`    | Theme tokens with defaults applied.                                                                        |

It returns the `subject`, an optional `preheader` (the inbox preview text) and the `body` blocks in order. `false`, `null` and `undefined` entries in `body` are skipped, so conditional blocks can stay inline.

| Block                                   | Renders                                                                                                                                                                                                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ui.heading(text, { level })`           | A heading, level 1 (the default), 2 or 3.                                                                                                                                                                                                         |
| `ui.paragraph(text)`                    | Body text. Line breaks in a string become `<br>`.                                                                                                                                                                                                 |
| `ui.button(label, url)`                 | A button that also renders in Outlook for Windows.                                                                                                                                                                                                |
| `ui.linkFallback(url)`                  | The link as text under a "copy this link" line, for readers whose button does not work.                                                                                                                                                           |
| `ui.code(value)`                        | A large monospace code, such as a one-time password.                                                                                                                                                                                              |
| `ui.image(src, { alt, width, height })` | An image from an `http:` or `https:` URL, or an [inline image](#attachments-and-inline-images) through `cid:`. `width` defaults to 534 px, the width of the content, and the image shrinks on narrow screens. The plain-text version shows `alt`. |
| `ui.note(text)`                         | Smaller muted text, such as "If this wasn't you, ignore this email."                                                                                                                                                                              |
| `ui.divider()`                          | A horizontal rule.                                                                                                                                                                                                                                |
| `ui.spacer(size)`                       | Vertical space in pixels. Default `16`.                                                                                                                                                                                                           |
| `ui.raw(html, text)`                    | Your own trusted markup, with its plain-text version.                                                                                                                                                                                             |

Every block renders both HTML and plain text, so the plain-text version of the email comes with no extra work. Strings passed to blocks are escaped. For markup such as a link inside a sentence, use the `html` tag, which escapes every interpolated value:

```ts
import { html, safeUrl } from '@onetodone/mailer'

ui.paragraph(html`Read the <a href="${safeUrl(props.guideUrl)}">setup guide</a> before you start.`)
```

The plain-text version of that paragraph shows the link as `setup guide (https://…)`.

- `safeUrl(url)` returns the normalized URL. It throws `UNSAFE_URL` for anything but an absolute `http:` or `https:` URL, such as `javascript:` or a relative path.
- `ui.button`, `ui.linkFallback` and `ui.image` check their URL the same way; `ui.image` also accepts a `cid:` reference. Validate links in the schema, as `trackUrl` above does, to report bad links as `INVALID_PROPS` before rendering.
- `raw(markup)` inserts trusted markup without escaping. Never pass user input to `raw` or `ui.raw`.

#### Replacing a built-in template

Register a template under a built-in name to replace that template. `send` then expects the replacement's props:

```ts
const resetPassword = defineTemplate({
  name: 'resetPassword',
  schema: z.object({ code: z.string().regex(/^\d{6}$/) }),
  render: ({ props, ui }) => ({
    subject: 'Your password reset code',
    body: [
      ui.heading('Reset your password'),
      ui.paragraph('Enter this code to choose a new password:'),
      ui.code(props.code),
      ui.note("If you didn't ask for this, ignore this email."),
    ],
  }),
})

const mailer = createMailer({ transport, from, branding, templates: { resetPassword } })

await mailer.send('resetPassword', { to: 'lizzie@example.com', props: { code: '482913' } })
```

#### Texts of custom templates

`t` knows only the built-in text keys, and `messages` accepts only the built-in sections. A custom template keeps its own texts and picks them by `locale`:

```ts
const texts = {
  en: { subject: 'Your order has shipped', button: 'Track order' },
  be: { subject: 'Ваша замова адпраўлена', button: 'Адсачыць замову' },
}

const orderShipped = defineTemplate({
  name: 'orderShipped',
  schema: z.object({ trackUrl: z.url({ protocol: /^https?$/ }) }),
  render: ({ props, ui, locale }) => {
    const text = locale === 'be' ? texts.be : texts.en
    return {
      subject: text.subject,
      body: [ui.button(text.button, props.trackUrl), ui.linkFallback(props.trackUrl)],
    }
  },
})
```

## Transports

A transport delivers the rendered emails. The package ships three, and you can [write your own](#your-own-transport).

### SMTP

`smtpTransport` sends through [nodemailer](https://nodemailer.com), which you install next to this package:

```ts
import { smtpTransport } from '@onetodone/mailer/smtp'

const transport = smtpTransport({
  host: 'smtp.example.com',
  port: 587,
  auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  pool: true,
})
```

| Option              | Description                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `host`              | Required. Server host name or IP address.                                                                                          |
| `port`              | Server port. Default `465` when `secure` is set, otherwise `587`.                                                                  |
| `secure`            | Connect over TLS from the start, usually on port 465. Without it, the connection upgrades with STARTTLS when the server offers it. |
| `auth`              | Credentials: `{ user, pass }`.                                                                                                     |
| `requireTLS`        | Fail unless the connection upgrades with STARTTLS.                                                                                 |
| `tls`               | `rejectUnauthorized` (default `true`) and `servername`.                                                                            |
| `name`              | Host name announced in the SMTP greeting. Default: the machine's host name.                                                        |
| `pool`              | Keep connections open and reuse them. Call `mailer.close()` on shutdown.                                                           |
| `maxConnections`    | Most pooled connections at once. Default `5`.                                                                                      |
| `maxMessages`       | Most emails per pooled connection before it is replaced. Default `100`.                                                            |
| `connectionTimeout` | Milliseconds to wait for the connection. Default `120000`.                                                                         |
| `greetingTimeout`   | Milliseconds to wait for the server greeting. Default `30000`.                                                                     |
| `socketTimeout`     | Milliseconds of inactivity before the connection times out. Default `600000`.                                                      |

The options are validated when the transport is created, and invalid ones throw `INVALID_CONFIG`. For anything they do not cover, such as DKIM signing, OAuth2 or a proxy, pass your own nodemailer transporter:

```ts
import { createTransport } from 'nodemailer'
import { smtpTransport } from '@onetodone/mailer/smtp'

const transport = smtpTransport(
  createTransport({
    host: 'smtp.example.com',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
    dkim: { domainName: 'example.com', keySelector: 'mail', privateKey: process.env.DKIM_PRIVATE_KEY! },
  }),
)
```

Attachments with a `cid` go out as inline images next to the HTML, the others as regular attachments.

A failed delivery rejects with `TRANSPORT_FAILED`, with nodemailer's error as `cause`. When the server accepts some recipients and rejects others, `send` resolves and lists them in `accepted` and `rejected`. `mailer.close()` closes the connections, including those of a transporter you passed in.

### Console

`consoleTransport()` prints each email instead of sending it: the addresses, the subject, the name, type and size of each attachment, and the plain-text version. Pass `log` to write somewhere other than `console.log`. The text contains links with tokens, so use it in development only.

```ts
import { consoleTransport } from '@onetodone/mailer'
import { smtpTransport } from '@onetodone/mailer/smtp'

const transport =
  process.env.NODE_ENV === 'production' ? smtpTransport({ host: 'smtp.example.com' }) : consoleTransport()
```

To see the HTML during development, point `smtpTransport` at a local SMTP catcher such as [Mailpit](https://mailpit.axllent.org).

### Memory

`memoryTransport()` keeps emails in memory instead of sending them. See [testing](#testing).

### Your own transport

Any object with a `send` method is a transport, so you can deliver through an HTTP email API:

```ts
import type { MailTransport } from '@onetodone/mailer'

const apiTransport: MailTransport = {
  async send(message) {
    const response = await fetch('https://mail-api.example.com/v1/send', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.MAIL_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        ...message,
        attachments: message.attachments?.map(({ content, ...attachment }) => ({
          ...attachment,
          content: Buffer.from(content).toString('base64'),
        })),
      }),
    })
    if (!response.ok) throw new Error(`Mail API responded with ${response.status}`)
    const { id } = (await response.json()) as { id: string }
    return { messageId: id }
  },
}
```

`message` has `from`, `to`, `cc`, `bcc`, `replyTo`, `subject`, `html`, `text`, `headers` and `attachments`. Addresses keep the form the caller used: a string or a `{ name, address }` object, one or a list. Errors that are not a `MailerError` are wrapped in `TRANSPORT_FAILED`, with the original error as `cause`. Add an optional `close()` method if the transport holds connections.

Each attachment has `filename`, `content` (a `Uint8Array` or a string to send as UTF-8), `contentType`, which is always set, and `cid` on inline images only. A transport must deliver every attachment or throw, never drop one silently. Send attachments with a `cid` inline under that Content-ID, and the others as regular attachments.

## Testing

Use `memoryTransport` in your tests. It records every email in `sent`, and `clear()` empties it:

```ts
import { beforeEach, expect, it } from 'vitest'
import { createMailer, memoryTransport } from '@onetodone/mailer'

const transport = memoryTransport()
const mailer = createMailer({ transport, from, branding })

beforeEach(() => {
  transport.clear()
})

it('sends a verification link after sign-up', async () => {
  await signUp(mailer, { email: 'lizzie@example.com' })

  expect(transport.sent).toHaveLength(1)
  const email = transport.sent[0]
  expect(email?.to).toBe('lizzie@example.com')
  expect(email?.subject).toBe('Confirm your email')
  expect(email?.text).toContain('https://example.com/verify?token=')
})
```

Each entry in `sent` is the message the transport received: the addresses as passed, `subject`, `html`, `text`, `headers` and `attachments`, with `contentType` filled in. Hand the mailer to your code the way you pass other dependencies, so tests can use one built on `memoryTransport`.

To check what an email says without sending it, use `render`:

```ts
const { subject, text } = await mailer.render('resetPassword', {
  props: { resetUrl: 'https://example.com/reset?token=abc123' },
})

expect(subject).toBe('Reset your password')
expect(text).toContain('https://example.com/reset?token=abc123')
```

The copyright line in the footer shows the current year. Before snapshotting a whole email, pin the clock, for example with `vi.setSystemTime`.

## Hooks

`onSent` and `onError` let you log or count emails:

```ts
const mailer = createMailer({
  transport,
  from,
  branding,
  onSent: ({ template, to, result, durationMs }) => {
    logger.info({ template, to, messageId: result.messageId, durationMs }, 'Email sent')
  },
  onError: ({ template, to, error }) => {
    logger.error({ template, to, err: error }, 'Email failed')
  },
})
```

- `send` waits for the hooks, so async hooks finish before it settles.
- A hook never changes the outcome of `send`. When `onSent` fails, `send` still resolves. When `onError` fails, `send` still rejects with the original error.
- A failing hook is reported with `process.emitWarning` as a `MailerWarning`:

  ```ts
  process.on('warning', (warning) => {
    if (warning.name === 'MailerWarning') logger.warn(warning)
  })
  ```

- Events carry `template`, `locale`, `from`, `to`, `cc`, `bcc`, `replyTo`, `headers`, `attachments` and `durationMs`, the time from the `send` call to its outcome.
- `attachments` lists the `filename`, `contentType` and `size` in bytes of each file, never its content. It is left out when the options fail validation.
- `onSent` also gets `subject` and the transport's `result`.
- `onError` gets `subject` (or `undefined` when sending failed before rendering) and the `error`. It fires for invalid options and props too.
- Events never contain the HTML, the plain text, the props or attachment content. Links in emails usually carry tokens, so this keeps events safe to log as they are.
- Hooks run for `send` only, not for `render`.

## Errors

The package throws `MailerError`, which has a `code` to branch on:

| Code               | Thrown when                                                                                                                                                          | `cause`                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `INVALID_CONFIG`   | `createMailer` or `smtpTransport` gets invalid settings.                                                                                                             | The validation error         |
| `INVALID_OPTIONS`  | `send` or `render` gets an invalid address, header, attachment, locale or option, or the HTML references a `cid:` without an attachment.                             | The validation error, if any |
| `INVALID_PROPS`    | Template props fail the template's schema.                                                                                                                           | The schema's issues          |
| `UNKNOWN_TEMPLATE` | No template is registered under the requested name.                                                                                                                  |                              |
| `TRANSPORT_FAILED` | The transport could not deliver the email.                                                                                                                           | The transport's error        |
| `UNSAFE_URL`       | `safeUrl`, `ui.button`, `ui.linkFallback` or `ui.image` gets a link that is not an absolute `http:` or `https:` URL, or `ui.image` gets an invalid `cid:` reference. |                              |

- Messages name the setting or prop and the problem. They never include link values, because links usually carry tokens.
- Errors thrown by your own template or layout code pass through unchanged, as does a `MailerError` thrown by your own transport.
- Retries are up to your application, for example through a job queue:

```ts
import { MailerError } from '@onetodone/mailer'

try {
  await mailer.send('verifyEmail', { to: user.email, props: { verifyUrl } })
} catch (error) {
  if (error instanceof MailerError && error.code === 'TRANSPORT_FAILED') {
    await queue.retryLater('verifyEmail', user.id)
  } else {
    throw error
  }
}
```

## Security

- Every value inserted into email HTML is escaped: in built-in templates, in `ui` blocks and in the `html` tag. `raw` and `ui.raw` are the only ways to insert unescaped markup, so never pass user input to them.
- Links in buttons, fallback links and built-in props must be absolute `http:` or `https:` URLs. `javascript:`, `data:` and relative links are rejected.
- Line breaks are rejected in addresses, display names and header values, and all control characters in attachment file names and content types, which blocks header injection whatever the transport.
- Hook events leave out the email body, the props and attachment content, and error messages never repeat link values or attachment content, so both are safe to log.
- `consoleTransport` prints links with tokens. Use it in development only.
- For deliverability, send from a domain with SPF, DKIM and DMARC set up. Every email includes a plain-text version.

## Email client support

The HTML follows what email clients actually render:

- nested tables and inline styles;
- no `<style>` block apart from an Outlook-only font fallback;
- a VML button for Outlook on Windows;
- fixed image dimensions;
- a hidden preheader for the inbox preview.

The layout declares support for light and dark color schemes. It is checked in Gmail (web and mobile apps), Outlook, Apple Mail and iOS Mail, in light and dark mode and on screens 320px wide.

## Versioning

The package follows [semantic versioning](https://semver.org). While the version is 0.x, breaking changes bump the minor version, so npm's default `^0.1.0` range stays within 0.1.x. Changes are listed in the [changelog](https://github.com/onetodone/mailer/blob/main/CHANGELOG.md) and in the [GitHub releases](https://github.com/onetodone/mailer/releases).

## License

[MIT](LICENSE)
