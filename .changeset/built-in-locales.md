---
'@onetodone/mailer': patch
---

Add built-in texts in Czech, Estonian, French, Georgian, German, Italian, Japanese, Latvian, Lithuanian, Polish, Romanian, Thai and Ukrainian.

- `Locale` gains `cs`, `de`, `et`, `fr`, `it`, `ja`, `ka`, `lt`, `lv`, `pl`, `ro`, `th` and `uk`. The `locale` setting and the `locale` option of `send` and `render` accept them without `messages`.
- The texts address the reader politely (`Sie`, `vous`, `vy`, `ви` and so on), except Polish and Italian, which use the informal form common in apps there. Reword any text through `messages`.
- If you already send in one of these languages through `messages`, your overrides still win, and the keys you leave out come from the built-in texts instead of English.
