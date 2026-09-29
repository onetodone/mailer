import { crc32, deflateSync } from 'node:zlib'

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function isFinder(x: number, y: number, size: number): boolean | undefined {
  for (const [left, top] of [
    [0, 0],
    [size - 7, 0],
    [0, size - 7],
  ] as const) {
    const dx = x - left
    const dy = y - top
    if (dx >= -1 && dx <= 7 && dy >= -1 && dy <= 7) {
      const ring = Math.max(Math.abs(dx - 3), Math.abs(dy - 3))
      return ring === 3 || ring <= 1
    }
  }
  return undefined
}

function noise(x: number, y: number): boolean {
  let hash = Math.imul(x + 1, 374761393) + Math.imul(y + 1, 668265263)
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177)
  return ((hash ^ (hash >>> 16)) & 1) === 1
}

/**
 * A grayscale PNG that looks like a QR code: finder squares and a fixed
 * pseudo-random pattern, with a quiet zone. It encodes nothing.
 */
export function qrLikePng(modules = 25, scale = 12): Buffer {
  const quiet = 4
  const side = (modules + quiet * 2) * scale
  const rows: Buffer[] = []
  for (let py = 0; py < side; py++) {
    const row = Buffer.alloc(side + 1)
    const y = Math.floor(py / scale) - quiet
    for (let px = 0; px < side; px++) {
      const x = Math.floor(px / scale) - quiet
      const inside = x >= 0 && y >= 0 && x < modules && y < modules
      const dark = inside && (isFinder(x, y, modules) ?? noise(x, y))
      row[px + 1] = dark ? 0 : 255
    }
    rows.push(row)
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(side, 0)
  header.writeUInt32BE(side, 4)
  header[8] = 8
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(Buffer.concat(rows))),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

/** A one-page A4 PDF with a line of ASCII text. */
export function samplePdf(text: string): Buffer {
  const content = `BT /F1 24 Tf 72 760 Td (${text.replace(/[\\()]/g, '\\$&')}) Tj ET`
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${String(content.length)} >>\nstream\n${content}\nendstream`,
  ]
  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  objects.forEach((body, index) => {
    offsets.push(pdf.length)
    pdf += `${String(index + 1)} 0 obj\n${body}\nendobj\n`
  })
  const xref = pdf.length
  pdf += `xref\n0 ${String(objects.length + 1)}\n0000000000 65535 f \n`
  pdf += offsets.map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')
  pdf += `trailer\n<< /Size ${String(objects.length + 1)} /Root 1 0 R >>\nstartxref\n${String(xref)}\n%%EOF\n`
  return Buffer.from(pdf, 'ascii')
}
