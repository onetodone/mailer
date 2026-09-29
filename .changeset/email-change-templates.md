---
'@onetodone/mailer': minor
---

Add built-in templates for changing the email address.

- `verifyEmailChange` goes to the new address and asks the user to confirm it. Props: `verifyUrl`, `userName`, `expiresInMinutes` (`VerifyEmailChangeProps`).
- `emailChangeRequested` goes to the current address when a change is requested. It names `newEmail` and offers a button that cancels the change (`cancelUrl`), or a way to contact support without it (`supportUrl`, else `branding.supportEmail`). Props: `newEmail`, `userName`, `requestedAt`, `timeZone`, `ip`, `cancelUrl`, `supportUrl` (`EmailChangeRequestedProps`).
- `emailChanged` goes to the old address once the change is done, with a way to contact support. Every prop is optional: `userName`, `newEmail`, `changedAt`, `timeZone`, `ip`, `supportUrl` (`EmailChangedProps`).
- `newEmail` accepts any non-empty text, so a masked address such as `l***@example.com` works.
- Texts in English and Belarusian, overridable through `messages` in the `verifyEmailChange`, `emailChangeRequested` and `emailChanged` sections.
- `Messages` describes the full built-in dictionary and gains keys whenever built-in templates are added, in any release, so a full dictionary typed as `Messages` is not covered by semver. Use `MessagesOverrides` (or `LocaleMessages` for one locale) for your own texts; keys you leave out fall back to English.
- Polish the Belarusian wording of the `resetPassword` intro: «Націсніце кнопку, каб задаць новы пароль.»
- Migration: if you type a full dictionary as `Messages`, add the `verifyEmailChange`, `emailChangeRequested` and `emailChanged` sections, or check it with `satisfies MessagesOverrides` instead, so that missing keys fall back to English.
