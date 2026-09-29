---
'@onetodone/mailer': patch
---

Add attachments and inline images.

- `mailer.send` accepts `attachments`: files with a `filename`, `content` (a `Buffer`, a `Uint8Array`, or text sent as UTF-8), an optional `contentType` and an optional `cid`. Without `contentType`, the type is guessed from the file name extension, with `application/octet-stream` as the fallback, and text content gets `; charset=utf-8`.
- An attachment with a `cid` is an inline image that the HTML shows through `cid:<cid>`. After rendering, `send` checks the HTML, layout included, and rejects with `INVALID_OPTIONS` naming every `cid:` reference without an attachment, before anything is sent. An attachment whose `cid` the HTML never references is sent as a regular attachment.
- `ui.image(src, { alt, width, height })` shows an image from an absolute `http:` or `https:` URL, or an attachment through a `cid:` reference. It renders email-safe markup with an explicit width (534 px, the content width, by default and at most), shrinks on narrow screens, and shows the alt text in the plain-text version. An invalid source throws `UNSAFE_URL`.
- File names and content types with line breaks or other control characters are rejected with `INVALID_OPTIONS`, so attachments cannot inject MIME headers through any transport. Content types must be MIME types, and a `cid` uses ASCII letters, digits, `.`, `_`, `-` and `@` and is unique within an email.
- `smtpTransport` delivers attachments, with inline images next to the HTML. `consoleTransport` prints the name, type and size of each attachment, and `memoryTransport` records them in `sent`.
- `OutgoingMessage` has an optional `attachments` list, in which `contentType` is always set and `cid` is set only on referenced inline images. A custom transport must deliver every attachment or reject.
- Hook events list the `filename`, `contentType` and `size` of each attachment, never its content.
- Types `Attachment`, `OutgoingAttachment`, `AttachmentInfo` and `ImageOptions`.
