---
'@onetodone/mailer': patch
---

Add built-in texts in Slovak.

- `Locale` gains `sk`. The `locale` setting and the `locale` option of `send` and `render` accept it without `messages`.
- If you already send in Slovak through `messages`, your overrides still win, and the keys you leave out come from the built-in texts instead of English.
