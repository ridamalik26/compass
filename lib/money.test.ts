import { describe, expect, it } from 'vitest'
import { centsToDollars, dollarsToCents, formatCents, parseMoneyToCents, splitThreeWays, MAX_CENTS } from './money'

describe('parseMoneyToCents', () => {
  it('parses plain amounts into cents', () => {
    expect(parseMoneyToCents('250')).toEqual({ ok: true, cents: 25000 })
    expect(parseMoneyToCents('250.5')).toEqual({ ok: true, cents: 25050 })
    expect(parseMoneyToCents('0.01')).toEqual({ ok: true, cents: 1 })
  })

  it('accepts a leading $ and thousands commas', () => {
    expect(parseMoneyToCents('$1,250.50')).toEqual({ ok: true, cents: 125050 })
  })

  it('rejects empty input', () => {
    expect(parseMoneyToCents('')).toEqual({ ok: false, message: expect.any(String) })
    expect(parseMoneyToCents('   ')).toEqual({ ok: false, message: expect.any(String) })
  })

  it('rejects non-numeric input', () => {
    expect(parseMoneyToCents('abc')).toMatchObject({ ok: false })
    expect(parseMoneyToCents('12abc')).toMatchObject({ ok: false })
    expect(parseMoneyToCents('NaN')).toMatchObject({ ok: false })
    expect(parseMoneyToCents('Infinity')).toMatchObject({ ok: false })
  })

  it('rejects negative amounts', () => {
    expect(parseMoneyToCents('-5')).toMatchObject({ ok: false })
    expect(parseMoneyToCents('-0.01')).toMatchObject({ ok: false })
  })

  it('rejects exponential notation instead of parsing it as a huge number', () => {
    expect(parseMoneyToCents('1e999')).toMatchObject({ ok: false })
    expect(parseMoneyToCents('1e3')).toMatchObject({ ok: false })
  })

  it('rejects amounts too large to store', () => {
    expect(parseMoneyToCents('99999999999999')).toMatchObject({ ok: false })
  })

  it('accepts the largest storable amount', () => {
    const dollars = MAX_CENTS / 100
    expect(parseMoneyToCents(String(dollars))).toEqual({ ok: true, cents: MAX_CENTS })
  })
})

describe('centsToDollars / dollarsToCents', () => {
  it('round-trips exactly for values with at most 2 decimal places', () => {
    expect(centsToDollars(123456)).toBe(1234.56)
    expect(dollarsToCents(1234.56)).toBe(123456)
  })

  it('treats a non-finite dollars value as 0', () => {
    expect(dollarsToCents(NaN)).toBe(0)
  })
})

describe('formatCents', () => {
  it('omits cents for whole dollars and keeps them otherwise', () => {
    expect(formatCents(650000)).toBe('$6,500')
    expect(formatCents(650050)).toBe('$6,500.50')
  })
})

describe('splitThreeWays', () => {
  it('always sums exactly to the total', () => {
    for (const total of [0, 1, 2, 3, 100, 101, 102, 9999, 1, 7, 1_000_000_007]) {
      const parts = splitThreeWays(total)
      expect(parts[0] + parts[1] + parts[2]).toBe(total)
    }
  })

  it('splits evenly when the total divides by 3', () => {
    expect(splitThreeWays(300)).toEqual([100, 100, 100])
  })

  it('gives any leftover cents to the first part', () => {
    expect(splitThreeWays(100)).toEqual([34, 33, 33])
    expect(splitThreeWays(101)).toEqual([35, 33, 33])
    expect(splitThreeWays(1)).toEqual([1, 0, 0])
  })

  it('treats a non-finite total as 0', () => {
    expect(splitThreeWays(NaN)).toEqual([0, 0, 0])
  })
})
