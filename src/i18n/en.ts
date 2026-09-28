import type { Messages } from './index'

export const en: Messages = {
  common: {
    greeting: 'Hi {name},',
    greetingAnonymous: 'Hi there,',
    linkFallback: "If the button doesn't work, copy this link into your browser:",
    footerSupport: 'Questions? Write to us at',
    footerRights: 'All rights reserved.',
    minutes: { one: '{count} minute', other: '{count} minutes' },
    hours: { one: '{count} hour', other: '{count} hours' },
    days: { one: '{count} day', other: '{count} days' },
  },
  verifyEmail: {
    subject: 'Confirm your email',
    preheader: 'One step left to finish signing up for {companyName}.',
    heading: 'Confirm your email',
    intro: 'Thanks for signing up for {companyName}! Confirm your email address to activate your account.',
    button: 'Confirm email',
    expires: 'The link expires in {duration}.',
    ignore: "If you didn't sign up for {companyName}, just ignore this email.",
  },
  resetPassword: {
    subject: 'Reset your password',
    preheader: 'Choose a new password for your {companyName} account.',
    heading: 'Reset your password',
    intro:
      'We got a request to reset the password for your {companyName} account. Click the button to choose a new one.',
    button: 'Choose a new password',
    expires: 'The link expires in {duration}.',
    ignore: "If you didn't ask for this, just ignore this email. Your password won't change.",
  },
  passwordChanged: {
    subject: 'Your password was changed',
    preheader: 'The password for your {companyName} account was changed.',
    heading: 'Your password was changed',
    intro: 'The password for your {companyName} account was changed.',
    changedAt: 'When: {date}',
    ip: 'IP address: {ip}',
    ifYou: "If this was you, you don't need to do anything.",
    notYou: "If it wasn't you, contact support right away.",
    button: 'Contact support',
    notYouEmail: "If it wasn't you, write to us right away at {email}.",
  },
}
