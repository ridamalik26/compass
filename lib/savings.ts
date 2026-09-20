// Pure helpers for the dashboard totals. Only goals passed in `activeTypes` are counted, so a goal
// that was cleared (its balance row can linger) never distorts either figure.
import type { GoalType } from './pace'

export type BalanceMap = Record<GoalType, number>

/** One row of goal_progress_history: the balance of a goal right after a save. */
export interface HistorySnapshot {
  goal_type: string
  current_amount: number | string
  recorded_at: string
}

const MS_PER_DAY = 86_400_000

function toCents(n: number): number {
  return Math.round((Number.isFinite(n) ? n : 0) * 100)
}

/** Total saved: the sum of the current balances of the active goals. */
export function totalSaved(balances: BalanceMap, activeTypes: GoalType[]): number {
  return activeTypes.reduce((sum, t) => sum + toCents(balances[t]), 0) / 100
}

/** Balance of one goal at a moment: its last snapshot at or before `at`, or 0 if it has none. */
export function balanceAt(type: GoalType, history: HistorySnapshot[], at: number): number {
  let bestTime = -Infinity
  let best = 0
  for (const row of history) {
    if (row.goal_type !== type) continue
    const time = new Date(row.recorded_at).getTime()
    if (!Number.isFinite(time) || time > at) continue
    const amount = Number(row.current_amount)
    if (!Number.isFinite(amount)) continue
    if (time >= bestTime) {
      bestTime = time
      best = amount
    }
  }
  return best
}

/**
 * This week: total balance now minus total balance `windowDays` ago. Negative after a withdrawal.
 * `history` needs, for each active goal, at least its last snapshot at or before the cutoff.
 */
export function weeklyChange(
  balances: BalanceMap,
  activeTypes: GoalType[],
  history: HistorySnapshot[],
  now: number = Date.now(),
  windowDays = 7,
): number {
  const cutoff = now - windowDays * MS_PER_DAY
  const before = activeTypes.reduce((sum, t) => sum + toCents(balanceAt(t, history, cutoff)), 0)
  const current = activeTypes.reduce((sum, t) => sum + toCents(balances[t]), 0)
  return (current - before) / 100
}
