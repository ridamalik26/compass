// Pure money helpers shared by the dashboard, the goals page and the Plaid sync route.
// All arithmetic happens in integer cents so repeated float addition cannot drift the totals.
// Dollar amounts still cross the wire and the database as numeric(12,2), so these helpers convert
// at the edges: parse user input into cents, then convert cents back to a dollar number or string.

export type MoneyParseResult = { ok: true; cents: number } | { ok: false; message: string }

/** Largest value a numeric(12,2) column can hold, in cents. */
export const MAX_CENTS = 999_999_999_999

const PLAIN_DECIMAL = /^(\d+(\.\d*)?|\.\d+)$/

/**
 * Parses user-entered text into non-negative integer cents. Accepts a leading "$" and thousands
 * commas. Rejects empty input, negative amounts, non-numeric text and exponential notation
 * (so "1e999" is rejected rather than parsed as Infinity), and amounts too large to store.
 */
export function parseMoneyToCents(raw: string): MoneyParseResult {
  const text = raw.trim().replace(/^\$/, '').replace(/,/g, '')

  if (!text) return { ok: false, message: 'Enter an amount.' }
  if (text.startsWith('-')) return { ok: false, message: 'The amount cannot be negative.' }
  if (!PLAIN_DECIMAL.test(text)) {
    return { ok: false, message: 'Enter a valid number, for example 250 or 250.50.' }
  }

  const cents = Math.round(Number(text) * 100)
  if (!Number.isFinite(cents)) {
    return { ok: false, message: 'Enter a valid number, for example 250 or 250.50.' }
  }
  if (cents > MAX_CENTS) return { ok: false, message: 'That amount is too large.' }

  return { ok: true, cents }
}

/** Dollar amounts to store in or compare against a numeric(12,2) column. */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100
}

/** Dollars to cents, rounded to the nearest cent. For values already known to be valid (e.g. from the database). */
export function dollarsToCents(dollars: number): number {
  return Math.round((Number.isFinite(dollars) ? dollars : 0) * 100)
}

/** $6,500 for whole dollars, $6,500.50 otherwise. */
export function formatCents(cents: number): string {
  const dollars = centsToDollars(cents)
  const whole = Number.isInteger(dollars)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(dollars)
}

/**
 * Splits an integer amount of cents into three parts that sum exactly to the total. Any leftover
 * cents (there are at most two, since three equal shares leave a remainder of 0, 1 or 2) go to the
 * first part, so the three parts can differ by at most a cent or two and never lose a cent to rounding.
 */
export function splitThreeWays(totalCents: number): [number, number, number] {
  const total = Math.trunc(Number.isFinite(totalCents) ? totalCents : 0)
  const base = Math.trunc(total / 3)
  const remainder = total - base * 3
  return [base + remainder, base, base]
}
