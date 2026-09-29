# Configuration

| Setting     | Description                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `transport` | Required. Delivers the emails: `smtpTransport(…)`, `memoryTransport()`, `consoleTransport()` or [your own](transports.md#your-own-transport). |
| `from`      | Required. Sender of every email, in any [address form](sending.md).                                                                           |
| `branding`  | Required. Company name, links, logo, footer text and theme. See [branding and theme](customization.md#1-branding-and-theme).                  |
| `replyTo`   | Default address or addresses for replies.                                                                                                     |
| `locale`    | Default locale: `en` (the default), `be`, or a key of `messages`.                                                                             |
| `timeZone`  | IANA time zone for dates in emails, such as `Europe/Berlin`. Default `UTC`.                                                                   |
| `messages`  | Text overrides and extra locales. See [texts and locales](locales.md).                                                                        |
| `layout`    | Replaces the built-in layout. See [layout](customization.md#3-layout).                                                                        |
| `templates` | Adds templates or replaces built-in ones. See [templates](customization.md#4-templates).                                                      |
| `onSent`    | Called after the transport accepted an email. See [hooks](hooks.md).                                                                          |
| `onError`   | Called when sending fails. See [hooks](hooks.md).                                                                                             |

Unknown settings, such as `sender` instead of `from`, are rejected, so typos surface at startup. The error lists every problem at once, with the path to each setting:

```text
MailerError: Invalid mailer configuration: from must be an email address like "user@example.com" or "Name <user@example.com>", received "no-reply"; branding.theme.primary must be a HEX color like "#3b82f6", received "blue".
```
