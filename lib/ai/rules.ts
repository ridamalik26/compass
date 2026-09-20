// Rule-based advice. Every dollar figure comes from lib/pace.ts, so it matches the dashboard.
import { paceDetails } from '@/lib/pace'
import type { GoalSnapshot } from './types'

const MAX_GOALS = 3
const MAX_TITLE_LENGTH = 60

function money(n: number): string {
  return `$${Math.round(Number.isFinite(n) ? Math.max(0, n) : 0).toLocaleString('en-US')}`
}

function cleanTitle(title: string): string {
  const t = title.replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE_LENGTH)
  return t || 'Your goal'
}

function tipFor(goal: GoalSnapshot, now: number): { text: string; behind: boolean } {
  const p = paceDetails(goal.targetAmount, goal.currentAmount, goal.daysTotal, goal.createdAt, now)
  const title = cleanTitle(goal.title)
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount)

  if (remaining === 0) {
    return { text: `"${title}" is fully funded. Great work. Keep that money safe and consider setting a new target.`, behind: false }
  }

  if (p.status === 'Behind') {
    if (p.daysLeft === 0) {
      return {
        text: `"${title}" is behind pace by ${money(p.shortfall)} and its time window has ended. Consider resetting the target or extending the goal.`,
        behind: true,
      }
    }
    const weeks = Math.max(p.daysLeft / 7, 1)
    return {
      text: `"${title}" is behind pace by ${money(p.shortfall)}. Setting aside about ${money(remaining / weeks)} per week would still reach ${money(goal.targetAmount)} by the deadline.`,
      behind: true,
    }
  }

  if (p.status === 'Ahead') {
    return {
      text: `"${title}" is ahead of pace by ${money(p.surplus)}, with ${p.daysLeft} days left. Keep your current routine going.`,
      behind: false,
    }
  }

  return {
    text: `"${title}" is on track: ${p.percent}% saved with ${p.daysLeft} days left. Keep your regular contributions going.`,
    behind: false,
  }
}

export function buildRulesAdvice(goals: GoalSnapshot[], now: number = Date.now()): string {
  const tips = goals.slice(0, MAX_GOALS).map((g) => tipFor(g, now))
  if (tips.length === 0) return ''

  const closing = tips.some((t) => t.behind)
    ? 'Start with the goal that is furthest behind, then work through the others.'
    : 'Update your balances regularly so these tips stay accurate.'

  return [...tips.map((t) => t.text), closing].join('\n')
}
