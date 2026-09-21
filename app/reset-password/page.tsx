'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AuthShell from '@/components/AuthShell'
import AuthField from '@/components/AuthField'

type Phase = 'waiting' | 'ready' | 'saving' | 'error' | 'invalid'

const MIN_PASSWORD_LENGTH = 8
const RECOVERY_WAIT_MS = 4000

export default function ResetPasswordPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('waiting')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    // The recovery link signs the user in and Supabase emits PASSWORD_RECOVERY. The event can fire
    // before this listener attaches, in which case INITIAL_SESSION carries the recovery session.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'INITIAL_SESSION' && session)) {
        setPhase((p) => (p === 'waiting' || p === 'invalid' ? 'ready' : p))
      }
    })
    const timer = setTimeout(() => {
      setPhase((p) => (p === 'waiting' ? 'invalid' : p))
    }, RECOVERY_WAIT_MS)
    return () => {
      data.subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [])

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setPhase('error')
      setErrorMsg(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setPhase('error')
      setErrorMsg('Passwords do not match.')
      return
    }

    setPhase('saving')
    setErrorMsg('')

    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setPhase('error')
      setErrorMsg(error.message)
      return
    }

    // End the recovery session so the login page does not bounce straight to the dashboard.
    await supabase.auth.signOut()
    router.replace('/login?reset=1')
  }

  const footer = (
    <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">Back to sign in</Link>
  )

  if (phase === 'waiting') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <svg className="h-8 w-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </main>
    )
  }

  if (phase === 'invalid') {
    return (
      <AuthShell title="Link expired" subtitle="This reset link is invalid or has expired" footer={footer}>
        <div className="space-y-4 text-center">
          <p className="text-sm text-[#475569]">Request a new link and try again.</p>
          <Link
            href="/forgot-password"
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98]"
          >
            Request a new link
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a password you have not used before" footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="password"
          type="password"
          label="New password"
          value={password}
          onChange={(v) => { setPassword(v); setPhase('ready') }}
          autoComplete="new-password"
        />
        <AuthField
          id="confirm"
          type="password"
          label="Confirm new password"
          value={confirm}
          onChange={(v) => { setConfirm(v); setPhase('ready') }}
          autoComplete="new-password"
        />
        <p className="text-xs text-[#94A3B8]">Use at least {MIN_PASSWORD_LENGTH} characters.</p>

        {phase === 'error' && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={phase === 'saving'}
          className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {phase === 'saving' ? 'Updating' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  )
}
