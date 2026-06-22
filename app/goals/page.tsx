'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Toast from '@/components/Toast'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

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

interface ChartPoint {
  date: string
  '6month': number
  '1year': number
  '5year': number
}

interface GoalSlot {
  type: GoalType
  label: string
  badge: string
  title: string
  amount: number
  description: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

function pct(current: number, target: number) {
  return target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
}

const CHART_LABEL: Record<GoalType, string> = {
  '6month': '6-Month',
  '1year': '1-Year',
  '5year': '5-Year',
}

// ─── Animated bar ─────────────────────────────────────────────────────────────

function AnimatedBar({ percent }: { percent: number }) {
  const [w, setW] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setW(percent), 150)
    return () => clearTimeout(t)
  }, [percent])
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-[#E2E8F0]">
      <div className="h-full rounded-full bg-emerald-500 transition-all duration-1000 ease-out" style={{ width: `${w}%` }} />
    </div>
  )
}

// ─── Goals Page ───────────────────────────────────────────────────────────────

export default function GoalsPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<Goals | null>(null)
  const [progress, setProgress] = useState<Progress>({ '6month': 0, '1year': 0, '5year': 0 })
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Edit form state
  const [selected, setSelected] = useState<GoalType | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const [draftAmount, setDraftAmount] = useState('')
  const [draftDesc, setDraftDesc] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    setUserId(user.id)

    const [goalsRes, progressRes, historyRes] = await Promise.all([
      supabase.from('goals').select('*').eq('user_session_id', user.id).single(),
      supabase.from('goal_progress').select('*').eq('user_session_id', user.id),
      supabase
        .from('goal_progress_history')
        .select('goal_type, current_amount, recorded_at')
        .eq('user_session_id', user.id)
        .order('recorded_at', { ascending: true })
        .limit(60),
    ])

    if (goalsRes.data) setGoals(goalsRes.data as Goals)

    const p: Progress = { '6month': 0, '1year': 0, '5year': 0 }
    for (const row of progressRes.data ?? []) {
      p[row.goal_type as GoalType] = Number(row.current_amount)
    }
    setProgress(p)

    if (historyRes.data?.length) {
      const byDate: Record<string, ChartPoint> = {}
      for (const row of historyRes.data) {
        const date = new Date(row.recorded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        if (!byDate[date]) byDate[date] = { date, '6month': 0, '1year': 0, '5year': 0 }
        byDate[date][row.goal_type as GoalType] = Number(row.current_amount)
      }
      setChartData(Object.values(byDate))
    }

    setLoading(false)
  }, [router])

  useEffect(() => { loadData() }, [loadData])

  function openEdit(slot: GoalSlot) {
    setSelected(slot.type)
    setDraftTitle(slot.title)
    setDraftAmount(String(slot.amount))
    setDraftDesc(slot.description ?? '')
  }

  function clearEdit() {
    setSelected(null)
    setDraftTitle('')
    setDraftAmount('')
    setDraftDesc('')
  }

  async function handleSave() {
    if (!userId || !selected) return
    setSaving(true)
    const prefix = selected === '6month' ? 'goal_6month' : selected === '1year' ? 'goal_1year' : 'goal_5year'
    await supabase
      .from('goals')
      .update({
        [`${prefix}_title`]: draftTitle.trim() || 'Untitled',
        [`${prefix}_amount`]: parseFloat(draftAmount) || 0,
        [`${prefix}_description`]: draftDesc.trim() || null,
      })
      .eq('user_session_id', userId)
    setSaving(false)
    clearEdit()
    setToast({ message: 'Goal saved', type: 'success' })
    await loadData()
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
          <p className="text-sm text-[#64748B]">No goals found. Complete onboarding first.</p>
        </main>
      </div>
    )
  }

  const slots: GoalSlot[] = [
    { type: '6month', label: '6-Month Goal', badge: '6 mo', title: goals.goal_6month_title, amount: goals.goal_6month_amount, description: goals.goal_6month_description },
    { type: '1year',  label: '1-Year Goal',  badge: '1 yr', title: goals.goal_1year_title,  amount: goals.goal_1year_amount,  description: goals.goal_1year_description },
    { type: '5year',  label: '5-Year Goal',  badge: '5 yr', title: goals.goal_5year_title,  amount: goals.goal_5year_amount,  description: goals.goal_5year_description },
  ]

  const selectedSlot = slots.find(s => s.type === selected)

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="mx-auto max-w-5xl px-4 py-8 pb-24 md:pb-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-heading text-xl font-bold tracking-tight text-[#0F172A]">Your Goals</h1>
          <p className="mt-1 text-sm text-[#64748B]">Track and edit your financial targets.</p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

          {/* ── LEFT: Edit form ── */}
          <div className="lg:col-span-4">
            <div className="sticky top-20 rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
              {!selected ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[#F8FAFC]">
                    <svg className="h-5 w-5 text-[#CBD5E1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[#94A3B8]">Select a goal to edit</p>
                  <p className="mt-1 text-xs text-[#CBD5E1]">Click the edit icon on any goal</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-emerald-600">
                        {selectedSlot?.badge}
                      </span>
                      <p className="mt-1 text-sm font-semibold text-[#0F172A]">{selectedSlot?.label}</p>
                    </div>
                    <button onClick={clearEdit} className="rounded-lg p-1.5 text-[#94A3B8] transition hover:bg-[#F8FAFC]">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Floating label: Title */}
                  <div className="relative">
                    <input
                      id="goal-title"
                      type="text"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder=" "
                      className="fl-input"
                    />
                    <label htmlFor="goal-title" className="fl-label">Goal title</label>
                  </div>

                  {/* Floating label: Amount */}
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-500 peer-focus:-translate-y-full">$</span>
                    <input
                      id="goal-amount"
                      type="number"
                      min="0"
                      step="any"
                      value={draftAmount}
                      onChange={(e) => setDraftAmount(e.target.value)}
                      placeholder=" "
                      className="fl-input pl-7 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <label htmlFor="goal-amount" className="fl-label pl-7">Target amount</label>
                  </div>

                  {/* Floating label: Description */}
                  <div className="relative">
                    <input
                      id="goal-desc"
                      type="text"
                      value={draftDesc}
                      onChange={(e) => setDraftDesc(e.target.value)}
                      placeholder=" "
                      className="fl-input"
                    />
                    <label htmlFor="goal-desc" className="fl-label">
                      Notes <span className="font-normal opacity-60">(optional)</span>
                    </label>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={clearEdit}
                      className="flex-1 rounded-xl border border-[#E2E8F0] py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-[#F8FAFC] min-h-[44px]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:opacity-60 min-h-[44px]"
                    >
                      {saving ? 'Saving' : 'Save Goal'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Goal rows + chart ── */}
          <div className="lg:col-span-8 space-y-4">

            {/* Goal rows */}
            {slots.map((slot) => {
              const current = progress[slot.type]
              const percent = pct(current, slot.amount)
              const isEditing = selected === slot.type

              return (
                <div
                  key={slot.type}
                  className={`card-hover rounded-2xl border bg-white p-5 shadow-sm transition-colors ${
                    isEditing ? 'border-emerald-300 ring-2 ring-emerald-500/10' : 'border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-[#64748B]">
                          {slot.badge}
                        </span>
                        {percent >= 100 && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                            <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Done
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-sm font-bold text-[#0F172A]">{slot.title}</h3>
                      {slot.description && (
                        <p className="mt-0.5 text-xs text-[#94A3B8]">{slot.description}</p>
                      )}

                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-xs text-[#94A3B8]">
                          <span>{fmtUSD(current)} saved</span>
                          <span className="font-semibold text-emerald-600">{percent}%</span>
                        </div>
                        <AnimatedBar percent={percent} />
                        <p className="text-xs text-[#CBD5E1]">of {fmtUSD(slot.amount)} target</p>
                      </div>
                    </div>

                    <button
                      onClick={() => isEditing ? clearEdit() : openEdit(slot)}
                      className={`shrink-0 rounded-xl p-2.5 transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        isEditing
                          ? 'bg-emerald-50 text-emerald-600'
                          : 'text-[#CBD5E1] hover:bg-[#F8FAFC] hover:text-emerald-600'
                      }`}
                      aria-label="Edit goal"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )
            })}

            {/* Progress chart */}
            {chartData.length >= 2 ? (
              <div className="card-hover rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
                <h2 className="font-heading mb-4 text-sm font-bold text-[#0F172A]">Progress Over Time</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      formatter={(value: any, name: any) => [fmtUSD(Number(value)), CHART_LABEL[String(name) as GoalType] ?? String(name)]}
                    />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} formatter={(name) => CHART_LABEL[name as GoalType] ?? name} />
                    <Line type="monotone" dataKey="6month" stroke="#10B981" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="1year"  stroke="#6366F1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="5year"  stroke="#F59E0B" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm text-center">
                <p className="text-sm font-medium text-[#64748B]">Progress chart</p>
                <p className="mt-1 text-xs text-[#94A3B8]">Update your balance at least twice to see a chart here.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
