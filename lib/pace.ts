// Single source of truth for goal pace. Pure functions, safe to use on the client and the server.

export type GoalType = '6month' | '1year' | '5year'
export type StatusLabel = 'Ahead' | 'On Track' | 'Behind'

export const GOAL_DAYS: Record<GoalType, number> = { '6month': 180, '1year': 365, '5year': 1825 }

const MS_PER_DAY = 86_400_000
const STATUS_BUFFER = 0.05

function isValidDaysTotal(daysTotal: number) {
  return Number.isFinite(daysTotal) && daysTotal > 0
}

/** Whole days since createdAt. Never negative; an invalid date counts as 0. */
export function daysSince(createdAt: string, now: number = Date.now()): number {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return 0
  return Math.max(0, Math.floor((now - created) / MS_PER_DAY))
}

/** Days remaining, between 0 and daysTotal. A zero or invalid daysTotal gives 0. */
export function daysLeft(daysTotal: number, createdAt: string, now: number = Date.now()): number {
  if (!isValidDaysTotal(daysTotal)) return 0
  return Math.max(0, daysTotal - daysSince(createdAt, now))
}

/** Amount that should be saved by now on a straight-line pace. */
export function expectedAmount(
  targetAmount: number,
  daysTotal: number,
  createdAt: string,
  now: number = Date.now(),
): number {
  if (!isValidDaysTotal(daysTotal) || !(targetAmount > 0)) return 0
  const timeElapsed = Math.min(daysSince(createdAt, now) / daysTotal, 1)
  return timeElapsed * targetAmount
}

/** Ahead / On Track / Behind, with a 5% of target buffer. Unmeasurable goals are On Track. */
export function getStatus(
  targetAmount: number,
  currentAmount: number,
  daysTotal: number,
  createdAt: string,
  now: number = Date.now(),
): StatusLabel {
  if (!isValidDaysTotal(daysTotal) || !(targetAmount > 0) || !Number.isFinite(currentAmount)) return 'On Track'
  const expected = expectedAmount(targetAmount, daysTotal, createdAt, now)
  const buffer = targetAmount * STATUS_BUFFER
  if (currentAmount >= expected + buffer) return 'Ahead'
  if (currentAmount <= expected - buffer) return 'Behind'
  return 'On Track'
}

export interface PaceDetails {
  status: StatusLabel
  daysSince: number
  daysLeft: number
  expected: number
  shortfall: number
  surplus: number
  percent: number
}

export function paceDetails(
  targetAmount: number,
  currentAmount: number,
  daysTotal: number,
  createdAt: string,
  now: number = Date.now(),
): PaceDetails {
  const current = Number.isFinite(currentAmount) ? currentAmount : 0
  const expected = expectedAmount(targetAmount, daysTotal, createdAt, now)
  return {
    status: getStatus(targetAmount, current, daysTotal, createdAt, now),
    daysSince: daysSince(createdAt, now),
    daysLeft: daysLeft(daysTotal, createdAt, now),
    expected,
    shortfall: Math.max(0, expected - current),
    surplus: Math.max(0, current - expected),
    percent: targetAmount > 0 ? Math.round((current / targetAmount) * 100) : 0,
  }
}
