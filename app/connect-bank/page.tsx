'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePlaidLink } from 'react-plaid-link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'

function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}

export default function ConnectBankPage() {
  const router = useRouter()
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'linking' | 'syncing' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [accessToken, setAccessToken] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setAccessToken(session.access_token)

      try {
        const r = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({}),
        })
        const data = await r.json()
        if (data.link_token) setLinkToken(data.link_token)
        else setMessage(data.error ?? 'Failed to initialize.')
      } catch {
        setMessage('Failed to reach the server.')
      }
    }
    init()
  }, [router])

  const onSuccess = useCallback(
    async (publicToken: string) => {
      setStatus('linking')
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
      try {
        const exchangeRes = await fetch('/api/plaid/exchange-token', {
          method: 'POST',
          headers,
          body: JSON.stringify({ publicToken }),
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
          headers,
          body: JSON.stringify({}),
        })
        const syncData = await syncRes.json()
        if (syncData.error) { setStatus('error'); setMessage(syncData.error); return }

        setStatus('success')
        setMessage(
          syncData.updated
            ? `Synced ${syncData.synced} transactions. Net savings of ${fmtUSD(syncData.netSavings)} applied to your goals.`
            : `Synced ${syncData.synced} transactions.`,
        )
      } catch {
        setStatus('error')
        setMessage('An unexpected error occurred.')
      }
    },
    [accessToken],
  )

  const { open, ready } = usePlaidLink({ token: linkToken, onSuccess, onExit: () => setStatus('idle') })
  const isLoading = status === 'linking' || status === 'syncing'

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />

      <main className="mx-auto flex min-h-[calc(100vh-56px)] max-w-sm flex-col items-center justify-center px-4 pb-24 md:pb-0">

        {status === 'success' ? (
          <div className="w-full space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <svg className="h-8 w-8 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold text-[#0F172A]">Bank connected</h2>
              <p className="mt-2 text-sm text-[#64748B]">{message}</p>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 min-h-[48px]"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="w-full space-y-6 text-center">

            {/* Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
              <svg className="h-8 w-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10.5l9-6.5 9 6.5v10H3v-10z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 21V13h6v8" />
              </svg>
            </div>

            {/* Heading */}
            <div>
              <h1 className="font-heading text-xl font-bold text-[#0F172A]">Connect your bank</h1>
              <p className="mt-2 text-sm text-[#64748B]">
                Link your account to automatically sync transactions and track real savings.
              </p>
            </div>

            {/* Error */}
            {status === 'error' && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-left">
                <p className="text-sm font-medium text-red-700">Connection failed</p>
                <p className="mt-1 text-sm text-red-600">{message}</p>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center justify-center gap-3">
                <svg className="h-5 w-5 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                <span className="text-sm text-[#64748B]">
                  {status === 'linking' ? 'Connecting account' : 'Syncing transactions'}
                </span>
              </div>
            )}

            <button
              onClick={() => open()}
              disabled={!ready || !linkToken || isLoading}
              className="w-full rounded-xl bg-emerald-500 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 min-h-[48px]"
            >
              {!linkToken ? 'Loading' : isLoading ? 'Connecting' : 'Connect Bank Account'}
            </button>
          </div>
        )}

      </main>
    </div>
  )
}
