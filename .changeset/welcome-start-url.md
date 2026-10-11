---
'@onetodone/mailer': minor
---

Rename the `ctaUrl` prop of the `welcome` template to `startUrl`.

- `WelcomeProps` has `startUrl` instead of `ctaUrl`: an absolute `http:` or `https:` link behind the "Get started" button, `branding.appUrl` by default. The name follows the other link props, which are named after their action (`verifyUrl`, `resetUrl`, `signInUrl`).
- `send` and `render` reject `ctaUrl` with `INVALID_PROPS`.
- Migration: replace `props: { ctaUrl }` with `props: { startUrl }` in `mailer.send('welcome', …)` and `mailer.render('welcome', …)`.
