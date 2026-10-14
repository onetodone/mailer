import { html, type SafeHtml } from '../core/html'
import type { BuiltInTemplates } from '../templates/built-in'
import type { TemplateSections } from '../templates/messages'
import { beLatn } from './be-Latn'
import { be } from './be'
import { cs } from './cs'
import { de } from './de'
import { en } from './en'
import { et } from './et'
import { fr } from './fr'
import { it } from './it'
import { ja } from './ja'
import { ka } from './ka'
import { lt } from './lt'
import { lv } from './lv'
import { pl } from './pl'
import { ro } from './ro'
import { th } from './th'
import { uk } from './uk'
import { zh } from './zh'

/**
 * Forms of one message for each `Intl.PluralRules` category of the locale.
 * `{count}` is replaced by the number; `other` is used for categories without a form.
 */
export interface PluralForms {
  /** Form for the `zero` category. */
  readonly zero?: string
  /** Form for the `one` category. */
  readonly one?: string
  /** Form for the `two` category. */
  readonly two?: string
  /** Form for the `few` category. */
  readonly few?: string
  /** Form for the `many` category. */
  readonly many?: string
  /** Form for every category without its own form. */
  readonly other: string
}

/** Texts shared by every template, the blocks and the layout. */
export interface CommonMessages {
  /** Greeting with the recipient's name, such as "Hi {name},". */
  readonly greeting: string
  /** Greeting when the name is unknown, such as "Hi there,". */
  readonly greetingAnonymous: string
  /** Line above the fallback link under a button. */
  readonly linkFallback: string
  /** Lead-in before the support email address in the footer. */
  readonly footerSupport: string
  /** Text after the copyright notice in the footer. */
  readonly footerRights: string
  /** A number of minutes, in the grammatical form the `expires` sentences need. */
  readonly minutes: PluralForms
  /** A number of hours, in the grammatical form the `expires` sentences need. */
  readonly hours: PluralForms
  /** A number of days, in the grammatical form the `expires` sentences need. */
  readonly days: PluralForms
}

/** Texts of the `verifyEmail` template. */
export interface VerifyEmailMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "24 hours". */
  readonly expires: string
  /** Note for recipients who did not sign up. */
  readonly ignore: string
}

/** Texts of the `resetPassword` template. */
export interface ResetPasswordMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "30 minutes". */
  readonly expires: string
  /** Note for recipients who did not ask for a reset. */
  readonly ignore: string
}

/** Texts of the `passwordChanged` template. */
export interface PasswordChangedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `verifyEmailChange` template. */
export interface VerifyEmailChangeMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "24 hours". */
  readonly expires: string
  /** Note for recipients who did not ask to change their email. */
  readonly ignore: string
}

/** Texts of the `emailChangeRequested` template. */
export interface EmailChangeRequestedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting, with `{newEmail}`. */
  readonly intro: string
  /** Time of the request, with `{date}`. */
  readonly requestedAt: string
  /** IP address of the request, with `{ip}`. */
  readonly ip: string
  /** What the account owner who made the request does next, with `{newEmail}`. */
  readonly ifYou: string
  /** Call to action when the owner did not make the request, followed by the cancel button. */
  readonly notYouCancel: string
  /** Cancel button label. */
  readonly cancelButton: string
  /** Call to action without a cancel URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a cancel or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `emailChanged` template. */
export interface EmailChangedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** The new address, with `{newEmail}`. */
  readonly newEmail: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Where emails about the account go after the change. */
  readonly newAddress: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `otpCode` template. */
export interface OtpCodeMessages {
  /** The built-in texts leave out the code, because subjects show in notifications and on lock screens; `{code}` is available. */
  readonly subject: string
  /** Inbox preview text. The built-in texts leave out the code, as in `subject`; `{code}` is available. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph above the code. */
  readonly intro: string
  /** Expiry note, with `{duration}` such as "10 minutes". */
  readonly expires: string
  /** Warning not to share the code. */
  readonly doNotShare: string
  /** Note for recipients who did not ask for a code. */
  readonly ignore: string
}

/** Texts of the `magicLink` template. */
export interface MagicLinkMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "15 minutes". */
  readonly expires: string
  /** Warning not to share the link. */
  readonly doNotShare: string
  /** Note for recipients who did not try to sign in. */
  readonly ignore: string
}

/** Texts of the `welcome` template. */
export interface WelcomeMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Button label. */
  readonly button: string
}

/** Texts of the `newSignIn` template. */
export interface NewSignInMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the sign-in, with `{date}`. */
  readonly signedInAt: string
  /** Device or browser of the sign-in, with `{device}`. */
  readonly device: string
  /** Approximate location of the sign-in, with `{location}`. */
  readonly location: string
  /** IP address of the sign-in, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who signed in. */
  readonly ifYou: string
  /** Call to action when the owner did not sign in, followed by the secure-account button. */
  readonly notYouSecure: string
  /** Secure-account button label. */
  readonly secureButton: string
  /** Call to action without a secure-account URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a secure-account or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `twoFactorEnabled` template. */
export interface TwoFactorEnabledMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `twoFactorDisabled` template. */
export interface TwoFactorDisabledMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `accountLocked` template. */
export interface AccountLockedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** End of the lock, with `{date}`. */
  readonly lockedUntil: string
  /** IP address of the failed sign-in attempts, with `{ip}`. */
  readonly ip: string
  /** Paragraph above the unlock button. */
  readonly unlock: string
  /** Unlock button label. */
  readonly unlockButton: string
  /** Offer of help without an unlock URL, followed by the support button. */
  readonly help: string
  /** Support button label. */
  readonly button: string
  /** Offer of help without an unlock or support URL, with `{email}` as a link to the support address. */
  readonly helpEmail: string
  /** Advice for the account owner who did not try to sign in. */
  readonly notYou: string
}

/** Texts of the `confirmAccountDeletion` template. */
export interface ConfirmAccountDeletionMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** What deletion means for the account and its data, above the button. */
  readonly warning: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "1 hour". */
  readonly expires: string
  /** Note for recipients who did not ask to delete their account. */
  readonly ignore: string
}

/** Texts of the `accountDeleted` template. */
export interface AccountDeletedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Goodbye for the account owner who asked for the deletion. */
  readonly farewell: string
  /** Call to action when the owner did not ask for the deletion, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `teamInvite` template. */
export interface TeamInviteMessages {
  /** Subject line, with `{organizationName}`. */
  readonly subject: string
  /** Inbox preview text, with `{organizationName}`. */
  readonly preheader: string
  /** Heading at the top of the email, with `{organizationName}`. */
  readonly heading: string
  /** Paragraph under the greeting, with `{inviter}` and `{organizationName}`. */
  readonly intro: string
  /** Paragraph under the greeting without an inviter, with `{organizationName}`. */
  readonly introAnonymous: string
  /** Role on joining, with `{role}`. */
  readonly role: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "7 days". */
  readonly expires: string
  /** Note for recipients who did not expect the invitation. */
  readonly ignore: string
}

/** Texts of the `userInvite` template. */
export interface UserInviteMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting, with `{inviter}`. */
  readonly intro: string
  /** Paragraph under the greeting without an inviter. */
  readonly introAnonymous: string
  /** What accepting the invitation does, above the button. */
  readonly setUp: string
  /** Button label. */
  readonly button: string
  /** Expiry note, with `{duration}` such as "7 days". */
  readonly expires: string
  /** Note for recipients who did not expect the invitation. */
  readonly ignore: string
}

/** Texts of the `inviteAccepted` template. */
export interface InviteAcceptedMessages {
  /** Subject line, with `{memberName}`. */
  readonly subject: string
  /** Inbox preview text, with `{memberName}`. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting, with `{memberName}` and `{organizationName}`. */
  readonly intro: string
  /** Paragraph under the greeting without an organization, with `{memberName}`. */
  readonly introApp: string
  /** Button label. */
  readonly button: string
}

/** Texts of the `memberRoleChanged` template. */
export interface MemberRoleChangedMessages {
  /** Subject line, with `{organizationName}`. */
  readonly subject: string
  /** Inbox preview text, with `{organizationName}`. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting, with `{organizationName}`. */
  readonly intro: string
  /** The new role, with `{role}`. */
  readonly role: string
  /** The role before the change, with `{previousRole}`. */
  readonly previousRole: string
  /** Who changed the role, with `{changedBy}`. */
  readonly changedBy: string
  /** Button label, with `{organizationName}`. */
  readonly button: string
  /** Where to ask about the change, with `{organizationName}`. */
  readonly questions: string
}

/** Texts of the `memberRemoved` template. */
export interface MemberRemovedMessages {
  /** Subject line, with `{organizationName}`. */
  readonly subject: string
  /** Inbox preview text, with `{organizationName}`. */
  readonly preheader: string
  /** Heading at the top of the email, with `{organizationName}`. */
  readonly heading: string
  /** Paragraph under the greeting, with `{organizationName}`. */
  readonly intro: string
  /** Who removed the member, with `{removedBy}`. */
  readonly removedBy: string
  /** What happens to the member's own account. */
  readonly account: string
  /** Where to turn if the removal is a mistake, with `{organizationName}`. */
  readonly mistake: string
}

/** Texts of the `ownershipReceived` template. */
export interface OwnershipReceivedMessages {
  /** Subject line, with `{organizationName}`. */
  readonly subject: string
  /** Inbox preview text, with `{organizationName}`. */
  readonly preheader: string
  /** Heading at the top of the email, with `{organizationName}`. */
  readonly heading: string
  /** Paragraph under the greeting, with `{previousOwner}` and `{organizationName}`. */
  readonly intro: string
  /** Paragraph under the greeting without a previous owner, with `{organizationName}`. */
  readonly introAnonymous: string
  /** What the owner can do, with `{organizationName}`. */
  readonly owner: string
  /** Button label, with `{organizationName}`. */
  readonly button: string
}

/** Texts of the `ownershipTransferred` template. */
export interface OwnershipTransferredMessages {
  /** Subject line, with `{organizationName}`. */
  readonly subject: string
  /** Inbox preview text, with `{organizationName}`. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting, with `{organizationName}` and `{newOwner}`. */
  readonly intro: string
  /** Paragraph under the greeting without a new owner, with `{organizationName}`. */
  readonly introAnonymous: string
  /** The recipient's role after the transfer, with `{role}`. */
  readonly newRole: string
  /** Time of the transfer, with `{date}`. */
  readonly transferredAt: string
  /** IP address of the transfer, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the former owner who made the transfer. */
  readonly ifYou: string
  /** Call to action when the former owner did not make the transfer, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `passkeyAdded` template. */
export interface PasskeyAddedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Name of the passkey, with `{passkeyName}`. */
  readonly passkey: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** Device or browser of the change, with `{device}`. */
  readonly device: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the secure-account button. */
  readonly notYouSecure: string
  /** Secure-account button label. */
  readonly secureButton: string
  /** Call to action without a secure-account URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a secure-account or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `passkeyRemoved` template. */
export interface PasskeyRemovedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Name of the passkey, with `{passkeyName}`. */
  readonly passkey: string
  /** Time of the change, with `{date}`. */
  readonly changedAt: string
  /** Device or browser of the change, with `{device}`. */
  readonly device: string
  /** IP address of the change, with `{ip}`. */
  readonly ip: string
  /** Reassurance for the account owner who made the change. */
  readonly ifYou: string
  /** Call to action when the owner did not make the change, followed by the secure-account button. */
  readonly notYouSecure: string
  /** Secure-account button label. */
  readonly secureButton: string
  /** Call to action without a secure-account URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a secure-account or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `recoveryCodeUsed` template. */
export interface RecoveryCodeUsedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the sign-in, with `{date}`. */
  readonly usedAt: string
  /** Device or browser of the sign-in, with `{device}`. */
  readonly device: string
  /** IP address of the sign-in, with `{ip}`. */
  readonly ip: string
  /** Number of unused codes, with `{count}`. */
  readonly remaining: string
  /** Request to generate new codes when none are left. */
  readonly noneLeft: string
  /** Paragraph above the generate-codes button while codes are left. */
  readonly regenerate: string
  /** Generate-codes button label. */
  readonly regenerateButton: string
  /** Call to action when the owner did not sign in, followed by the secure-account button. */
  readonly notYouSecure: string
  /** Secure-account button label. */
  readonly secureButton: string
  /** Call to action without a secure-account URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a secure-account or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `apiKeyCreated` template. */
export interface ApiKeyCreatedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Name of the key, with `{keyName}`. */
  readonly keyName: string
  /** Time the key was created, with `{date}`. */
  readonly createdAt: string
  /** Time the key expires, with `{date}`. */
  readonly expiresAt: string
  /** IP address the key was created from, with `{ip}`. */
  readonly ip: string
  /** Reassurance and advice for the account owner who created the key. */
  readonly ifYou: string
  /** Call to action when the owner did not create the key, followed by the manage-keys button. */
  readonly notYouRevoke: string
  /** Manage-keys button label. */
  readonly manageButton: string
  /** Call to action without a manage-keys URL, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a manage-keys or support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `apiKeyExpiring` template. */
export interface ApiKeyExpiringMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Name of the key, with `{keyName}`. */
  readonly keyName: string
  /** Time the key expires, with `{date}`. */
  readonly expiresAt: string
  /** What happens on expiry and how to avoid it. */
  readonly renew: string
  /** Button label. */
  readonly button: string
  /** Note for owners who no longer use the key. */
  readonly unused: string
}

/** Texts of the `accountUnlocked` template. */
export interface AccountUnlockedMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the unlock, with `{date}`. */
  readonly unlockedAt: string
  /** Sign-in button label. */
  readonly signInButton: string
  /** Advice for owners who did not make the failed sign-in attempts. */
  readonly advice: string
  /** Offer of help, followed by the support button. */
  readonly help: string
  /** Support button label. */
  readonly button: string
  /** Offer of help without a support URL, with `{email}` as a link to the support address. */
  readonly helpEmail: string
}

/** Texts of the `dataExportReady` template. */
export interface DataExportReadyMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Download button label. */
  readonly downloadButton: string
  /** Expiry note, with `{duration}` such as "7 days". */
  readonly expires: string
  /** Warning not to share the link. */
  readonly doNotShare: string
  /** Call to action when the owner did not ask for the export, followed by the support button. */
  readonly notYou: string
  /** Support button label. */
  readonly button: string
  /** Call to action without a support URL, with `{email}` as a link to the support address. */
  readonly notYouEmail: string
}

/** Texts of the `inactiveAccountWarning` template. */
export interface InactiveAccountWarningMessages {
  /** Subject line. */
  readonly subject: string
  /** Inbox preview text. */
  readonly preheader: string
  /** Heading at the top of the email. */
  readonly heading: string
  /** Paragraph under the greeting. */
  readonly intro: string
  /** Time of the deletion, with `{date}`. */
  readonly deletionDate: string
  /** Time of the last sign-in, with `{date}`. */
  readonly lastSignInAt: string
  /** How to keep the account, above the button. */
  readonly keep: string
  /** Button label. */
  readonly button: string
  /** Note for owners who no longer need the account. */
  readonly noAction: string
}

/** Texts of the `policyUpdated` template. */
export interface PolicyUpdatedMessages {
  /** Subject line for the terms of service. */
  readonly termsSubject: string
  /** Inbox preview text for the terms of service. */
  readonly termsPreheader: string
  /** Heading for the terms of service. */
  readonly termsHeading: string
  /** Paragraph under the greeting for the terms of service. */
  readonly termsIntro: string
  /** Button label for the terms of service. */
  readonly termsButton: string
  /** Closing note for the terms of service. */
  readonly termsAgree: string
  /** Subject line for the privacy policy. */
  readonly privacySubject: string
  /** Inbox preview text for the privacy policy. */
  readonly privacyPreheader: string
  /** Heading for the privacy policy. */
  readonly privacyHeading: string
  /** Paragraph under the greeting for the privacy policy. */
  readonly privacyIntro: string
  /** Button label for the privacy policy. */
  readonly privacyButton: string
  /** Closing note for the privacy policy. */
  readonly privacyNoAction: string
  /** When the changes take effect, with `{date}`. */
  readonly effectiveAt: string
  /** Lead-in above the list of changes. */
  readonly changes: string
}

/**
 * Every text of the built-in templates, the blocks and the layout for one locale.
 *
 * This type describes the full built-in dictionary and gains keys whenever
 * built-in templates are added, in any release, so a full dictionary typed as
 * `Messages` is not covered by semver. Type your own texts with
 * {@link MessagesOverrides} (or {@link LocaleMessages} for one locale); keys
 * you leave out fall back to English.
 */
export interface Messages {
  /** Texts shared by every template, the blocks and the layout. */
  readonly common: CommonMessages
  /** Texts of the `verifyEmail` template. */
  readonly verifyEmail: VerifyEmailMessages
  /** Texts of the `resetPassword` template. */
  readonly resetPassword: ResetPasswordMessages
  /** Texts of the `passwordChanged` template. */
  readonly passwordChanged: PasswordChangedMessages
  /** Texts of the `verifyEmailChange` template. */
  readonly verifyEmailChange: VerifyEmailChangeMessages
  /** Texts of the `emailChangeRequested` template. */
  readonly emailChangeRequested: EmailChangeRequestedMessages
  /** Texts of the `emailChanged` template. */
  readonly emailChanged: EmailChangedMessages
  /** Texts of the `otpCode` template. */
  readonly otpCode: OtpCodeMessages
  /** Texts of the `magicLink` template. */
  readonly magicLink: MagicLinkMessages
  /** Texts of the `welcome` template. */
  readonly welcome: WelcomeMessages
  /** Texts of the `newSignIn` template. */
  readonly newSignIn: NewSignInMessages
  /** Texts of the `twoFactorEnabled` template. */
  readonly twoFactorEnabled: TwoFactorEnabledMessages
  /** Texts of the `twoFactorDisabled` template. */
  readonly twoFactorDisabled: TwoFactorDisabledMessages
  /** Texts of the `accountLocked` template. */
  readonly accountLocked: AccountLockedMessages
  /** Texts of the `confirmAccountDeletion` template. */
  readonly confirmAccountDeletion: ConfirmAccountDeletionMessages
  /** Texts of the `accountDeleted` template. */
  readonly accountDeleted: AccountDeletedMessages
  /** Texts of the `teamInvite` template. */
  readonly teamInvite: TeamInviteMessages
  /** Texts of the `userInvite` template. */
  readonly userInvite: UserInviteMessages
  /** Texts of the `inviteAccepted` template. */
  readonly inviteAccepted: InviteAcceptedMessages
  /** Texts of the `memberRoleChanged` template. */
  readonly memberRoleChanged: MemberRoleChangedMessages
  /** Texts of the `memberRemoved` template. */
  readonly memberRemoved: MemberRemovedMessages
  /** Texts of the `ownershipReceived` template. */
  readonly ownershipReceived: OwnershipReceivedMessages
  /** Texts of the `ownershipTransferred` template. */
  readonly ownershipTransferred: OwnershipTransferredMessages
  /** Texts of the `passkeyAdded` template. */
  readonly passkeyAdded: PasskeyAddedMessages
  /** Texts of the `passkeyRemoved` template. */
  readonly passkeyRemoved: PasskeyRemovedMessages
  /** Texts of the `recoveryCodeUsed` template. */
  readonly recoveryCodeUsed: RecoveryCodeUsedMessages
  /** Texts of the `apiKeyCreated` template. */
  readonly apiKeyCreated: ApiKeyCreatedMessages
  /** Texts of the `apiKeyExpiring` template. */
  readonly apiKeyExpiring: ApiKeyExpiringMessages
  /** Texts of the `accountUnlocked` template. */
  readonly accountUnlocked: AccountUnlockedMessages
  /** Texts of the `dataExportReady` template. */
  readonly dataExportReady: DataExportReadyMessages
  /** Texts of the `inactiveAccountWarning` template. */
  readonly inactiveAccountWarning: InactiveAccountWarningMessages
  /** Texts of the `policyUpdated` template. */
  readonly policyUpdated: PolicyUpdatedMessages
}

type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T] & string

/** Dotted path of a text in {@link Messages}, such as `'verifyEmail.subject'`. */
export type MessageKey = { [S in keyof Messages]: `${S}.${StringKeys<Messages[S]>}` }[keyof Messages]

export type CommonMessageKey = Extract<MessageKey, `common.${string}`>

export type DeepPartial<T> = {
  readonly [K in keyof T]?: (T[K] extends string ? T[K] : DeepPartial<T[K]>) | undefined
}

// A custom template with its own texts replaces the built-in section of the same name.
type MailerMessages<Templates> = [keyof TemplateSections<Templates>] extends [never]
  ? Messages
  : Omit<Messages, keyof TemplateSections<Templates>> & TemplateSections<Templates>

/**
 * Texts of one locale; keys it leaves out fall back to English.
 *
 * Pass the custom templates as `Templates`, such as `LocaleMessages<typeof templates>`,
 * to include the texts of templates with their own `messages`.
 */
export type LocaleMessages<Templates = BuiltInTemplates> = DeepPartial<MailerMessages<Templates>>

export type MessageSource = Readonly<Record<string, LocaleMessages | undefined>> & { readonly en: Messages }

/**
 * Text overrides by locale, for the `messages` setting. Each locale's texts are
 * merged key by key over the built-in ones, and any locale falls back to
 * English for the keys it leaves out.
 *
 * Pass the custom templates as `Templates`, such as `MessagesOverrides<typeof templates>`,
 * to override the texts of templates with their own `messages` too.
 */
export type MessagesOverrides<Templates = BuiltInTemplates> = Readonly<
  Record<string, LocaleMessages<Templates> | undefined>
>

export const dictionaries = {
  en,
  'be-Latn': beLatn,
  be,
  cs,
  de,
  et,
  fr,
  it,
  ja,
  ka,
  lt,
  lv,
  pl,
  ro,
  th,
  uk,
  zh,
} satisfies MessageSource

/**
 * A locale with built-in texts.
 *
 * This type lists the built-in locales and gains values whenever a built-in
 * locale is added, in any release, so code that requires every `Locale` value
 * (such as `Record<Locale, …>`) is not covered by semver. If you already use a
 * locale through `messages` and it becomes built-in, your overrides still win;
 * keys you did not override come from the built-in texts instead of English.
 */
export type Locale = keyof typeof dictionaries

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function mergeTree(base: Readonly<Record<string, unknown>>, override: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(override)) return base
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === 'string') {
      result[key] = value
    } else if (isRecord(value)) {
      const current = base[key]
      result[key] = mergeTree(isRecord(current) ? current : {}, value)
    }
  }
  return result
}

export function mergeMessages(base: Messages, override: LocaleMessages | undefined): Messages {
  return mergeTree(base as unknown as Readonly<Record<string, unknown>>, override) as unknown as Messages
}

/**
 * Resolves the texts of every locale in `source` and `overrides`. English with
 * its overrides is the base, so a locale falls back to it key by key.
 */
export function buildMessages(
  overrides: MessagesOverrides = {},
  source: MessageSource = dictionaries,
): Readonly<Record<Locale, Messages> & Record<string, Messages | undefined>> {
  const base = mergeMessages(source.en, overrides.en)
  const result: Record<string, Messages> = { en: base }
  for (const locale of new Set([...Object.keys(source), ...Object.keys(overrides)])) {
    if (locale !== 'en') result[locale] = mergeMessages(mergeMessages(base, source[locale]), overrides[locale])
  }
  return result as Record<Locale, Messages> & Record<string, Messages | undefined>
}

/** Values for `{name}` placeholders in plain-text messages. */
export type MessageParams = Readonly<Record<string, string | number>>

/** Values for `{name}` placeholders in HTML messages; {@link SafeHtml} values are inserted as markup. */
export type HtmlMessageParams = Readonly<Record<string, string | number | SafeHtml>>

/** Values for the placeholders of a text with plural forms; `count` picks the form. */
type PluralMessageParams = MessageParams & { readonly count: number }

/** Values for the placeholders of an HTML text with plural forms; `count` picks the form. */
type HtmlPluralMessageParams = HtmlMessageParams & { readonly count: number }

/**
 * Looks up a text for the current locale and fills its `{name}` placeholders.
 * `{companyName}` is always available; placeholders without a value stay as they are.
 *
 * `Key` lists the text keys it accepts: every built-in key by default, or the
 * template's own keys plus `common.*` in a template with its own `messages`.
 * `PluralKey` lists the template's texts with plural forms: `count` picks the
 * form through the plural rules of the locale, and `{count}` is the number
 * formatted for the locale.
 *
 * @example
 * t('common.greeting', { name: props.userName })
 * t('cart.items', { count: props.items.length })
 * t.html('passwordChanged.notYouEmail', { email: html`<a href="mailto:${address}">${address}</a>` })
 */
export interface Translate<Key extends string = MessageKey, PluralKey extends string = never> {
  // The text signature comes last, so `Parameters<Translate>` keeps describing it.
  /** Returns plain text in the plural form for `count`. Blocks escape it. */
  (key: PluralKey, params: PluralMessageParams): string
  /** Returns plain text. Blocks escape it, so it is safe to pass to `ui.paragraph` and the like. */
  (key: Key, params?: MessageParams): string
  /** Returns markup: the text and string params are escaped, {@link SafeHtml} params are inserted as-is. */
  readonly html: {
    (key: PluralKey, params: HtmlPluralMessageParams): SafeHtml
    (key: Key, params?: HtmlMessageParams): SafeHtml
  }
}

/** Locale-aware formatting for template texts. */
export interface Formatters {
  /**
   * A duration from a number of minutes, in whole days, hours or minutes, such as
   * "30 minutes", "24 hours" or "3 days". Uses the `common.minutes`, `common.hours`
   * and `common.days` plural forms.
   */
  readonly duration: (minutes: number) => string
  /**
   * A date and time with the time zone name, such as "May 4, 2026 at 9:30 AM UTC".
   *
   * @param timeZone - IANA time zone. Default: the mailer's time zone, UTC unless configured.
   */
  readonly dateTime: (date: Date, timeZone?: string) => string
}

export interface I18nOptions {
  readonly locale: string
  readonly messages: Messages
  readonly companyName: string
  readonly timeZone?: string | undefined
}

const placeholder = /\{(\w+)\}/g

function lookup(messages: Messages, key: string): unknown {
  const dot = key.indexOf('.')
  const section: unknown = messages[key.slice(0, dot) as keyof Messages]
  return isRecord(section) ? section[key.slice(dot + 1)] : undefined
}

function interpolate(message: string, params: MessageParams): string {
  return message.replace(placeholder, (match, name: string) => {
    const value = Object.hasOwn(params, name) ? params[name] : undefined
    return value === undefined ? match : String(value)
  })
}

function interpolateHtml(message: string, params: HtmlMessageParams): SafeHtml {
  const parts = message.split(/\{(\w+)\}/)
  return html`${parts.map((part, index) => {
    if (index % 2 === 0) return part
    const value = Object.hasOwn(params, part) ? params[part] : undefined
    return value ?? `{${part}}`
  })}`
}

export function createI18n({ locale, messages, companyName, timeZone = 'UTC' }: I18nOptions): {
  t: Translate
  format: Formatters
} {
  const pluralRules = new Intl.PluralRules(locale)
  const numberFormat = new Intl.NumberFormat(locale)

  // Without a numeric `count`, plural forms fall back to `other` and `{count}` keeps the given value.
  function resolve<P extends HtmlMessageParams>(key: string, params: P): [string, P] {
    const value = lookup(messages, key)
    if (typeof value === 'string') return [value, params]
    if (!isRecord(value) || typeof value.other !== 'string') return [key, params]
    const { count } = params
    if (typeof count !== 'number') return [value.other, params]
    const form = value[pluralRules.select(count)]
    return [typeof form === 'string' ? form : value.other, { ...params, count: numberFormat.format(count) }]
  }

  const t: Translate = Object.assign(
    (key: MessageKey, params: MessageParams = {}) => interpolate(...resolve(key, { companyName, ...params })),
    {
      html: (key: MessageKey, params: HtmlMessageParams = {}) =>
        interpolateHtml(...resolve(key, { companyName, ...params })),
    },
  )
  const { minutes, hours, days } = messages.common

  const format: Formatters = {
    duration: (total) => {
      const [count, forms]: [number, PluralForms] =
        total >= 2880 && total % 1440 === 0
          ? [total / 1440, days]
          : total >= 60 && total % 60 === 0
            ? [total / 60, hours]
            : [total, minutes]
      return interpolate(forms[pluralRules.select(count)] ?? forms.other, { count: numberFormat.format(count) })
    },
    dateTime: (date, zone = timeZone) =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: zone,
        timeZoneName: 'short',
      }).format(date),
  }

  return { t, format }
}
