// Pure helpers for the dashboard balance editor. Parsing and arithmetic happen in integer cents
// (via lib/money.ts) to avoid float drift; this module only adds the add/withdraw/set semantics.
import { centsToDollars, dollarsToCents, formatCents, parseMoneyToCents, MAX_CENTS } from './money'

export type BalanceMode = 'add' | 'withdraw' | 'set'

/** Largest value that fits a numeric(12,2) column. */
export const MAX_BALANCE = centsToDollars(MAX_CENTS)

export type BalanceResult = { ok: true; newBalance: number } | { ok: false; message: string }

/** $6,500 for whole dollars, $6,500.50 otherwise. */
export function formatMoney(n: number): string {
  return formatCents(dollarsToCents(n))
}

export function evaluateBalanceChange(mode: BalanceMode, raw: string, current: number): BalanceResult {
  const parsed = parseMoneyToCents(raw)
  if (!parsed.ok) return parsed
  if (parsed.cents <= 0) return { ok: false, message: 'Enter an amount greater than zero.' }

  const currentCents = dollarsToCents(current)
  const newCents =
    mode === 'add' ? currentCents + parsed.cents : mode === 'withdraw' ? currentCents - parsed.cents : parsed.cents

  if (newCents < 0) {
    return { ok: false, message: `You cannot withdraw more than your current balance of ${formatCents(currentCents)}.` }
  }
  if (newCents > MAX_CENTS) return { ok: false, message: 'That amount is too large.' }

  return { ok: true, newBalance: centsToDollars(newCents) }
}
