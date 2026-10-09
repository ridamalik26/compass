import { describe, expect, it } from 'vitest'
import { computeNetSavingsCents, filterNewTransactions, type PlaidTransactionLike } from './plaid-sync'

/**
 * Simulates one sync run: filters out transactions already recorded, computes the net savings
 * cents to add for the new ones, and returns the updated "already recorded" set — mirroring what
 * app/api/plaid/sync/route.ts does against the real `transactions` table.
 */
function runSync(transactions: PlaidTransactionLike[], recordedIds: Set<string>) {
  const newTransactions = filterNewTransactions(transactions, recordedIds)
  const addedCents = computeNetSavingsCents(newTransactions)
  const nextRecordedIds = new Set(recordedIds)
  for (const tx of transactions) nextRecordedIds.add(tx.transaction_id)
  return { addedCents, recordedIds: nextRecordedIds }
}

describe('Plaid sync idempotency', () => {
  const transactions: PlaidTransactionLike[] = [
    { transaction_id: 'tx-credit', amount: -100 }, // money in: +$100
    { transaction_id: 'tx-debit', amount: 30 }, // money out: -$30
  ]

  it('feeding the same transactions twice only adds the net savings once', () => {
    let recordedIds = new Set<string>()

    const first = runSync(transactions, recordedIds)
    expect(first.addedCents).toBe(7000) // $100 in - $30 out
    recordedIds = first.recordedIds

    const second = runSync(transactions, recordedIds)
    expect(second.addedCents).toBe(0)

    const totalAdded = first.addedCents + second.addedCents
    expect(totalAdded).toBe(7000)
  })

  it('a third sync with one new transaction only adds that transaction’s amount', () => {
    let recordedIds = new Set<string>()
    recordedIds = runSync(transactions, recordedIds).recordedIds
    recordedIds = runSync(transactions, recordedIds).recordedIds // second, redundant run

    const withOneMore = [...transactions, { transaction_id: 'tx-new-credit', amount: -25 }]
    const third = runSync(withOneMore, recordedIds)
    expect(third.addedCents).toBe(2500) // only the new $25 credit
  })

  it('an empty transaction list adds nothing', () => {
    expect(computeNetSavingsCents(filterNewTransactions([], new Set()))).toBe(0)
  })
})
