---
'@onetodone/mailer': patch
---

Add built-in templates for organization members: `memberRoleChanged`, `memberRemoved`, `ownershipReceived` and `ownershipTransferred`.

- `memberRoleChanged` tells a member about their new role. Props: `organizationName` and `role` (required), `userName`, `previousRole`, `changedByName`, `organizationUrl`.
- `memberRemoved` tells a member they were removed and that their own account stays active. Props: `organizationName` (required), `userName`, `removedByName`.
- `ownershipReceived` goes to the new owner of an organization. Props: `organizationName` (required), `userName`, `previousOwnerName`, `organizationUrl`.
- `ownershipTransferred` goes to the former owner, with what to do if they did not make the transfer. Props: `organizationName` (required), `userName`, `newOwnerName`, `newRole`, `transferredAt`, `timeZone`, `ip`, `supportUrl`.
- Texts in every built-in locale; prop types `MemberRoleChangedProps`, `MemberRemovedProps`, `OwnershipReceivedProps`, `OwnershipTransferredProps`.
