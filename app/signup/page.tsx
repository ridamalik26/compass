'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import AuthShell, { OrDivider } from '@/components/AuthShell'
import AuthField from '@/components/AuthField'
import GoogleButton from '@/components/GoogleButton'

type Status = 'checking' | 'idle' | 'loading' | 'error' | 'sent'

const MIN_PASSWORD_LENGTH = 8

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [status, setStatus] = useState<Status>('checking')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setStatus('idle')
    })
  }, [router])

  function validate(): string {
    if (!name.trim()) return 'Please enter your name.'
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Please enter a valid email address.'
    if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
    if (password !== confirm) return 'Passwords do not match.'
    return ''
  }

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const problem = validate()
    if (problem) {
      setStatus('error')
      setErrorMsg(problem)
      return
    }

    setStatus('loading')
    setErrorMsg('')

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    // With email enumeration protection, an already registered address returns a user with no identities.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      setStatus('error')
      setErrorMsg('An account with this email already exists. Try signing in instead.')
      return
    }

    // Email confirmation off: Supabase returns a session straight away.
    if (data.session) {
      router.replace('/dashboard')
      return
    }

    setStatus('sent')
  }

  if (status === 'checking') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <svg className="h-8 w-8 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </main>
    )
  }

  if (status === 'sent') {
    return (
      <AuthShell title="Check your email" subtitle="One more step to finish creating your account">
        <div className="space-y-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
            <svg className="h-6 w-6 text-emerald-500" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </span>
          <p className="text-sm text-[#475569]">
            We sent a confirmation link to <span className="font-semibold text-[#0F172A]">{email.trim()}</span>. Open it to
            activate your account, then sign in.
          </p>
          <p className="text-xs text-[#94A3B8]">Not there yet? Check your spam folder.</p>
          <Link
            href="/login"
            className="flex min-h-[48px] w-full items-center justify-center rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98]"
          >
            Back to sign in
          </Link>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking your savings goals"
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">Sign in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <AuthField id="name" type="text" label="Full name" value={name} onChange={(v) => { setName(v); setStatus('idle') }} autoComplete="name" />
        <AuthField id="email" type="email" label="Email address" value={email} onChange={(v) => { setEmail(v); setStatus('idle') }} autoComplete="email" />
        <AuthField id="password" type="password" label="Password" value={password} onChange={(v) => { setPassword(v); setStatus('idle') }} autoComplete="new-password" />
        <AuthField id="confirm" type="password" label="Confirm password" value={confirm} onChange={(v) => { setConfirm(v); setStatus('idle') }} autoComplete="new-password" />
        <p className="text-xs text-[#94A3B8]">Use at least {MIN_PASSWORD_LENGTH} characters.</p>

        {status === 'error' && (
          <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? (<><Spinner />Creating account</>) : 'Create account'}
        </button>
      </form>

      <OrDivider />
      <GoogleButton />
    </AuthShell>
  )
}
