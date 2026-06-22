'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'checking' | 'idle' | 'loading' | 'error'>('checking')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setStatus('idle')
    })
  }, [router])

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }

    if (data.user) {
      await supabase.from('users').upsert(
        {
          id: data.user.id,
          full_name: (data.user.user_metadata?.name as string | undefined) ?? null,
          email: data.user.email,
        },
        { onConflict: 'id' },
      )
    }

    router.push('/dashboard')
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-10 flex flex-col items-center text-center">
          <span className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
            <svg className="h-9 w-9 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="9.5" />
              <polygon points="12,3.5 13.5,12 12,10.5 10.5,12" className="fill-emerald-500 stroke-none" />
              <polygon points="12,20.5 10.5,12 12,13.5 13.5,12" className="fill-emerald-200 stroke-none" />
            </svg>
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400 ring-2 ring-white" />
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F172A]">Welcome back</h1>
          <p className="mt-1 text-sm text-[#64748B]">Sign in to your Compass account</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[#E2E8F0] bg-white px-6 py-7 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            {/* Email */}
            <div className="relative">
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder=" "
                value={email}
                onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
                required
                className="fl-input"
              />
              <label htmlFor="email" className="fl-label">Email address</label>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder=" "
                value={password}
                onChange={(e) => { setPassword(e.target.value); setStatus('idle') }}
                required
                className="fl-input"
              />
              <label htmlFor="password" className="fl-label">Password</label>
            </div>

            {status === 'error' && (
              <div role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 min-h-[48px]"
            >
              {status === 'loading' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

      </div>
    </main>
  )
}
