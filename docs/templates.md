# Built-in templates

| Template                 | When to send it                                                                                                | Subject in English                       |
| ------------------------ | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `verifyEmail`            | A user signed up and needs to confirm their email address                                                      | Confirm your email                       |
| `resetPassword`          | A user asked to reset a forgotten password                                                                     | Reset your password                      |
| `passwordChanged`        | A password was changed, so the owner can act if it was not them                                                | Your password was changed                |
| `verifyEmailChange`      | A user asked to change their email; sent to the new address to confirm it                                      | Confirm your new email                   |
| `emailChangeRequested`   | A user asked to change their email; sent to the current address, so the owner can cancel it if it was not them | Email change requested                   |
| `emailChanged`           | The email was changed; sent to the old address, so the owner can act if it was not them                        | Your email was changed                   |
| `otpCode`                | A user needs a one-time code, such as for sign-in, two-step verification or confirming an action               | Your verification code                   |
| `magicLink`              | A user signs in with a link instead of a password                                                              | Your sign-in link                        |
| `welcome`                | A new account is ready                                                                                         | Welcome to {companyName}                 |
| `newSignIn`              | Someone signed in to an account, such as from a new device, so the owner can act if it was not them            | New sign-in to your account              |
| `twoFactorEnabled`       | Two-factor authentication was turned on, so the owner can act if it was not them                               | Two-factor authentication was turned on  |
| `twoFactorDisabled`      | Two-factor authentication was turned off, so the owner can act if it was not them                              | Two-factor authentication was turned off |
| `accountLocked`          | An account was locked after too many failed sign-in attempts                                                   | Your account is locked                   |
| `confirmAccountDeletion` | A user asked to delete their account and needs to confirm it                                                   | Confirm account deletion                 |
| `accountDeleted`         | An account was deleted, so the owner can act if it was not them                                                | Your account was deleted                 |

Each email has an inbox preview text, a heading, a greeting and a short explanation. Where there is a link, it adds a button and the same link as plain text for readers whose button does not work. Every email except `welcome` ends with a note for recipients who did not ask for it.

## `verifyEmail`

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `verifyUrl`        | `string` | yes      | Absolute `http:` or `https:` link that confirms the address.                        |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

## `resetPassword`

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `resetUrl`         | `string` | yes      | Absolute `http:` or `https:` link to the page where the user sets a new password.   |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

## `passwordChanged`

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

## `verifyEmailChange`

Send it to the new address. The account keeps its current email until the link is opened.

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `verifyUrl`        | `string` | yes      | Absolute `http:` or `https:` link that confirms the new address.                    |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

## `emailChangeRequested`

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

## `emailChanged`

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

## `otpCode`

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

The subject and the inbox preview leave out the code, because they show in notifications and on lock screens. Both texts accept `{code}`, so a [text override](locales.md) such as `{ en: { otpCode: { subject: 'Your code: {code}' } } }` puts it back.

## `magicLink`

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `signInUrl`        | `string` | yes      | Absolute `http:` or `https:` link that signs the user in.                           |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

Anyone who has the link can sign in, and the email tells the reader not to share it. Make the link work once and for a short time, such as 15 minutes.

## `welcome`

Send it once the account is ready, for example after the email address is confirmed. Every prop is optional, so `props` can be left out.

| Prop       | Type     | Description                                                                                                                |
| ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `userName` | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                          |
| `ctaUrl`   | `string` | Absolute `http:` or `https:` link behind the "Get started" button, such as an onboarding page. Default: `branding.appUrl`. |

```ts
await mailer.send('welcome', { to: 'lizzie@example.com', props: { userName: 'Lizzie' } })
```

## `newSignIn`

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

## `twoFactorEnabled` and `twoFactorDisabled`

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

## `accountLocked`

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

## `confirmAccountDeletion`

Send it when a user asks to delete their account, and delete the account only once the link is opened.

| Prop               | Type     | Required | Description                                                                         |
| ------------------ | -------- | -------- | ----------------------------------------------------------------------------------- |
| `confirmUrl`       | `string` | yes      | Absolute `http:` or `https:` link that confirms the deletion.                       |
| `userName`         | `string` | no       | Name for the greeting. Without it, or when it is empty, the greeting has no name.   |
| `expiresInMinutes` | `number` | no       | How long the link works, in minutes. Without it, the email does not mention expiry. |

## `accountDeleted`

Send it once the account is deleted. Every prop is optional, so `props` can be left out.

| Prop         | Type     | Description                                                                                                                         |
| ------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `userName`   | `string` | Name for the greeting. Without it, or when it is empty, the greeting has no name.                                                   |
| `supportUrl` | `string` | Absolute `http:` or `https:` link to your support page, shown as a button. Without it, the email points to `branding.supportEmail`. |

An account deletion uses both:

```ts
// When the user asks to delete the account
await mailer.send('confirmAccountDeletion', {
  to: 'lizzie@example.com',
  props: { confirmUrl: 'https://example.com/account/delete?token=abc123', expiresInMinutes: 60 },
})

// Once the account is deleted
await mailer.send('accountDeleted', { to: 'lizzie@example.com', props: { userName: 'Lizzie' } })
```

`confirmAccountDeletion` warns that a deleted account and its data can't be restored, and `accountDeleted` says the owner can sign up again. If your app keeps deleted accounts for a grace period, change `confirmAccountDeletion.warning` and `accountDeleted.farewell` through [`messages`](locales.md). Every email shows `branding.footerText`, so word it to fit a deleted account too.

Durations are written in whole days (from 2 days on), hours or minutes, with the plural rules of the locale: `30` gives "30 minutes", `60` gives "1 hour", `1440` gives "24 hours" and `2880` gives "2 days". Dates include the time zone name, such as "May 4, 2026 at 9:30 AM UTC".

Props are checked twice. TypeScript reports missing, unknown or mistyped props, and at runtime invalid values, such as a `javascript:` link, throw a `MailerError` with code `INVALID_PROPS`.
