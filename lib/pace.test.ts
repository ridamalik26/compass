import { describe, expect, it } from 'vitest'
import { daysLeft, daysSince, getStatus } from './pace'

const NOW = Date.parse('2026-09-20T12:00:00Z')
const DAY = 86_400_000

describe('daysSince', () => {
  it('is clamped at 0 and never negative', () => {
    expect(daysSince('2026-09-20T12:00:00Z', NOW)).toBe(0)
    expect(daysSince(new Date(NOW + DAY).toISOString(), NOW)).toBe(0)
  })

  it('counts whole days in the past', () => {
    expect(daysSince(new Date(NOW - 10 * DAY).toISOString(), NOW)).toBe(10)
  })

  it('treats an invalid date as 0 days', () => {
    expect(daysSince('not-a-date', NOW)).toBe(0)
  })
})

describe('daysLeft', () => {
  it('is 0 when daysTotal is 0', () => {
    expect(daysLeft(0, new Date(NOW - 10 * DAY).toISOString(), NOW)).toBe(0)
  })

  it('is 0 when daysTotal is negative or not finite', () => {
    expect(daysLeft(-5, new Date(NOW).toISOString(), NOW)).toBe(0)
    expect(daysLeft(NaN, new Date(NOW).toISOString(), NOW)).toBe(0)
  })

  it('never exceeds daysTotal when createdAt is in the future', () => {
    const future = new Date(NOW + 30 * DAY).toISOString()
    expect(daysLeft(180, future, NOW)).toBe(180)
    expect(daysLeft(180, future, NOW)).toBeLessThanOrEqual(180)
  })

  it('is clamped to [0, daysTotal] for a goal past its deadline', () => {
    const longAgo = new Date(NOW - 1000 * DAY).toISOString()
    expect(daysLeft(180, longAgo, NOW)).toBe(0)
  })

  it('counts down linearly within the window', () => {
    const createdAt = new Date(NOW - 50 * DAY).toISOString()
    expect(daysLeft(180, createdAt, NOW)).toBe(130)
  })
})

describe('getStatus', () => {
  it('is On Track when daysTotal is 0 or the target is 0', () => {
    expect(getStatus(1000, 0, 0, new Date(NOW).toISOString(), NOW)).toBe('On Track')
    expect(getStatus(0, 0, 180, new Date(NOW).toISOString(), NOW)).toBe('On Track')
  })

  it('is On Track for an invalid createdAt rather than throwing', () => {
    expect(getStatus(1000, 0, 180, 'not-a-date', NOW)).toBe('On Track')
  })
})
