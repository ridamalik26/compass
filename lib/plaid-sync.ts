// Pure helpers for app/api/plaid/sync/route.ts, split out so the idempotency logic is testable
// without mocking Plaid or Supabase.
import { dollarsToCents } from './money'

/** The subset of a Plaid transaction this module needs. */
export interface PlaidTransactionLike {
  transaction_id: string
  /** Dollars. Plaid convention: positive = debit (money out), negative = credit (money in). */
  amount: number
}

/**
 * Transactions not already recorded for this user. A transaction already stored in the
 * `transactions` table has already been counted toward goal progress, so re-running a sync over
 * the same window must exclude it or its amount would be added again.
 */
export function filterNewTransactions<T extends PlaidTransactionLike>(
  transactions: T[],
  alreadyCountedIds: ReadonlySet<string> | string[],
): T[] {
  const already = alreadyCountedIds instanceof Set ? alreadyCountedIds : new Set(alreadyCountedIds)
  return transactions.filter((tx) => !already.has(tx.transaction_id))
}

/**
 * Net savings in cents across the given transactions: a debit (positive Plaid amount) reduces
 * savings, a credit (negative Plaid amount) increases it. Summed per-transaction in cents so
 * repeated float addition cannot drift the total.
 */
export function computeNetSavingsCents(transactions: PlaidTransactionLike[]): number {
  return transactions.reduce((sum, tx) => {
    const amountCents = dollarsToCents(tx.amount)
    return sum + (amountCents > 0 ? -amountCents : Math.abs(amountCents))
  }, 0)
}
