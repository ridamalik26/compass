'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Toast from '@/components/Toast'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pct(current: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
}

function AnimatedBar({ percent, color }: { percent: number; color: string }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(percent), 150)
    return () => clearTimeout(t)
  }, [percent])
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
      <div className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${w}%` }} />
    </div>
  )
}

// ─── Inline Goal Card ─────────────────────────────────────────────────────────

interface GoalCardProps {
  type: GoalType
  label: string
  badge: string
  accentColor: string
  barColor: string
  badgeClass: string
  title: string
  amount: number
  currentAmount: number
  userId: string
  onSaved: () => void
  onToast: (msg: string, type: 'success' | 'error') => void
}

function GoalCard({
  type, label, badge, barColor, badgeClass,
  title, amount, currentAmount, onSaved, onToast,
}: GoalCardProps) {
  const [editing, setEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const [draftAmount, setDraftAmount] = useState(amount > 0 ? String(amount) : '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isEmpty = !title && amount === 0
  const percent = pct(currentAmount, amount)

  // Build explicit update objects — no computed keys so TypeScript is happy
  function savePayload(newTitle: string, newAmount: number) {
    if (type === '6month') return { goal_6month_title: newTitle, goal_6month_amount: newAmount }
    if (type === '1year')  return { goal_1year_title:  newTitle, goal_1year_amount:  newAmount }
    return                        { goal_5year_title:  newTitle, goal_5year_amount:  newAmount }
  }

  function clearPayload() {
    if (type === '6month') return { goal_6month_title: '', goal_6month_amount: 0 }
    if (type === '1year')  return { goal_1year_title:  '', goal_1year_amount:  0 }
    return                        { goal_5year_title:  '', goal_5year_amount:  0 }
  }

  function startEdit() {
    setDraftTitle(title)
    setDraftAmount(amount > 0 ? String(amount) : '')
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setDraftTitle(title)
    setDraftAmount(amount > 0 ? String(amount) : '')
  }

  async function handleSave() {
    const newTitle = draftTitle.trim()
    const newAmount = parseFloat(draftAmount) || 0
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { onToast('Not authenticated', 'error'); setSaving(false); return }
    const { error } = await supabase
      .from('goals')
      .update(savePayload(newTitle || label, newAmount))
      .eq('user_session_id', user.id)
    setSaving(false)
    if (error) {
      onToast(error.message, 'error')
    } else {
      setEditing(false)
      onToast('Goal updated', 'success')
      onSaved()
    }
  }

  async function handleDelete() {
    setDeleting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { onToast('Not authenticated', 'error'); setDeleting(false); return }
    const { error } = await supabase
      .from('goals')
      .update(clearPayload())
      .eq('user_session_id', user.id)
    setDeleting(false)
    if (error) {
      onToast(error.message, 'error')
    } else {
      setEditing(false)
      onToast('Goal cleared', 'success')
      onSaved()
    }
  }

  return (
    <div className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition-all ${editing ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-[#E2E8F0]'}`}>
      {/* Accent top bar */}
      <div className={`h-1 w-full ${barColor}`} />

      <div className="p-5 space-y-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${badgeClass}`}>
              {badge}
            </span>
            {!editing && (
              <h3 className={`font-heading mt-1.5 text-base font-bold truncate ${isEmpty ? 'text-[#CBD5E1] italic' : 'text-[#0F172A]'}`}>
                {isEmpty ? 'Not set' : title}
              </h3>
            )}
          </div>
          {!editing && (
            <button
              onClick={startEdit}
              className={`shrink-0 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition min-h-[36px] ${
                isEmpty
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  : 'border-[#E2E8F0] text-[#64748B] hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              {isEmpty ? (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  Edit
                </>
              )}
            </button>
          )}
        </div>

        {/* View mode */}
        {!editing && (
          <>
            {isEmpty ? (
              <p className="text-sm text-[#94A3B8]">No target set for this time horizon.</p>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-heading text-2xl font-bold text-[#0F172A]">
                    {fmtUSD(amount)}
                  </span>
                  <span className="text-xs text-[#94A3B8]">{label}</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-[#94A3B8]">
                    <span>{fmtUSD(currentAmount)} saved</span>
                    <span className="font-semibold text-emerald-600">{percent}%</span>
                  </div>
                  <AnimatedBar percent={percent} color={barColor} />
                </div>
              </>
            )}
          </>
        )}

        {/* Edit mode */}
        {editing && (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748B]">Goal title</label>
              <input
                type="text"
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder={label}
                className="w-full rounded-xl border border-[#E2E8F0] px-3 py-2.5 text-sm text-[#0F172A] placeholder-[#CBD5E1] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748B]">Target amount</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-500">$</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={draftAmount}
                  onChange={(e) => setDraftAmount(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-[#E2E8F0] py-2.5 pl-7 pr-3 text-sm text-[#0F172A] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10 transition [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>
            </div>

            {/* Action row */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || deleting}
                className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 min-h-[44px]"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving || deleting}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] disabled:opacity-60 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={saving || deleting}
                title="Clear this goal"
                className="rounded-xl border border-red-200 px-3 py-2.5 text-sm text-red-500 transition hover:bg-red-50 disabled:opacity-60 min-h-[44px]"
              >
                {deleting ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Goals Page ───────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goals | null>(null)
  const [progress, setProgress] = useState<Progress>({ '6month': 0, '1year': 0, '5year': 0 })
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [resetting, setResetting] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const [goalsRes, progressRes] = await Promise.all([
      supabase.from('goals').select('*').eq('user_session_id', user.id).single(),
      supabase.from('goal_progress').select('*').eq('user_session_id', user.id),
    ])

    if (goalsRes.data) setGoals(goalsRes.data as Goals)

    const p: Progress = { '6month': 0, '1year': 0, '5year': 0 }
    for (const row of progressRes.data ?? []) {
      p[row.goal_type as GoalType] = Number(row.current_amount)
    }
    setProgress(p)
    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  async function handleReset() {
    if (!userId) return
    setResetting(true)
    await Promise.all([
      supabase.from('goal_progress_history').delete().eq('user_session_id', userId),
      supabase.from('goal_progress').delete().eq('user_session_id', userId),
    ])
    await supabase.from('goals').delete().eq('user_session_id', userId)
    router.push('/dashboard')
  }

  // ── Loading ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <main className="flex h-[calc(100vh-56px)] items-center justify-center">
          <svg className="h-8 w-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </main>
      </div>
    )
  }

  if (!goals) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <Navbar />
        <main className="mx-auto max-w-lg px-4 py-16 pb-24 text-center">
          <p className="text-sm text-[#64748B]">No goals found.</p>
          <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-emerald-600 hover:text-emerald-700">
            ← Back to dashboard
          </Link>
        </main>
      </div>
    )
  }

  const CARDS: { type: GoalType; label: string; badge: string; accentColor: string; barColor: string; badgeClass: string; title: string; amount: number }[] = [
    {
      type: '6month',
      label: '6-Month Goal',
      badge: '6 mo',
      accentColor: 'emerald',
      barColor: 'bg-emerald-500',
      badgeClass: 'bg-emerald-50 text-emerald-700',
      title: goals.goal_6month_title,
      amount: goals.goal_6month_amount,
    },
    {
      type: '1year',
      label: '1-Year Goal',
      badge: '1 yr',
      accentColor: 'indigo',
      barColor: 'bg-indigo-500',
      badgeClass: 'bg-indigo-50 text-indigo-700',
      title: goals.goal_1year_title,
      amount: goals.goal_1year_amount,
    },
    {
      type: '5year',
      label: '5-Year Goal',
      badge: '5 yr',
      accentColor: 'amber',
      barColor: 'bg-amber-400',
      badgeClass: 'bg-amber-50 text-amber-700',
      title: goals.goal_5year_title,
      amount: goals.goal_5year_amount,
    },
  ]

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="mx-auto max-w-xl px-4 py-8 pb-24 md:pb-8 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-[#0F172A]">Edit Goals</h1>
            <p className="mt-0.5 text-sm text-[#64748B]">Update your financial targets.</p>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-medium text-[#64748B] shadow-sm transition hover:bg-[#F8FAFC]"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>

        {/* Goal cards — only show active goals */}
        {CARDS.filter(c => c.amount > 0 && c.title.trim().length > 0).map((card) => (
          <GoalCard
            key={card.type}
            {...card}
            currentAmount={progress[card.type]}
            userId={userId!}
            onSaved={loadData}
            onToast={(msg, type) => setToast({ message: msg, type })}
          />
        ))}

        {/* All goals cleared — prompt to start fresh */}
        {CARDS.every(c => !(c.amount > 0 && c.title.trim().length > 0)) && (
          <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm text-center space-y-3">
            <p className="text-sm text-[#64748B]">All goals have been cleared.</p>
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Set up new goals on dashboard
            </Link>
          </div>
        )}

        {/* Reset All Goals */}
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm space-y-3">
          <div>
            <h3 className="font-heading text-sm font-bold text-[#0F172A]">Reset All Goals</h3>
            <p className="mt-1 text-xs text-[#94A3B8]">Permanently deletes all goals and progress history. You will be taken back to setup.</p>
          </div>
          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 min-h-[44px]"
            >
              Reset everything
            </button>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <p className="w-full text-xs text-red-600 font-medium">Are you sure? This cannot be undone.</p>
              <button
                onClick={handleReset}
                disabled={resetting}
                className="rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-60 min-h-[44px]"
              >
                {resetting ? 'Deleting…' : 'Yes, delete everything'}
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                disabled={resetting}
                className="rounded-xl border border-[#E2E8F0] px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          )}
        </div>

      </main>
    </div>
  )
}
