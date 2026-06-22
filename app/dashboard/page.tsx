'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Toast from '@/components/Toast'
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

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getStatus(targetAmount: number, currentAmount: number, daysTotal: number, createdAt: string): StatusLabel {
  const daysSince = Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000))
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
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

// ─── Animated progress bar ────────────────────────────────────────────────────

function AnimatedBar({ pct, barClass = 'bg-emerald-500' }: { pct: number; barClass?: string }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(pct), 150)
    return () => clearTimeout(t)
  }, [pct])
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${barClass}`} style={{ width: `${w}%` }} />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: StatusLabel }) {
  const cfg: Record<StatusLabel, { dot: string; pill: string }> = {
    Ahead:      { dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700' },
    'On Track': { dot: 'bg-amber-400',   pill: 'bg-amber-50 text-amber-700' },
    Behind:     { dot: 'bg-red-500',     pill: 'bg-red-50 text-red-700' },
  }
  const { dot, pill } = cfg[status]
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${pill}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ className }: { className: string }) {
  return <div className={`skeleton ${className}`} />
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8 space-y-6">
      <div className="space-y-2">
        <Skel className="h-8 w-52 rounded-xl" />
        <Skel className="h-4 w-36 rounded" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm space-y-2">
            <Skel className="h-3 w-14 rounded" />
            <Skel className="h-7 w-20 rounded" />
          </div>
        ))}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">
          <div className="flex justify-between">
            <Skel className="h-4 w-32 rounded" />
            <Skel className="h-5 w-16 rounded-full" />
          </div>
          <Skel className="h-10 w-24 rounded-lg" />
          <Skel className="h-2 w-full rounded-full" />
          <div className="flex justify-between">
            <Skel className="h-3 w-24 rounded" />
            <Skel className="h-3 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Goal Creation Form ───────────────────────────────────────────────────────

interface GoalField {
  title: string
  amount: string
}

function GoalCreationForm({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [sixMonth, setSixMonth] = useState<GoalField>({ title: '', amount: '' })
  const [oneYear, setOneYear] = useState<GoalField>({ title: '', amount: '' })
  const [fiveYear, setFiveYear] = useState<GoalField>({ title: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('goals').insert({
      user_session_id: userId,
      goal_6month_title: sixMonth.title.trim() || 'Short-term savings',
      goal_6month_amount: parseFloat(sixMonth.amount) || 0,
      goal_1year_title: oneYear.title.trim() || 'Annual savings',
      goal_1year_amount: parseFloat(oneYear.amount) || 0,
      goal_5year_title: fiveYear.title.trim() || 'Long-term savings',
      goal_5year_amount: parseFloat(fiveYear.amount) || 0,
    })

    if (err) {
      setError(err.message)
      setSaving(false)
      return
    }

    onCreated()
  }

  const goalCards: { label: string; badge: string; color: string; state: GoalField; set: (v: GoalField) => void }[] = [
    { label: '6-Month Goal', badge: '6 mo', color: 'emerald', state: sixMonth, set: setSixMonth },
    { label: '1-Year Goal', badge: '1 yr', color: 'indigo', state: oneYear, set: setOneYear },
    { label: '5-Year Goal', badge: '5 yr', color: 'amber', state: fiveYear, set: setFiveYear },
  ]

  const colorMap: Record<string, { border: string; ring: string; badge: string; icon: string }> = {
    emerald: { border: 'border-t-emerald-500', ring: 'focus:border-emerald-500 focus:ring-emerald-500/10', badge: 'bg-emerald-50 text-emerald-700', icon: 'text-emerald-500' },
    indigo:  { border: 'border-t-indigo-500',  ring: 'focus:border-indigo-500 focus:ring-indigo-500/10',   badge: 'bg-indigo-50 text-indigo-700',   icon: 'text-indigo-500' },
    amber:   { border: 'border-t-amber-400',   ring: 'focus:border-amber-400 focus:ring-amber-400/10',     badge: 'bg-amber-50 text-amber-700',     icon: 'text-amber-500' },
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 pb-24 md:pb-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50">
          <svg className="h-7 w-7 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9.5" />
            <polygon points="12,3.5 13.5,12 12,10.5 10.5,12" className="fill-emerald-500 stroke-none" />
            <polygon points="12,20.5 10.5,12 12,13.5 13.5,12" className="fill-emerald-200 stroke-none" />
          </svg>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F172A]">Set your financial targets</h1>
        <p className="mt-2 text-sm text-[#64748B]">Define goals across three time horizons and start tracking your progress.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {goalCards.map(({ label, badge, color, state, set }) => {
            const c = colorMap[color]
            return (
              <div key={label} className={`rounded-2xl border border-[#E2E8F0] border-t-4 ${c.border} bg-white p-5 shadow-sm space-y-4`}>
                <div>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${c.badge}`}>
                    {badge}
                  </span>
                  <h3 className="font-heading mt-2 text-sm font-bold text-[#0F172A]">{label}</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#64748B]">Goal title</label>
                    <input
                      type="text"
                      placeholder="e.g. Emergency fund"
                      value={state.title}
                      onChange={(e) => set({ ...state, title: e.target.value })}
                      className={`w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#0F172A] placeholder-[#CBD5E1] outline-none focus:ring-2 ${c.ring} transition`}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-[#64748B]">Target amount</label>
                    <div className="relative">
                      <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold ${c.icon}`}>$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="5,000"
                        value={state.amount}
                        onChange={(e) => set({ ...state, amount: e.target.value })}
                        className={`w-full rounded-xl border border-[#E2E8F0] py-2.5 pl-7 pr-3 text-sm text-[#0F172A] outline-none focus:ring-2 ${c.ring} transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {error && (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 min-h-[48px]"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Saving your goals...
            </span>
          ) : (
            'Start tracking'
          )}
        </button>
      </form>
    </div>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────

interface GoalCardProps {
  type: GoalType
  badge: string
  title: string
  description: string | null
  targetAmount: number
  currentAmount: number
  daysTotal: number
  createdAt: string
  onSave: (type: GoalType, amount: number) => Promise<void>
}

function GoalCard({ type, badge, title, description, targetAmount, currentAmount, daysTotal, createdAt, onSave }: GoalCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateValue, setUpdateValue] = useState('')
  const [saving, setSaving] = useState(false)

  const status = getStatus(targetAmount, currentAmount, daysTotal, createdAt)
  const pct = progressPercent(currentAmount, targetAmount)
  const left = daysLeft(daysTotal, createdAt)
  const completed = pct >= 100

  const barClass: Record<StatusLabel, string> = {
    Ahead: 'bg-emerald-500',
    'On Track': 'bg-amber-400',
    Behind: 'bg-red-500',
  }

  async function handleSave() {
    setSaving(true)
    await onSave(type, parseFloat(updateValue) || 0)
    setSaving(false)
    setIsUpdating(false)
    setUpdateValue('')
  }

  return (
    <div className="card-hover rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
            {badge}
          </span>
          <h3 className="font-heading mt-1.5 text-sm font-bold text-[#0F172A]">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-[#94A3B8]">{description}</p>}
        </div>
        {completed ? (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Complete
          </span>
        ) : (
          <StatusBadge status={status} />
        )}
      </div>

      {/* Big percent + days left */}
      <div className="flex items-end justify-between">
        <span className="font-heading text-5xl font-bold leading-none text-emerald-500">{pct}%</span>
        {!completed && (
          <span className="text-xs text-[#94A3B8]">{left > 0 ? `${left} days left` : 'Period ended'}</span>
        )}
      </div>

      {/* Bar */}
      <AnimatedBar pct={pct} barClass={completed ? 'bg-emerald-500' : barClass[status]} />

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#94A3B8]">{fmtUSD(currentAmount)} of {fmtUSD(targetAmount)}</span>
        {!isUpdating && (
          <button
            onClick={() => { setIsUpdating(true); setUpdateValue(String(currentAmount)) }}
            className="text-xs font-medium text-[#64748B] transition hover:text-emerald-600"
          >
            Update Balance
          </button>
        )}
      </div>

      {/* Inline update form */}
      {isUpdating && (
        <div className="flex items-center gap-2 border-t border-[#F1F5F9] pt-4">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-500">$</span>
            <input
              type="number"
              min="0"
              step="any"
              autoFocus
              value={updateValue}
              onChange={(e) => setUpdateValue(e.target.value)}
              className="w-full rounded-xl border border-[#E2E8F0] py-2.5 pl-7 pr-3 text-sm text-[#0F172A] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60 min-h-[44px]"
          >
            {saving ? 'Saving' : 'Save'}
          </button>
          <button
            onClick={() => { setIsUpdating(false); setUpdateValue('') }}
            className="rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] min-h-[44px]"
          >
            Cancel
          </button>
        </div>
      )}
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
  const [recommendation, setRecommendation] = useState('')
  const [recError, setRecError] = useState('')
  const [recLoading, setRecLoading] = useState(false)
  const [recFetched, setRecFetched] = useState(false)
  const [weeklySaved, setWeeklySaved] = useState<number | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const fetchRecommendations = useCallback(async (goalsData: Goals, progressData: Progress) => {
    setRecLoading(true)
    setRecError('')
    setRecommendation('')
    try {
      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goals: [
            { type: '6month', title: goalsData.goal_6month_title, targetAmount: goalsData.goal_6month_amount, currentAmount: progressData['6month'], daysTotal: 180, createdAt: goalsData.created_at, status: getStatus(goalsData.goal_6month_amount, progressData['6month'], 180, goalsData.created_at) },
            { type: '1year',  title: goalsData.goal_1year_title,  targetAmount: goalsData.goal_1year_amount,  currentAmount: progressData['1year'],  daysTotal: 365, createdAt: goalsData.created_at, status: getStatus(goalsData.goal_1year_amount, progressData['1year'], 365, goalsData.created_at) },
            { type: '5year',  title: goalsData.goal_5year_title,  targetAmount: goalsData.goal_5year_amount,  currentAmount: progressData['5year'],  daysTotal: 1825, createdAt: goalsData.created_at, status: getStatus(goalsData.goal_5year_amount, progressData['5year'], 1825, goalsData.created_at) },
          ],
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) setRecError(data.error ?? `Error ${res.status}`)
      else setRecommendation(data.recommendation ?? '')
    } catch (err) {
      setRecError(err instanceof Error ? err.message : 'Network error')
    }
    setRecLoading(false)
    setRecFetched(true)
  }, [])

  const loadData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    setUser(authUser)

    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString()

    const [goalsRes, progressRes, profileRes, historyRes] = await Promise.all([
      supabase.from('goals').select('*').eq('user_session_id', authUser.id).single(),
      supabase.from('goal_progress').select('*').eq('user_session_id', authUser.id),
      supabase.from('users').select('full_name').eq('id', authUser.id).single(),
      supabase
        .from('goal_progress_history')
        .select('goal_type, current_amount, recorded_at')
        .eq('user_session_id', authUser.id)
        .gte('recorded_at', sevenDaysAgo)
        .order('recorded_at', { ascending: true }),
    ])

    const rawName =
      (profileRes.data?.full_name as string | null) ??
      (authUser.user_metadata?.name as string | undefined) ??
      authUser.email ?? 'there'
    setUserName(rawName.split(' ')[0])

    const p: Progress = { '6month': 0, '1year': 0, '5year': 0 }
    for (const row of progressRes.data ?? []) {
      p[row.goal_type as GoalType] = Number(row.current_amount)
    }
    setProgress(p)

    if (historyRes.data && historyRes.data.length > 0) {
      const byType: Record<string, number[]> = {}
      for (const row of historyRes.data) {
        if (!byType[row.goal_type]) byType[row.goal_type] = []
        byType[row.goal_type].push(Number(row.current_amount))
      }
      let weekly = 0
      for (const amounts of Object.values(byType)) {
        if (amounts.length >= 2) weekly += amounts[amounts.length - 1] - amounts[0]
      }
      setWeeklySaved(weekly)
    } else {
      setWeeklySaved(null)
    }

    if (goalsRes.data) {
      const g = goalsRes.data as Goals
      setGoals(g)
      setLoading(false)
      fetchRecommendations(g, p)
    } else {
      setLoading(false)
    }
  }, [router, fetchRecommendations])

  useEffect(() => { loadData() }, [loadData])

  async function saveProgress(type: GoalType, amount: number) {
    if (!user) return
    await Promise.all([
      supabase.from('goal_progress').upsert(
        { user_session_id: user.id, goal_type: type, current_amount: amount },
        { onConflict: 'user_session_id,goal_type' },
      ),
      supabase.from('goal_progress_history').insert({
        user_session_id: user.id, goal_type: type, current_amount: amount,
      }),
    ])
    setToast({ message: 'Balance updated', type: 'success' })
    await loadData()
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <DashboardSkeleton />
      </div>
    )
  }

  // ── Empty state: inline goal creation form ────────────────────────────────────

  if (!goals && user) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <main>
          <GoalCreationForm userId={user.id} onCreated={loadData} />
        </main>
      </div>
    )
  }

  if (!goals) return null

  const totalTarget = goals.goal_6month_amount + goals.goal_1year_amount + goals.goal_5year_amount
  const totalSaved = progress['6month'] + progress['1year'] + progress['5year']
  const totalPct = progressPercent(totalSaved, totalTarget)
  const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="mx-auto max-w-2xl px-4 py-8 pb-24 md:pb-8 space-y-6">

        {/* ── Greeting ── */}
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F172A]">
            {getGreeting()}, {userName}
          </h1>
          <p className="mt-0.5 text-sm text-[#64748B]">{todayStr}</p>
        </div>

        {/* ── 3-metric summary bar ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Saved',  value: fmtUSD(totalSaved),  border: 'border-l-emerald-500' },
            { label: 'Total Target', value: fmtUSD(totalTarget), border: 'border-l-indigo-500' },
            { label: 'Progress',     value: `${totalPct}%`,      border: 'border-l-amber-400' },
          ].map(({ label, value, border }) => (
            <div key={label} className={`card-hover rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm border-l-4 ${border}`}>
              <p className="text-[11px] font-medium text-[#94A3B8] uppercase tracking-wide">{label}</p>
              <p className="font-heading mt-1.5 text-xl font-bold text-[#0F172A] leading-none">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Weekly snapshot ── */}
        {weeklySaved !== null && (
          <div className="flex items-center justify-between rounded-2xl border border-[#E2E8F0] bg-white px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${weeklySaved >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {weeklySaved >= 0 ? '↑' : '↓'}
              </span>
              <span className="text-sm text-[#64748B]">This week</span>
            </div>
            <span className={`font-heading text-base font-bold ${weeklySaved >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {weeklySaved >= 0 ? '+' : ''}{fmtUSD(weeklySaved)}
            </span>
          </div>
        )}

        {/* ── Goal cards ── */}
        <section className="space-y-3">
          <h2 className="font-heading text-sm font-bold text-[#0F172A]">Your Goals</h2>
          <GoalCard type="6month" badge="6 mo" title={goals.goal_6month_title} description={goals.goal_6month_description} targetAmount={goals.goal_6month_amount} currentAmount={progress['6month']} daysTotal={DAYS_TOTAL['6month']} createdAt={goals.created_at} onSave={saveProgress} />
          <GoalCard type="1year"  badge="1 yr"  title={goals.goal_1year_title}  description={goals.goal_1year_description}  targetAmount={goals.goal_1year_amount}  currentAmount={progress['1year']}  daysTotal={DAYS_TOTAL['1year']}  createdAt={goals.created_at} onSave={saveProgress} />
          <GoalCard type="5year"  badge="5 yr"  title={goals.goal_5year_title}  description={goals.goal_5year_description}  targetAmount={goals.goal_5year_amount}  currentAmount={progress['5year']}  daysTotal={DAYS_TOTAL['5year']}  createdAt={goals.created_at} onSave={saveProgress} />
        </section>

        {/* ── AI Coach ── */}
        <section>
          <div className="rounded-2xl border border-[#E2E8F0] bg-white shadow-sm overflow-hidden">
            <div className="border-l-4 border-indigo-500 p-5 space-y-4">

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50">
                    <svg className="h-4 w-4 text-indigo-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <span className="font-heading text-sm font-bold text-[#0F172A]">Your AI coach</span>
                </div>
                {recFetched && !recLoading && (
                  <button onClick={() => fetchRecommendations(goals, progress)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Refresh
                  </button>
                )}
              </div>

              {recLoading ? (
                <div className="flex items-center gap-3 py-2">
                  <svg className="h-5 w-5 shrink-0 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  <span className="text-sm text-[#64748B]">Analyzing your goals…</span>
                </div>
              ) : recError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4">
                  <p className="text-xs font-semibold text-red-700">Could not load recommendations</p>
                  <p className="mt-1 text-sm text-red-600">{recError}</p>
                  <button onClick={() => fetchRecommendations(goals, progress)} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                    Try again
                  </button>
                </div>
              ) : recommendation ? (
                <>
                  <p className="text-sm leading-relaxed text-[#374151] whitespace-pre-wrap">{recommendation}</p>
                  <div className="pt-1 border-t border-[#F1F5F9]">
                    <p className="text-xs text-[#94A3B8]">
                      Want to create a new goal?{' '}
                      <Link href="/goals" className="font-medium text-indigo-600 hover:text-indigo-700 underline-offset-2 hover:underline">
                        Edit your goals
                      </Link>
                    </p>
                  </div>
                </>
              ) : null}

            </div>
          </div>
        </section>

        {/* ── Quick actions ── */}
        <section>
          <h2 className="font-heading mb-3 text-sm font-bold text-[#0F172A]">Quick actions</h2>
          <div className="grid grid-cols-3 gap-3">

            <Link href="/connect-bank" className="card-hover flex flex-col items-center gap-2.5 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm text-center transition group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 group-hover:bg-emerald-100 transition">
                <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10.5l9-6.5 9 6.5v10H3v-10z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 21V13h6v8" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#374151]">Connect Bank</span>
            </Link>

            <Link href="/goals" className="card-hover flex flex-col items-center gap-2.5 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm text-center transition group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 group-hover:bg-indigo-100 transition">
                <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
                  <circle cx="12" cy="12" r="5" strokeWidth={1.75} />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#374151]">Edit Goals</span>
            </Link>

            <Link href="/settings" className="card-hover flex flex-col items-center gap-2.5 rounded-2xl border border-[#E2E8F0] bg-white p-4 shadow-sm text-center transition group">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 group-hover:bg-slate-200 transition">
                <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <span className="text-xs font-semibold text-[#374151]">Settings</span>
            </Link>

          </div>
        </section>

      </main>
    </div>
  )
}
