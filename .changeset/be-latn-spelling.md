---
'@onetodone/mailer': patch
---

Fix four spellings in the Belarusian Latin (`be-Latn`) texts to match standard Łacinka.

- `parola` instead of `parolia` in `resetPassword`, `twoFactorEnabled` and `twoFactorDisabled`; `liście` instead of `liscie` in `emailChangeRequested`; `Pryłada` instead of `Prylada` in `newSignIn`; `niaŭdałych` instead of `niaŭdalych` in `accountLocked`.
- If you override these texts through `messages`, your overrides still win.
