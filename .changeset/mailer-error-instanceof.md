---
'@onetodone/mailer': patch
---

Make `instanceof MailerError` work across the ESM and CommonJS builds.

- When an app loads both builds, for example an ESM app with a CommonJS dependency that also uses the package, `error instanceof MailerError` holds for errors from either build.
- `instanceof` against your own subclass of `MailerError` matches only instances of that subclass.
