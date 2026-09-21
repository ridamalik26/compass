import type { GoalType } from '@/lib/pace'

/** One active goal with its current balance, as read from the database. */
export interface GoalSnapshot {
  type: GoalType
  title: string
  targetAmount: number
  currentAmount: number
  daysTotal: number
  createdAt: string
}

export type AdviceSource = 'ai' | 'rules' | 'cache'
export type AdviceOrigin = 'ai' | 'rules'
