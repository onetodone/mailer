---
'@onetodone/mailer': patch
---

Add built-in texts in Arabic.

- `Locale` gains `ar`. The `locale` setting and the `locale` option of `send` and `render` accept it without `messages`.
- Emails in Arabic render right to left.
- If you already send in Arabic through `messages`, your overrides still win, and the keys you leave out come from the built-in texts instead of English.
