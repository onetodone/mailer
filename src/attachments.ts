import type { AttachmentInfo } from './config'
import { contentIdReferences } from './core/content-id'
import { MailerError } from './errors'
import type { Attachment, OutgoingAttachment } from './transports/types'

const contentTypes = new Map([
  ['pdf', 'application/pdf'],
  ['csv', 'text/csv'],
  ['txt', 'text/plain'],
  ['ics', 'text/calendar'],
  ['htm', 'text/html'],
  ['html', 'text/html'],
  ['json', 'application/json'],
  ['xml', 'application/xml'],
  ['zip', 'application/zip'],
  ['doc', 'application/msword'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['xls', 'application/vnd.ms-excel'],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ['ppt', 'application/vnd.ms-powerpoint'],
  ['pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  ['odt', 'application/vnd.oasis.opendocument.text'],
  ['ods', 'application/vnd.oasis.opendocument.spreadsheet'],
  ['png', 'image/png'],
  ['jpg', 'image/jpeg'],
  ['jpeg', 'image/jpeg'],
  ['gif', 'image/gif'],
  ['webp', 'image/webp'],
  ['svg', 'image/svg+xml'],
])

const defaultContentType = 'application/octet-stream'

function guessContentType(filename: string, content: Uint8Array | string): string {
  const extension = /\.([^.]+)$/.exec(filename)?.[1]?.toLowerCase()
  const type = (extension === undefined ? undefined : contentTypes.get(extension)) ?? defaultContentType
  // Text content goes out as UTF-8; without the charset, clients may read it as Latin-1.
  return typeof content === 'string' && type.startsWith('text/') ? `${type}; charset=utf-8` : type
}

export function contentSize(content: Uint8Array | string): number {
  return typeof content === 'string' ? Buffer.byteLength(content) : content.byteLength
}

export function withContentType({ filename, content, contentType, cid }: Attachment): OutgoingAttachment {
  const resolved = { filename, content, contentType: contentType ?? guessContentType(filename, content) }
  return cid === undefined ? resolved : { ...resolved, cid }
}

export function describeAttachment({ filename, contentType, content }: OutgoingAttachment): AttachmentInfo {
  return { filename, contentType, size: contentSize(content) }
}

// A cid the HTML never references is dropped, so the file goes out as a
// regular attachment instead of a hidden part of multipart/related.
export function linkInlineImages(
  markup: string,
  attachments: readonly OutgoingAttachment[] | undefined,
): OutgoingAttachment[] | undefined {
  const references = contentIdReferences(markup)
  const missing = references.filter((id) => attachments?.some((attachment) => attachment.cid === id) !== true)
  if (missing.length > 0) {
    const ids = missing.map((id) => JSON.stringify(id)).join(', ')
    throw new MailerError(
      'INVALID_OPTIONS',
      `Invalid send options: attachments must include ${missing.length === 1 ? 'cid' : 'cids'} ${ids} referenced in the HTML.`,
    )
  }
  return attachments?.map(({ filename, content, contentType, cid }) =>
    cid !== undefined && references.includes(cid)
      ? { filename, content, contentType, cid }
      : { filename, content, contentType },
  )
}
