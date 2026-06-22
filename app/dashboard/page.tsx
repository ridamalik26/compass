'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goals {
  id: string
  user_session_id: string
  goal_6month_title: string
  goal_6month_amount: number
  goal_6month_description: string | null
  goal_1year_title: string
  goal_1year_amount: number
  goal_1year_description: string | null
  goal_5year_title: string
  goal_5year_amount: number
  goal_5year_description: string | null
  created_at: string
}

interface Progress {
  '6month': number
  '1year': number
  '5year': number
}

type GoalType = '6month' | '1year' | '5year'
type StatusLabel = 'Ahead' | 'On Track' | 'Behind'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_TOTAL: Record<GoalType, number> = { '6month': 180, '1year': 365, '5year': 1825 }

function getStatus(
  targetAmount: number,
  currentAmount: number,
  daysTotal: number,
  createdAt: string,
): StatusLabel {
  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000),
  )
  const timeElapsed = Math.min(daysSince / daysTotal, 1)
  const expectedAmount = timeElapsed * targetAmount
  const buffer = targetAmount * 0.05

  if (currentAmount >= expectedAmount + buffer) return 'Ahead'
  if (currentAmount <= expectedAmount - buffer) return 'Behind'
  return 'On Track'
}

function progressPercent(current: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
}

function daysLeft(daysTotal: number, createdAt: string) {
  const daysSince = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
  return Math.max(0, daysTotal - daysSince)
}

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusLabel }) {
  const styles: Record<StatusLabel, string> = {
    Ahead: 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30',
    'On Track': 'bg-yellow-500/20 text-yellow-400 ring-yellow-500/30',
    Behind: 'bg-red-500/20 text-red-400 ring-red-500/30',
  }
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ${styles[status]}`}
    >
      {status}
    </span>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  badge: string
  title: string
  description: string | null
  targetAmount: number
  currentAmount: number
  daysTotal: number
  createdAt: string
}

function GoalCard({
  badge,
  title,
  description,
  targetAmount,
  currentAmount,
  daysTotal,
  createdAt,
}: GoalCardProps) {
  const status = getStatus(targetAmount, currentAmount, daysTotal, createdAt)
  const pct = progressPercent(currentAmount, targetAmount)
  const remaining = Math.max(0, targetAmount - currentAmount)
  const left = daysLeft(daysTotal, createdAt)

  const barColor: Record<StatusLabel, string> = {
    Ahead: 'bg-emerald-500',
    'On Track': 'bg-yellow-400',
    Behind: 'bg-red-500',
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-400">
            {badge}
          </span>
          <h3 className="mt-2 text-sm font-semibold text-white">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        <StatusBadge status={status} />
      </div>

      <div>
        <div className="mb-1.5 flex justify-between text-xs text-slate-400">
          <span>{fmtUSD(currentAmount)} saved</span>
          <span>
            {pct}% of {fmtUSD(targetAmount)}
          </span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor[status]}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{fmtUSD(remaining)} remaining</span>
        <span>{left} days left</span>
      </div>
    </div>
  )
}

// ─── Update Modal ─────────────────────────────────────────────────────────────

interface UpdateModalProps {
  goals: Goals
  progress: Progress
  onSave: (amounts: Progress) => Promise<void>
  onClose: () => void
}

function UpdateModal({ goals, progress, onSave, onClose }: UpdateModalProps) {
  const [amounts, setAmounts] = useState<Progress>({ ...progress })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    await onSave(amounts)
    setSaving(false)
    onClose()
  }

  const fields: { key: GoalType; label: string; target: number }[] = [
    { key: '6month', label: goals.goal_6month_title, target: goals.goal_6month_amount },
    { key: '1year', label: goals.goal_1year_title, target: goals.goal_1year_amount },
    { key: '5year', label: goals.goal_5year_title, target: goals.goal_5year_amount },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1E293B] p-6 space-y-5">
        <h2 className="text-base font-semibold text-white">Update Balances</h2>

        {fields.map(({ key, label, target }) => (
          <label key={key} className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">
              {label} <span className="text-slate-600">(target {fmtUSD(target)})</span>
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-400">
                $
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={amounts[key]}
                onChange={(e) =>
                  setAmounts((prev) => ({ ...prev, [key]: parseFloat(e.target.value) || 0 }))
                }
                className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-7 pr-3 text-sm text-white outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </label>
        ))}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-400 transition hover:border-white/20 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [userName, setUserName] = useState('')
  const [goals, setGoals] = useState<Goals | null>(null)
  const [progress, setProgress] = useState<Progress>({ '6month': 0, '1year': 0, '5year': 0 })
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [recommendation, setRecommendation] = useState('')
  const [recError, setRecError] = useState('')
  const [recLoading, setRecLoading] = useState(false)
  const [recFetched, setRecFetched] = useState(false)

  const loadData = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      router.push('/login')
      return
    }

    setUser(authUser)

    const [goalsRes, progressRes, profileRes] = await Promise.all([
      supabase.from('goals').select('*').eq('user_session_id', authUser.id).single(),
      supabase.from('goal_progress').select('*').eq('user_session_id', authUser.id),
      supabase.from('users').select('full_name, email').eq('id', authUser.id).single(),
    ])

    const displayName =
      (profileRes.data?.full_name as string | null) ??
      (authUser.user_metadata?.name as string | undefined) ??
      authUser.email ??
      'You'
    setUserName(displayName)

    if (goalsRes.error || !goalsRes.data) {
      // Authenticated but no goals yet — go to onboarding
      router.push('/')
      return
    }

    setGoals(goalsRes.data as Goals)

    if (progressRes.data) {
      const p: Progress = { '6month': 0, '1year': 0, '5year': 0 }
      for (const row of progressRes.data) {
        p[row.goal_type as GoalType] = Number(row.current_amount)
      }
      setProgress(p)
    }

    setLoading(false)
  }, [router])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function saveProgress(amounts: Progress) {
    if (!user) return
    const types: GoalType[] = ['6month', '1year', '5year']
    await Promise.all(
      types.map((t) =>
        supabase.from('goal_progress').upsert(
          {
            user_session_id: user.id,
            goal_type: t,
            current_amount: amounts[t],
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_session_id,goal_type' },
        ),
      ),
    )
    setProgress(amounts)
  }

  async function fetchRecommendations() {
    if (!goals) return
    setRecLoading(true)
    setRecError('')
    setRecommendation('')

    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: [
            {
              type: '6month',
              title: goals.goal_6month_title,
              targetAmount: goals.goal_6month_amount,
              currentAmount: progress['6month'],
              daysTotal: 180,
              createdAt: goals.created_at,
              status: getStatus(goals.goal_6month_amount, progress['6month'], 180, goals.created_at),
            },
            {
              type: '1year',
              title: goals.goal_1year_title,
              targetAmount: goals.goal_1year_amount,
              currentAmount: progress['1year'],
              daysTotal: 365,
              createdAt: goals.created_at,
              status: getStatus(
                goals.goal_1year_amount,
                progress['1year'],
                365,
                goals.created_at,
              ),
            },
            {
              type: '5year',
              title: goals.goal_5year_title,
              targetAmount: goals.goal_5year_amount,
              currentAmount: progress['5year'],
              daysTotal: 1825,
              createdAt: goals.created_at,
              status: getStatus(
                goals.goal_5year_amount,
                progress['5year'],
                1825,
                goals.created_at,
              ),
            },
          ],
        }),
      })

      const data = await res.json()

      if (!res.ok || data.error) {
        setRecError(data.error ?? `Server error ${res.status}`)
      } else {
        setRecommendation(data.recommendation ?? '')
      }
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Network error — could not reach server.')
    }

    setRecLoading(false)
    setRecFetched(true)
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <svg className="h-8 w-8 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </main>
    )
  }

  if (!goals) return null

  const totalTarget =
    goals.goal_6month_amount + goals.goal_1year_amount + goals.goal_5year_amount
  const totalSaved = progress['6month'] + progress['1year'] + progress['5year']
  const totalPct = progressPercent(totalSaved, totalTarget)

  return (
    <main className="min-h-screen bg-[#0F172A] px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">

        {/* ── Header ── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <svg
              className="h-6 w-6 shrink-0 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <circle cx="12" cy="12" r="9.5" />
              <polygon points="12,3 14,12 12,10 10,12" className="fill-emerald-400 stroke-none" />
              <polygon points="12,21 10,12 12,14 14,12" className="fill-slate-600 stroke-none" />
            </svg>
            <div className="min-w-0">
              <span className="block text-sm font-bold tracking-tight text-white">Compass</span>
              <span className="block truncate text-[11px] text-slate-500">{userName}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => setShowModal(true)}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
            >
              Update Balance
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-400 transition hover:border-red-500/30 hover:text-red-400"
              title="Sign out"
            >
              Sign Out
            </button>
          </div>
        </header>

        {/* ── Summary bar ── */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-medium text-slate-400">Total Progress</p>
          <div className="mt-1 flex items-end justify-between">
            <span className="text-2xl font-bold text-white">{fmtUSD(totalSaved)}</span>
            <span className="text-sm text-slate-500">of {fmtUSD(totalTarget)}</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${totalPct}%` }}
            />
          </div>
          <p className="mt-2 text-right text-xs text-slate-500">{totalPct}% of all goals</p>
        </div>

        {/* ── Goal Cards ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your Goals
          </h2>
          <GoalCard
            badge="6 mo"
            title={goals.goal_6month_title}
            description={goals.goal_6month_description}
            targetAmount={goals.goal_6month_amount}
            currentAmount={progress['6month']}
            daysTotal={DAYS_TOTAL['6month']}
            createdAt={goals.created_at}
          />
          <GoalCard
            badge="1 yr"
            title={goals.goal_1year_title}
            description={goals.goal_1year_description}
            targetAmount={goals.goal_1year_amount}
            currentAmount={progress['1year']}
            daysTotal={DAYS_TOTAL['1year']}
            createdAt={goals.created_at}
          />
          <GoalCard
            badge="5 yr"
            title={goals.goal_5year_title}
            description={goals.goal_5year_description}
            targetAmount={goals.goal_5year_amount}
            currentAmount={progress['5year']}
            daysTotal={DAYS_TOTAL['5year']}
            createdAt={goals.created_at}
          />
        </section>

        {/* ── AI Recommendations ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              AI Recommendations
            </h2>
            {recFetched && !recLoading && (
              <button
                onClick={fetchRecommendations}
                className="text-xs text-emerald-400 hover:text-emerald-300"
              >
                Refresh
              </button>
            )}
          </div>

          {!recFetched ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="mb-4 text-sm text-slate-400">
                Get personalized advice on how to stay on track with your goals.
              </p>
              <button
                onClick={fetchRecommendations}
                disabled={recLoading}
                className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/20 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/30 disabled:opacity-60"
              >
                {recLoading ? 'Analyzing goals…' : 'Get AI Recommendations'}
              </button>
            </div>
          ) : recLoading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
              <svg
                className="h-5 w-5 shrink-0 animate-spin text-emerald-400"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                />
              </svg>
              <span className="text-sm text-slate-400">Analyzing your goals…</span>
            </div>
          ) : recError ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="text-xs font-semibold text-red-400 mb-1">Recommendation error</p>
              <p className="text-sm text-slate-400">{recError}</p>
              <button
                onClick={fetchRecommendations}
                className="mt-3 text-xs text-emerald-400 hover:text-emerald-300"
              >
                Try again
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="mb-2 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                <span className="text-xs font-semibold text-emerald-400">Claude AI</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {recommendation}
              </p>
            </div>
          )}
        </section>

        {/* ── Connect Bank ── */}
        <section>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
                <svg
                  className="h-5 w-5 text-emerald-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white">Connect Your Bank</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Auto-sync transactions and track savings automatically.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/connect-bank')}
              className="mt-4 w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400 transition hover:bg-emerald-500/20"
            >
              Connect Bank Account →
            </button>
          </div>
        </section>

      </div>

      {/* ── Modal ── */}
      {showModal && (
        <UpdateModal
          goals={goals}
          progress={progress}
          onSave={saveProgress}
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  )
}
