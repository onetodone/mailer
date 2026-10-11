# Security policy

## Supported versions

Security fixes go into the latest minor release. While the version is 0.x, that is the latest `0.y` line; upgrade to it to get the fix.

| Version      | Supported |
| ------------ | --------- |
| Latest minor | ✅        |
| Older minors | ❌        |

## Reporting a vulnerability

Please do not open a public issue for a security problem. Report it privately in one of these ways:

- GitHub private vulnerability reporting: [open a report](https://github.com/onetodone/mailer/security/advisories/new).
- Email: [support@onetodone.com](mailto:support@onetodone.com).

Include the package version, a short description of the problem, and the code or input that triggers it. You get a reply within a week. Once a fix is released, the advisory is published with credit to you, unless you prefer to stay anonymous.

## Scope

In scope are problems in the package itself, for example:

- interpolated values that are not escaped in the HTML or the plain-text version;
- links that pass the `http:` and `https:` check but are not safe;
- header injection through addresses, subjects or custom headers;
- email bodies, props or attachment content leaking into hook events or error messages.

Out of scope are the SMTP server, DNS records such as SPF, DKIM and DMARC, and how an application stores or sends the links it passes to the templates.
