---
'@onetodone/mailer': patch
---

Add built-in templates for invitations: `teamInvite`, `userInvite` and `inviteAccepted`.

- `teamInvite` invites someone to an organization, team or workspace in your app. Props: `organizationName` and `acceptUrl` (required), `userName`, `inviterName`, `inviterEmail`, `role`, `expiresInMinutes`.
- `userInvite` invites someone to an account created for them, such as by an admin, where they set a password through `acceptUrl` (required). Other props: `userName`, `inviterName`, `inviterEmail`, `expiresInMinutes`.
- `inviteAccepted` tells the person who sent an invitation that it was accepted. Props: `memberName` (required), `userName`, `organizationName`, `membersUrl`.
- Texts in every built-in locale; prop types `TeamInviteProps`, `UserInviteProps`, `InviteAcceptedProps`.
