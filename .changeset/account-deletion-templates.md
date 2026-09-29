---
'@onetodone/mailer': minor
---

Add built-in emails that confirm an account deletion and tell the owner once the account is deleted.

- `confirmAccountDeletion` asks the owner to confirm the deletion with a button to `confirmUrl`, and warns that a deleted account and its data can't be restored. Props: `confirmUrl`, `userName`, `expiresInMinutes` (`ConfirmAccountDeletionProps`).
- `accountDeleted` tells the owner that the account was deleted, with a way to contact support if it wasn't them (`supportUrl`, else `branding.supportEmail`). Every prop is optional: `userName`, `supportUrl` (`AccountDeletedProps`).
- Texts in English and Belarusian, overridable through `messages` in the `confirmAccountDeletion` and `accountDeleted` sections. Apps that keep deleted accounts for a grace period can reword `confirmAccountDeletion.warning` and `accountDeleted.farewell`.
