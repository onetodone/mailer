---
'@onetodone/mailer': patch
---

Add built-in texts in Serbian.

- `Locale` gains `sr`. The `locale` setting and the `locale` option of `send` and `render` accept it without `messages`.
- The texts are in Cyrillic script. A tag such as `sr-Latn` in `messages` stays a separate locale and does not use the `sr` texts.
- If you already send in Serbian through `messages` under `sr`, your overrides still win, and the keys you leave out come from the built-in texts instead of English.
