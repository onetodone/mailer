---
'@onetodone/mailer': patch
---

Add email templates and translations.

- `defineTemplate` declares a template from a name, a props schema and a render function. Props are validated with any Standard Schema library (zod 4, valibot, arktype): callers pass the schema input, and `render` receives the validated output. The render context provides `props`, `ui` blocks, `t` for texts, `format` for durations and dates, `locale`, `branding` and `theme`.
- Built-in templates `verifyEmail`, `resetPassword` and `passwordChanged`, with texts in English (default) and Belarusian. `passwordChanged` accepts a `timeZone` prop for the change time (UTC by default).
- Texts can be overridden key by key; a locale falls back to English for any key it leaves out. `t` fills `{name}` placeholders (with `{companyName}` always available), and `t.html` escapes the text and plain values while inserting markup from the `html` tag as-is. Durations use the plural rules of the locale.
- `MailerError` codes `INVALID_PROPS` (with the schema issues as `cause`) and `UNKNOWN_TEMPLATE`.
- Types `Template`, `TemplateContent`, `TemplateProps`, `TemplateRenderContext`, `Translate`, `Formatters`, `Messages`, `MessageKey` and `Locale`.
- The plain-text version of a `mailto:` link shows the bare address.
