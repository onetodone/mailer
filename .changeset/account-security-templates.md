---
'@onetodone/mailer': patch
---

Add built-in security notices for passkeys, recovery codes, API keys and unlocked accounts: `passkeyAdded`, `passkeyRemoved`, `recoveryCodeUsed`, `apiKeyCreated`, `apiKeyExpiring` and `accountUnlocked`.

- `passkeyAdded` and `passkeyRemoved` take the same optional props: `userName`, `passkeyName`, `changedAt`, `timeZone`, `ip`, `device`, `secureUrl`, `supportUrl`.
- `recoveryCodeUsed` reports a sign-in with a two-factor recovery code. `remainingCodes` shows how many are left, and at `0` the email asks for new ones; `regenerateUrl` adds a button for that. Other optional props: `userName`, `usedAt`, `timeZone`, `ip`, `device`, `secureUrl`, `supportUrl`.
- `apiKeyCreated` reports a new API key or personal access token, with a way to revoke it through `manageUrl`. Optional props: `userName`, `keyName`, `createdAt`, `expiresAt`, `timeZone`, `ip`, `manageUrl`, `supportUrl`. Neither API key template takes the key itself.
- `apiKeyExpiring` reminds the owner to replace a key before it expires. Props: `expiresAt` (required), `userName`, `keyName`, `timeZone`, `manageUrl`.
- `accountUnlocked` is the counterpart of `accountLocked`. Optional props: `userName`, `unlockedAt`, `timeZone`, `signInUrl` (default `branding.appUrl`), `supportUrl`.
- Texts in every built-in locale; prop types `PasskeyAddedProps`, `PasskeyRemovedProps`, `RecoveryCodeUsedProps`, `ApiKeyCreatedProps`, `ApiKeyExpiringProps`, `AccountUnlockedProps`.
