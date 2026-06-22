'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlaidLink } from 'react-plaid-link'
import { supabase } from '@/lib/supabase'

export default function ConnectBankPage() {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'linking' | 'syncing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setSessionId(user.id)
      try {
        const r = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userSessionId: user.id }),
        })
        const data = await r.json()
        if (data.link_token) setLinkToken(data.link_token)
        else setMessage(data.error ?? 'Failed to create link token.')
      } catch {
        setMessage('Failed to reach the server.')
      }
    }
    init()
  }, [router])

  const onSuccess = useCallback(
    async (publicToken: string) => {
      setStatus('linking')
      try {
        const exchangeRes = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publicToken, userSessionId: sessionId }),
        })
        const exchangeData = await exchangeRes.json()
        if (!exchangeData.success) {
          setStatus('error')
          setMessage(exchangeData.error ?? 'Token exchange failed.')
          return
        }

        setStatus('syncing')
        const syncRes = await fetch('/api/plaid/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userSessionId: sessionId }),
        })
        const syncData = await syncRes.json()
        if (syncData.error) {
          setStatus('error')
          setMessage(syncData.error)
          return
        }

        setStatus('success')
        setMessage(
          syncData.updated
            ? `Synced ${syncData.synced} transactions. Net savings of $${syncData.netSavings} distributed across your goals.`
            : `Synced ${syncData.synced} transactions. No positive net savings to distribute this period.`,
        )
      } catch {
        setStatus('error')
        setMessage('An unexpected error occurred.')
      }
    },
    [sessionId],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setStatus('idle'),
  })

  const isLoading = status === 'linking' || status === 'syncing'

  return (
    <main className="min-h-screen bg-[#0F172A] px-4 py-14">
      <div className="mx-auto max-w-md space-y-8">

        {/* Header */}
        <header>
          <button
            onClick={() => router.push('/dashboard')}
            className="mb-6 flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-300"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>

          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20">
              <svg className="h-6 w-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Connect Your Bank</h1>
              <p className="text-sm text-slate-500">Powered by Plaid sandbox</p>
            </div>
          </div>
        </header>

        {/* Info card */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-white">How it works</h2>
          {[
            'Connect securely via Plaid — your credentials never touch our servers.',
            'We fetch the last 30 days of transactions.',
            'Net savings are automatically distributed across your 3 goals.',
          ].map((text, i) => (
            <div key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-400">
                {i + 1}
              </span>
              <p className="text-sm text-slate-400">{text}</p>
            </div>
          ))}
          <p className="pt-1 text-xs text-slate-600">
            Sandbox mode: use{' '}
            <span className="text-slate-400">user_good</span> /{' '}
            <span className="text-slate-400">pass_good</span> for test credentials.
          </p>
        </div>

        {/* Status messages */}
        {status === 'success' && (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm font-medium text-emerald-400">Bank connected!</p>
            <p className="mt-1 text-sm text-slate-400">{message}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="mt-3 w-full rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400"
            >
              View Dashboard →
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-sm font-medium text-red-400">Something went wrong</p>
            <p className="mt-1 text-sm text-slate-400">{message}</p>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <svg className="h-5 w-5 shrink-0 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm text-slate-400">
              {status === 'linking' ? 'Exchanging token…' : 'Syncing transactions…'}
            </span>
          </div>
        )}

        {/* Connect button */}
        {status !== 'success' && (
          <button
            onClick={() => open()}
            disabled={!ready || !linkToken || isLoading}
            className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {!linkToken ? 'Loading…' : 'Connect Bank Account'}
          </button>
        )}

      </div>
    </main>
  )
}
