'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import AuthShell from '@/components/AuthShell'
import AuthField from '@/components/AuthField'

type Status = 'idle' | 'loading' | 'error' | 'sent'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setStatus('error')
      setErrorMsg('Please enter a valid email address.')
      return
    }

    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    setStatus('sent')
  }

  const footer = (
    <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">Back to sign in</Link>
  )

  if (status === 'sent') {
    return (
      <AuthShell title="Check your email" subtitle="Password reset instructions are on the way" footer={footer}>
        <div className="space-y-3 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <p className="text-sm text-[#475569]">
            If an account exists for <span className="font-semibold text-[#0F172A]">{email.trim()}</span>, we sent a link to
            reset the password.
          </p>
          <p className="text-xs text-[#94A3B8]">Not there yet? Check your spam folder.</p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Forgot your password?" subtitle="Enter your email and we will send a reset link" footer={footer}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField
          id="email"
          type="email"
          label="Email address"
          value={email}
          onChange={(v) => { setEmail(v); setStatus('idle') }}
          autoComplete="email"
        />

        {status === 'error' && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="mt-2 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? 'Sending' : 'Send reset link'}
        </button>
      </form>
    </AuthShell>
  )
}
