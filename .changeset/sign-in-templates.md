---
'@onetodone/mailer': minor
---

Add built-in templates for one-time codes, sign-in links and welcome emails.

- `otpCode` sends a one-time code for sign-in, two-step verification or confirming an action. Props: `code`, `userName`, `expiresInMinutes` (`OtpCodeProps`). The subject and inbox preview leave out the code, because they show in notifications and on lock screens; both texts accept `{code}`, so a `messages` override can add it.
- `magicLink` sends a link that signs the user in without a password and tells the reader not to share it. Props: `signInUrl`, `userName`, `expiresInMinutes` (`MagicLinkProps`).
- `welcome` greets a new user with a button to `ctaUrl`, or to `branding.appUrl` without it. Every prop is optional: `userName`, `ctaUrl` (`WelcomeProps`).
- Texts in English and Belarusian, overridable through `messages` in the `otpCode`, `magicLink` and `welcome` sections.
