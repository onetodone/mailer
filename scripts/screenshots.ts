import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

import { html, memoryTransport, type Branding, type Locale } from '@onetodone/mailer'
import { chromium, type Browser } from 'playwright'

import { branding, createSampleMailer, samples, type Sample } from './samples.ts'

const outDir = join(import.meta.dirname, '..', 'docs', 'images')

// Rendered HTML references these URLs; the script swaps them for data: URIs so pages load without network.
const logoUrl = 'https://example.com/logo.png'
const bannerUrl = 'https://example.com/banner.png'

const brands = {
  plain: { ...branding, logoUrl: undefined, logoWidth: undefined, logoHeight: undefined },
  default: { ...branding, logoUrl, logoWidth: 123, logoHeight: 32 },
  custom: {
    ...branding,
    logoUrl,
    logoWidth: 123,
    logoHeight: 32,
    footerText: 'OneToDone · hello@onetodone.com',
    theme: { primary: '#98c2bc' },
  },
} satisfies Record<string, Branding>

type Brand = keyof typeof brands

const viewports = {
  desktop: 680,
  mobile: 375,
} as const

type Viewport = keyof typeof viewports

interface Email {
  readonly slug: string
  readonly brand: Brand
  readonly locale?: Locale
  readonly caption?: string
}

interface Shot {
  readonly name: string
  readonly viewport: Viewport
  readonly emails: readonly Email[]
}

const singleBudget = 350_000
const compositeBudget = 600_000
const compositeColumn = 400
const compositeGap = 24

const featured = samples.filter((sample) => !sample.slug.endsWith('-minimal') && sample.slug !== 'media')

const shots: readonly Shot[] = [
  {
    name: 'hero',
    viewport: 'desktop',
    emails: [
      { slug: 'verify-email', brand: 'custom', caption: 'verifyEmail' },
      { slug: 'otp-code', brand: 'custom', caption: 'otpCode' },
      { slug: 'new-sign-in', brand: 'custom', caption: 'newSignIn' },
    ],
  },
  {
    name: 'branding',
    viewport: 'desktop',
    emails: [
      { slug: 'reset-password', brand: 'plain', caption: 'Default theme' },
      { slug: 'reset-password', brand: 'custom', caption: 'Logo, primary color and footer text' },
    ],
  },
  {
    name: 'locales',
    viewport: 'desktop',
    emails: [
      { slug: 'verify-email', brand: 'default', locale: 'en', caption: 'English' },
      { slug: 'verify-email', brand: 'default', locale: 'de', caption: 'Deutsch' },
      { slug: 'verify-email', brand: 'default', locale: 'uk', caption: 'Українська' },
      { slug: 'verify-email', brand: 'default', locale: 'ja', caption: '日本語' },
    ],
  },
  { name: 'mobile', viewport: 'mobile', emails: [{ slug: 'otp-code', brand: 'custom' }] },
  { name: 'custom-template', viewport: 'desktop', emails: [{ slug: 'media', brand: 'default' }] },
  ...featured.map((sample): Shot => ({
    name: `templates/${sample.slug}`,
    viewport: 'desktop',
    emails: [{ slug: sample.slug, brand: 'custom' }],
  })),
]

function selectShots(names: readonly string[]): readonly Shot[] {
  if (names.length === 0) return shots
  const unknown = names.filter((name) => !shots.some((shot) => shot.name === name))
  if (unknown.length > 0) {
    console.error(`Unknown screenshot ${unknown.join(', ')}. Known: ${shots.map((shot) => shot.name).join(', ')}.`)
    process.exit(1)
  }
  return shots.filter((shot) => names.includes(shot.name))
}

function warnAboutFonts(): void {
  let families = ''
  try {
    families = execFileSync('fc-list', [':', 'family'], { encoding: 'utf8' })
  } catch {
    return
  }
  const missing = [
    ['Roboto', 'fonts-roboto'],
    ['Noto Sans CJK', 'fonts-noto-cjk'],
    ['Noto Sans Thai', 'fonts-noto-core'],
    ['Noto Sans Georgian', 'fonts-noto-core'],
  ].filter(([family = '']) => !families.includes(family))
  if (missing.length > 0) {
    const packages = [...new Set(missing.map(([, pkg]) => pkg))].join(' ')
    console.warn(
      `Some fonts are missing, so text falls back to other fonts. Install them with: sudo apt install ${packages}`,
    )
  }
}

function imageType(filename: string): string {
  return /\.jpe?g$/i.test(filename) ? 'image/jpeg' : 'image/png'
}

function dataUri(type: string, content: Uint8Array | string): string {
  return `data:${type};base64,${Buffer.from(content).toString('base64')}`
}

const banner = dataUri(
  'image/svg+xml',
  `<svg xmlns="http://www.w3.org/2000/svg" width="1068" height="400" viewBox="0 0 1068 400">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0e7ff"/><stop offset="1" stop-color="#c7d2fe"/></linearGradient></defs>
<rect width="1068" height="400" fill="url(#g)"/>
<text x="534" y="215" text-anchor="middle" font-family="sans-serif" font-size="56" font-weight="700" fill="#4338ca">Inline Image</text>
</svg>`,
)

// Moves sample dates to a fixed moment, keeping their distance from the render time, so images do not change between runs.
const fixedNow = Date.UTC(2026, 9, 7, 9, 41)
function freezeDates<Props extends object>(props: Props, now: number): Props {
  const entries = Object.entries(props).map(([key, value]: [string, unknown]) => [
    key,
    value instanceof Date ? new Date(fixedNow + Math.round((value.getTime() - now) / 60_000) * 60_000) : value,
  ])
  return Object.fromEntries(entries) as Props
}

const mailers = Object.fromEntries(
  Object.entries(brands).map(([name, brand]) => [name, createSampleMailer(memoryTransport(), undefined, brand)]),
) as Record<Brand, ReturnType<typeof createSampleMailer>>

async function renderEmail(email: Email, logo: string): Promise<string> {
  const found = samples.find((sample) => sample.slug === email.slug)
  if (found === undefined) throw new Error(`No sample with slug "${email.slug}".`)
  const sample: Sample = found.template === 'media' ? { ...found, props: { imageUrl: bannerUrl } } : found
  const props = freezeDates(sample.props, Date.now())
  const rendered = await mailers[email.brand].render(sample.template, { locale: email.locale ?? 'en', props })
  const images = (sample.attachments ?? []).flatMap((attachment) =>
    attachment.cid === undefined
      ? []
      : [[`cid:${attachment.cid}`, dataUri(imageType(attachment.filename), attachment.content)] as const],
  )
  return [[logoUrl, logo] as const, [bannerUrl, banner] as const, ...images].reduce(
    (markup, [url, uri]) => markup.replaceAll(`"${url}"`, `"${uri}"`),
    rendered.html,
  )
}

// A low viewport makes the full-page screenshot as tall as the content, with no empty space below it.
async function capture(browser: Browser, markup: string, width: number): Promise<Buffer> {
  const page = await browser.newPage({
    viewport: { width, height: 100 },
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  })
  const blocked: string[] = []
  await page.route('**/*', (route) => {
    blocked.push(route.request().url())
    return route.abort()
  })
  await page.setContent(markup, { waitUntil: 'load' })
  const image = await page.screenshot({ fullPage: true })
  await page.close()
  if (blocked.length > 0) throw new Error(`The page requested network resources: ${blocked.join(', ')}`)
  return image
}

function compositePage(images: readonly Buffer[], captions: readonly string[]): string {
  const columns = images.map(
    (image, index) => html`<figure>
<img src="${dataUri('image/png', image)}" width="${compositeColumn}" alt="">
<figcaption>${captions[index] ?? ''}</figcaption>
</figure>`,
  )
  return html`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<style>
body { margin: 0; background: #f1f5f9; }
main { display: flex; align-items: flex-start; gap: ${compositeGap}px; padding: ${compositeGap}px; width: max-content; }
figure { margin: 0; }
img { display: block; height: auto; border-radius: 8px; box-shadow: 0 1px 3px #0f172a26; }
figcaption { margin-top: 12px; text-align: center; font: 500 15px/1.4 Roboto, 'Noto Sans', 'Noto Sans CJK JP', sans-serif; color: #334155; }
</style>
</head>
<body><main>${columns}</main></body>
</html>`.toString()
}

async function main(): Promise<void> {
  const selected = selectShots(process.argv.slice(2))
  warnAboutFonts()
  const logo = dataUri('image/png', await readFile(join(import.meta.dirname, 'assets', 'logo.png')))
  const browser = await chromium.launch()
  try {
    for (const shot of selected) {
      const width = viewports[shot.viewport]
      const images = await Promise.all(
        shot.emails.map(async (email) => capture(browser, await renderEmail(email, logo), width)),
      )
      const composite = shot.emails.length > 1
      const [single] = images
      const image =
        composite || single === undefined
          ? await capture(
              browser,
              compositePage(
                images,
                shot.emails.map((email) => email.caption ?? ''),
              ),
              images.length * (compositeColumn + compositeGap) + compositeGap,
            )
          : single
      const file = join(outDir, `${shot.name}.png`)
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, image)
      const budget = composite ? compositeBudget : singleBudget
      const size = `${String(Math.round(image.length / 1000))} kB`
      if (image.length > budget) {
        console.warn(`${shot.name}.png is ${size}, over the ${String(budget / 1000)} kB budget.`)
      } else {
        console.log(`${shot.name}.png ${size}`)
      }
    }
  } finally {
    await browser.close()
  }
}

await main()
