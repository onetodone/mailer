/** Resolved theme tokens. Colors are lowercase `#rrggbb`. */
export interface Theme {
  /** Brand color for buttons and links. */
  readonly primary: string
  /** Text color on `primary`, such as button labels. */
  readonly primaryText: string
  /** Page background around the email card. */
  readonly background: string
  /** Background of the email card. */
  readonly surface: string
  /** Main text color. */
  readonly text: string
  /** Secondary text: notes, footer, fallback links. */
  readonly mutedText: string
  /** Borders and dividers. */
  readonly border: string
  /** Corner radius of the card and buttons, in pixels. */
  readonly radius: number
}

/** Branding with defaults applied and every value validated. */
export interface ResolvedBranding {
  /** Company name, trimmed. */
  readonly companyName: string
  /** Absolute http(s) URL the logo or company name links to, normalized. */
  readonly appUrl: string
  /** Address for the support link in the footer. */
  readonly supportEmail: string
  /** Absolute http(s) URL of the logo image, normalized; `undefined` without a logo. */
  readonly logoUrl: string | undefined
  /** Logo width in pixels. Default `120`. */
  readonly logoWidth: number
  /** Logo height in pixels, or `undefined` when not set. */
  readonly logoHeight: number | undefined
  /** Extra line at the top of the footer; `undefined` when not set or empty. */
  readonly footerText: string | undefined
  /** Theme tokens with defaults applied. */
  readonly theme: Theme
}

/** Theme tokens accepted in `branding.theme`. All optional. Colors are HEX, such as `#3b82f6` or `#fff`. */
export interface ThemeInput {
  /** Brand color for buttons and links. Default `#2563eb`. */
  readonly primary?: string | undefined
  /** Text color on `primary`. Default: white, or near-black when white is not readable on `primary`. */
  readonly primaryText?: string | undefined
  /** Page background around the email card. Default `#f4f4f5`. */
  readonly background?: string | undefined
  /** Background of the email card. Default `#ffffff`. */
  readonly surface?: string | undefined
  /** Main text color. Default `#18181b`. */
  readonly text?: string | undefined
  /** Secondary text: notes, footer, fallback links. Default `#71717a`. */
  readonly mutedText?: string | undefined
  /** Borders and dividers. Default `#e4e4e7`. */
  readonly border?: string | undefined
  /** Corner radius of the card and buttons, in pixels. Default `8`. */
  readonly radius?: number | undefined
}

/** Branding settings: company name, links, logo, footer text and theme. */
export interface Branding {
  /** Shown in the header when there is no logo, in the logo alt text and in the copyright line. */
  readonly companyName: string
  /** Absolute http(s) URL the logo or company name links to. */
  readonly appUrl: string
  /** Address for the support link in the footer. */
  readonly supportEmail: string
  /** Absolute http(s) URL of the logo image. Without it the header shows `companyName`. */
  readonly logoUrl?: string | undefined
  /** Logo width in pixels. Default `120`. */
  readonly logoWidth?: number | undefined
  /** Logo height in pixels. Reserves space while images are blocked. */
  readonly logoHeight?: number | undefined
  /** Extra line at the top of the footer, such as why the recipient gets this email. */
  readonly footerText?: string | undefined
  /** Theme tokens. */
  readonly theme?: ThemeInput | undefined
}
