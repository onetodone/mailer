---
'@onetodone/mailer': minor
---

Give layouts the text direction of the email as `LayoutContext.dir`.

- `dir` is `'rtl'` for languages written right to left, such as Arabic and Hebrew, and `'ltr'` otherwise. Set it as the `dir` attribute of your layout's markup.
- `dir` is required, so code that builds a `LayoutContext` by hand, such as a unit test of a custom layout, needs it too. Layouts passed to `createMailer` need no change.
- Migration: add `dir` where you build a `LayoutContext` yourself, for example `defaultLayout({ ...context, dir: 'ltr' })` or `{ branding, theme, locale: 'en', dir: 'ltr', subject, preheader, content, messages }`.
