---
'@onetodone/mailer': patch
---

Add per-locale texts to custom templates.

- `defineTemplate` accepts `messages`: the template's texts by locale. `en` is required and lists every text key; other locales may leave keys out, which fall back to English key by key. Plural forms are not supported in template texts.
- In a template with `messages`, `t` and `t.html` take the template's own keys under its name, such as `t('invoice.subject', { number })`, plus the `common` keys, and reject any other key at compile time. A template without `messages` keeps `t` for every built-in key.
- The `messages` setting of `createMailer` overrides the texts of registered custom templates under their names, with the same English fallback as the built-in texts. `MessagesOverrides<typeof templates>` and `LocaleMessages<typeof templates>` type such overrides outside the `createMailer` call.
- A custom template with `messages` that replaces a built-in template also replaces the built-in texts of that template in every locale.
- `createMailer` throws `INVALID_CONFIG` for template texts that are not strings, a missing `en`, a key that `en` does not have, a locale that is neither built-in nor a key of `messages`, and a template with `messages` named `common` or containing a dot.
- Types `TemplateMessages` and `TemplateTexts`. `Template`, `TemplateRenderContext`, `Translate`, `MessagesOverrides` and `LocaleMessages` take optional type parameters, and `TemplateProps` accepts templates with `messages`.
