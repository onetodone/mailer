---
'@onetodone/mailer': patch
---

Add built-in texts in Croatian.

- `Locale` gains `hr`. The `locale` setting and the `locale` option of `send` and `render` accept it without `messages`.
- If you already send in Croatian through `messages`, your overrides still win, and the keys you leave out come from the built-in texts instead of English.
