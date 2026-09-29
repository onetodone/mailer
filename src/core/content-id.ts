// A restricted set that needs no escaping in HTML attributes or in the
// `Content-ID` header, and covers the IDs mail libraries generate.
const contentId = /^[\w.@-]+$/

export const contentIdRule = 'ASCII letters, digits, ".", "_", "-" and "@"'

export function isContentId(value: string): boolean {
  return contentId.test(value)
}

// `cid:` in attribute values (`src`, `background`, VML `src`) and in CSS
// `url()`, including the entity-encoded quotes the `html` tag writes. A `cid:`
// inside a link's query string or in body text is not a reference.
const reference = /(?:\s[\w:-]+\s*=\s*["']?|url\(\s*(?:["']|&quot;|&#39;)?)\s*cid:([^"'\s)>&]*)/gi

// RFC 2392: a `cid:` URL is the Content-ID with URL escapes.
function decodeReference(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

export function contentIdReferences(markup: string): string[] {
  return [...new Set(Array.from(markup.matchAll(reference), ([, value = '']) => decodeReference(value)))]
}
