// Pure helpers for the dashboard balance editor. Amounts are handled in whole cents to avoid float drift.

export type BalanceMode = 'add' | 'withdraw' | 'set'

/** Largest value that fits a numeric(12,2) column. */
export const MAX_BALANCE = 9_999_999_999.99

export type BalanceResult = { ok: true; newBalance: number } | { ok: false; message: string }

/** $6,500 for whole dollars, $6,500.50 otherwise. */
export function formatMoney(n: number): string {
  const whole = Number.isInteger(n)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(n)
}

export function evaluateBalanceChange(mode: BalanceMode, raw: string, current: number): BalanceResult {
  const text = raw.trim().replace(/^\$/, '').replace(/,/g, '')
  if (!text) return { ok: false, message: 'Enter an amount.' }
  if (text.startsWith('-')) return { ok: false, message: 'The amount cannot be negative.' }
  if (!/^(\d+(\.\d*)?|\.\d+)$/.test(text)) {
    return { ok: false, message: 'Enter a valid number, for example 250 or 250.50.' }
  }

  const amountCents = Math.round(Number(text) * 100)
  if (!Number.isFinite(amountCents)) return { ok: false, message: 'Enter a valid number, for example 250 or 250.50.' }
  if (amountCents <= 0) return { ok: false, message: 'Enter an amount greater than zero.' }

  const currentCents = Math.round((Number.isFinite(current) ? current : 0) * 100)
  const newCents =
    mode === 'add' ? currentCents + amountCents : mode === 'withdraw' ? currentCents - amountCents : amountCents

  if (newCents < 0) {
    return { ok: false, message: `You cannot withdraw more than your current balance of ${formatMoney(currentCents / 100)}.` }
  }
  if (newCents > Math.round(MAX_BALANCE * 100)) return { ok: false, message: 'That amount is too large.' }

  return { ok: true, newBalance: newCents / 100 }
}
