'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface GoalFields {
  title: string
  amount: string
  description: string
}

interface GoalsState {
  sixMonth: GoalFields
  oneYear: GoalFields
  fiveYear: GoalFields
}

type Status = 'checking' | 'ready' | 'loading' | 'success' | 'error'

const empty = (): GoalFields => ({ title: '', amount: '', description: '' })

// ─── Goal Card ───────────────────────────────────────────────────────────────

interface GoalCardProps {
  badge: string
  heading: string
  fields: GoalFields
  onChange: (patch: Partial<GoalFields>) => void
}

function GoalCard({ badge, heading, fields, onChange }: GoalCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="mb-4 flex items-center gap-3">
        <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-emerald-400">
          {badge}
        </span>
        <h2 className="text-sm font-semibold text-white">{heading}</h2>
      </div>

      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Goal title</span>
          <input
            type="text"
            placeholder="e.g. Emergency fund"
            value={fields.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">Target amount</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-emerald-400">
              $
            </span>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0"
              value={fields.amount}
              onChange={(e) => onChange({ amount: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-7 pr-3 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-400">
            Description{' '}
            <span className="text-slate-600">(optional)</span>
          </span>
          <input
            type="text"
            placeholder="What is this goal for?"
            value={fields.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>
      </div>
    </div>
  )
}

// ─── Success Screen ───────────────────────────────────────────────────────────

function SuccessScreen() {
  const router = useRouter()
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F172A] px-6">
      <div className="flex max-w-xs flex-col items-center gap-5 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 ring-1 ring-emerald-500/30">
          <svg
            className="h-9 w-9 text-emerald-400"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Goals saved!</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Your goals are set. Let&apos;s build toward them.
          </p>
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98]"
        >
          Go to Dashboard →
        </button>
        <div className="h-px w-20 bg-emerald-500/30" />
        <p className="text-xs text-slate-600">Compass · Your AI financial co-pilot</p>
      </div>
    </main>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter()
  const [goals, setGoals] = useState<GoalsState>({
    sixMonth: empty(),
    oneYear: empty(),
    fiveYear: empty(),
  })
  const [status, setStatus] = useState<Status>('checking')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push('/signup')
        return
      }
      // If user already has goals, go straight to dashboard
      const { data } = await supabase
        .from('goals')
        .select('id')
        .eq('user_session_id', user.id)
        .single()
      if (data) {
        router.push('/dashboard')
      } else {
        setStatus('ready')
      }
    })
  }, [router])

  function patch(key: keyof GoalsState) {
    return (fields: Partial<GoalFields>) =>
      setGoals((prev) => ({ ...prev, [key]: { ...prev[key], ...fields } }))
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/signup'); return }

    const { sixMonth, oneYear, fiveYear } = goals

    const { error } = await supabase.from('goals').insert({
      user_session_id: user.id,
      goal_6month_title: sixMonth.title,
      goal_6month_amount: parseFloat(sixMonth.amount) || 0,
      goal_6month_description: sixMonth.description || null,
      goal_1year_title: oneYear.title,
      goal_1year_amount: parseFloat(oneYear.amount) || 0,
      goal_1year_description: oneYear.description || null,
      goal_5year_title: fiveYear.title,
      goal_5year_amount: parseFloat(fiveYear.amount) || 0,
      goal_5year_description: fiveYear.description || null,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
    } else {
      setStatus('success')
    }
  }

  if (status === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <svg className="h-8 w-8 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </main>
    )
  }

  if (status === 'success') return <SuccessScreen />

  return (
    <main className="min-h-screen bg-[#0F172A] px-4 py-14">
      <div className="mx-auto max-w-md">

        {/* ── Header ── */}
        <header className="mb-10 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <svg
              className="h-7 w-7 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9.5" />
              <polygon
                points="12,3 14,12 12,10 10,12"
                className="fill-emerald-400 stroke-none"
              />
              <polygon
                points="12,21 10,12 12,14 14,12"
                className="fill-slate-600 stroke-none"
              />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-white">Compass</span>
          </div>
          <p className="text-sm text-slate-400">Your AI financial co-pilot</p>

          <div className="mx-auto mt-7 h-px w-14 bg-emerald-500/40" />

          <h1 className="mt-7 text-xl font-semibold text-white">Set your financial goals</h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Define where you want to be — Compass will help you get there.
          </p>
        </header>

        {/* ── Cards ── */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <GoalCard
            badge="6 mo"
            heading="6-Month Goal"
            fields={goals.sixMonth}
            onChange={patch('sixMonth')}
          />
          <GoalCard
            badge="1 yr"
            heading="1-Year Goal"
            fields={goals.oneYear}
            onChange={patch('oneYear')}
          />
          <GoalCard
            badge="5 yr"
            heading="5-Year Goal"
            fields={goals.fiveYear}
            onChange={patch('fiveYear')}
          />

          {/* ── Error ── */}
          {status === 'error' && (
            <div
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
            >
              {errorMsg || 'Something went wrong. Please try again.'}
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-1 w-full rounded-xl bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12" cy="12" r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                  />
                </svg>
                Saving goals…
              </span>
            ) : (
              'Set My Goals'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-slate-700">
          You can update your goals anytime from the dashboard.
        </p>
      </div>
    </main>
  )
}
