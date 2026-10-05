---
'@onetodone/mailer': patch
---

Add plural forms to the texts of custom templates.

- A text in a template's `messages` may be plural forms instead of a string: one text per `Intl.PluralRules` category (`zero`, `one`, `two`, `few`, `many`, `other`), such as `items: { one: '{count} item', other: '{count} items' }`. `other` is required in `en`.
- `t('<name>.<key>', { count })` and `t.html` pick the form for `count` through the plural rules of the email's locale; `{count}` is the number formatted for the locale. A category without a form uses `other`. `count` is required at compile time for texts with plural forms.
- Other locales of the template and the mailer's `messages` give plural forms for those keys category by category and may add categories the English texts leave out, such as `few` and `many`. Categories a locale leaves out fall back to English.
- `createMailer` throws `INVALID_CONFIG` for plural forms without `other` in `en`, an unknown plural category, and a locale text whose form differs from `en` (a string where `en` has plural forms, or the other way round).
- `TemplateTexts` and `TemplateMessages` accept plural forms. `Translate` and `TemplateRenderContext` take an optional second type parameter with the keys of texts with plural forms.
