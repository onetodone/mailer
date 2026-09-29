---
'@onetodone/mailer': minor
---

Add built-in security notices for new sign-ins, two-factor authentication changes and locked accounts.

- `newSignIn` tells the owner about a sign-in, such as from a new device, and lists `signedInAt`, `device`, `location` and `ip` when you pass them. It offers a button to a page that secures the account (`secureUrl`), or a way to contact support without it (`supportUrl`, else `branding.supportEmail`). Every prop is optional: `userName`, `signedInAt`, `timeZone`, `ip`, `device`, `location`, `secureUrl`, `supportUrl` (`NewSignInProps`).
- `twoFactorEnabled` and `twoFactorDisabled` tell the owner that two-factor authentication was turned on or off, with a way to contact support. Every prop is optional: `userName`, `changedAt`, `timeZone`, `ip`, `supportUrl` (`TwoFactorEnabledProps`, `TwoFactorDisabledProps`).
- `accountLocked` tells the owner that the account was locked after too many failed sign-in attempts, shows `lockedUntil` and `ip` when you pass them, and offers a button that unlocks the account (`unlockUrl`), or help from support without it (`supportUrl`, else `branding.supportEmail`). It ends with advice to choose a new password for owners who did not try to sign in. Every prop is optional: `userName`, `lockedUntil`, `timeZone`, `ip`, `unlockUrl`, `supportUrl` (`AccountLockedProps`).
- Texts in English and Belarusian, overridable through `messages` in the `newSignIn`, `twoFactorEnabled`, `twoFactorDisabled` and `accountLocked` sections.
