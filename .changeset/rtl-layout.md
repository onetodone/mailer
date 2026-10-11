---
'@onetodone/mailer': patch
---

Render emails in right-to-left languages, such as Arabic and Hebrew, right to left.

- The direction follows the email's locale. For a right-to-left locale the built-in layout sets `dir="rtl"` and aligns the content to the right, and Outlook on Windows aligns buttons, codes and images to the right too.
- Codes from `ui.code` and the link from `ui.linkFallback` stay left to right inside right-to-left text, so `123 456` keeps its order.
- Templates receive the direction as `dir` (`'ltr'` or `'rtl'`) next to `locale`, for markup of their own.
- Emails in left-to-right languages render exactly as before.
