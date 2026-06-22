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

  // Redirect to dashboard if already authenticated
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

    // Upsert profile row — handles the email-confirmation flow where the users
    // table row couldn't be written at signup time (no session yet then)
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
      <main className="flex min-h-screen items-center justify-center bg-[#0F172A]">
        <svg className="h-8 w-8 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#0F172A] px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <svg className="h-7 w-7 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="9.5" />
              <polygon points="12,3 14,12 12,10 10,12" className="fill-emerald-400 stroke-none" />
              <polygon points="12,21 10,12 12,14 14,12" className="fill-slate-600 stroke-none" />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-white">Compass</span>
          </div>
          <h1 className="mt-6 text-xl font-semibold text-white">Welcome back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Email</span>
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus('idle') }}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-400">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setStatus('idle') }}
              required
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>

          {status === 'error' && (
            <div role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>

      </div>
    </main>
  )
}
