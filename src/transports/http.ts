import type { MailAddress, MailAddresses } from './types'

export function formatAddress(address: MailAddress): string {
  if (typeof address === 'string') return address
  const name = address.name ?? ''
  return name === '' ? address.address : `"${name.replace(/["\\]/g, '\\$&')}" <${address.address}>`
}

export function formatAddresses(addresses: MailAddresses): string[]
export function formatAddresses(addresses: MailAddresses | undefined): string[] | undefined
export function formatAddresses(addresses: MailAddresses | undefined): string[] | undefined {
  return addresses === undefined ? undefined : [addresses].flat().map(formatAddress)
}

export function toBytes(content: Uint8Array | string): Uint8Array {
  return typeof content === 'string' ? new TextEncoder().encode(content) : content
}

// btoa over chunks of bytes rather than Buffer, so the transports run wherever fetch does.
export function toBase64(content: Uint8Array | string): string {
  const bytes = toBytes(content)
  let binary = ''
  for (let start = 0; start < bytes.length; start += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(start, start + 0x8000))
  }
  return btoa(binary)
}

export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

export function field(body: unknown, key: string): string | undefined {
  if (typeof body !== 'object' || body === null || !(key in body)) return undefined
  const value: unknown = (body as Record<string, unknown>)[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

// A rate limit (429), a conflicting request (409), a timeout (408) or a server error may pass on a
// later attempt; any other 4xx means the provider rejected the email, the sender or the credentials.
export function isRetryableStatus(status: number): boolean | undefined {
  if (status === 408 || status === 409 || status === 429 || status >= 500) return true
  if (status >= 400) return false
  return undefined
}

export function describeNetworkFailure(provider: string, error: unknown): string {
  const reason = error instanceof Error ? error.message : String(error)
  const cause: unknown = error instanceof Error ? error.cause : undefined
  const code =
    typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string'
      ? ` (${cause.code})`
      : ''
  return `${provider} delivery failed${code}: ${reason}`
}
