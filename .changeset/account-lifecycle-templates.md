---
'@onetodone/mailer': patch
---

Add built-in templates for data exports, inactive accounts and policy updates: `dataExportReady`, `inactiveAccountWarning` and `policyUpdated`.

- `dataExportReady` sends the download link for a copy of the user's data, such as for a GDPR request. Props: `downloadUrl` (required), `userName`, `expiresInMinutes`, `supportUrl`.
- `inactiveAccountWarning` warns that an inactive account will be deleted unless the owner signs in. Props: `deletionDate` (required), `userName`, `lastSignInAt`, `timeZone`, `signInUrl` (default `branding.appUrl`).
- `policyUpdated` announces changes to the terms of service (`policy: 'terms'`) or the privacy policy (`policy: 'privacy'`). Props: `policy` and `policyUrl` (required), `userName`, `effectiveAt`, `timeZone`, `changes` (a list of short summaries in the recipient's language).
- Texts in every built-in locale; prop types `DataExportReadyProps`, `InactiveAccountWarningProps`, `PolicyUpdatedProps`.
