---
'@onetodone/mailer': patch
---

Add the email rendering core.

- `html` tagged template that escapes every interpolated value, `raw()` for trusted markup, and `safeUrl()`, which accepts only absolute `http:` and `https:` links.
- `MailerError` with a machine-readable `code` (`INVALID_CONFIG`, `UNSAFE_URL`).
- `defaultLayout`: a 600px table-based layout with inline styles, a hidden preheader, a `color-scheme` meta tag, the logo or company name in the header, and a footer with footer text, a support link and a copyright line. Every email also gets a plain-text version.
- `defineLayout` for custom layouts, with types for the layout context, branding and theme tokens.
- Content blocks (`heading`, `paragraph`, `button`, `linkFallback`, `code`, `note`, `divider`, `spacer`, `raw`) that render to HTML and plain text. The button renders in Outlook through a VML fallback.
- Branding and theme validation: HEX colors, http(s) URLs and email addresses are checked, and every theme token has a default.
