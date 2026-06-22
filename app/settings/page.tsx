'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Toast from '@/components/Toast'

type Status = 'idle' | 'loading' | 'success' | 'error'

function Field({ label, type, value, onChange, autoComplete }: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[#475569]">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        required
        className="w-full rounded-xl border border-[#E2E8F0] bg-white px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
      />
    </label>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailStatus, setEmailStatus] = useState<Status>('idle')
  const [passwordStatus, setPasswordStatus] = useState<Status>('idle')
  const [emailMsg, setEmailMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setEmail(user.email ?? '')
      setNewEmail(user.email ?? '')
    })
  }, [router])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  async function handleUpdateEmail(e: React.SyntheticEvent) {
    e.preventDefault()
    if (newEmail === email) { setEmailMsg('No change.'); setEmailStatus('error'); return }
    setEmailStatus('loading')
    setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    if (error) {
      setEmailStatus('error')
      setEmailMsg(error.message)
    } else {
      setEmailStatus('success')
      setEmailMsg('Confirmation sent. Check your inbox.')
      setToast({ message: 'Confirmation email sent', type: 'success' })
    }
  }

  async function handleUpdatePassword(e: React.SyntheticEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMsg('Passwords do not match.')
      setPasswordStatus('error')
      return
    }
    if (newPassword.length < 6) {
      setPasswordMsg('Password must be at least 6 characters.')
      setPasswordStatus('error')
      return
    }
    setPasswordStatus('loading')
    setPasswordMsg('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword })
    if (signInError) {
      setPasswordStatus('error')
      setPasswordMsg('Current password is incorrect.')
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      setPasswordStatus('error')
      setPasswordMsg(error.message)
    } else {
      setPasswordStatus('success')
      setPasswordMsg('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setToast({ message: 'Password updated successfully', type: 'success' })
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Navbar />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <main className="mx-auto max-w-lg px-4 py-6 pb-24 md:pb-8 space-y-5">

        <div>
          <h1 className="font-heading text-xl font-bold tracking-tight text-[#0F172A]">Settings</h1>
          <p className="mt-1 text-sm text-[#64748B]">Manage your account details.</p>
        </div>

        {/* Email */}
        <div className="card-hover rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[#0F172A]">Email Address</h2>
          <form onSubmit={handleUpdateEmail} className="space-y-4" noValidate>
            <Field
              label="New email"
              type="email"
              value={newEmail}
              onChange={(v) => { setNewEmail(v); setEmailStatus('idle') }}
              autoComplete="email"
            />
            {emailStatus === 'error' && <p className="text-sm text-red-600">{emailMsg}</p>}
            {emailStatus === 'success' && <p className="text-sm text-emerald-600">{emailMsg}</p>}
            <button
              type="submit"
              disabled={emailStatus === 'loading'}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 min-h-[44px]"
            >
              {emailStatus === 'loading' ? 'Updating' : 'Update Email'}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="card-hover rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-[#0F172A]">Change Password</h2>
          <form onSubmit={handleUpdatePassword} className="space-y-4" noValidate>
            <Field label="Current password" type="password" value={currentPassword} onChange={(v) => { setCurrentPassword(v); setPasswordStatus('idle') }} autoComplete="current-password" />
            <Field label="New password" type="password" value={newPassword} onChange={(v) => { setNewPassword(v); setPasswordStatus('idle') }} autoComplete="new-password" />
            <Field label="Confirm new password" type="password" value={confirmPassword} onChange={(v) => { setConfirmPassword(v); setPasswordStatus('idle') }} autoComplete="new-password" />
            {passwordStatus === 'error' && <p className="text-sm text-red-600">{passwordMsg}</p>}
            {passwordStatus === 'success' && <p className="text-sm text-emerald-600">{passwordMsg}</p>}
            <button
              type="submit"
              disabled={passwordStatus === 'loading'}
              className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 disabled:opacity-60 min-h-[44px]"
            >
              {passwordStatus === 'loading' ? 'Updating' : 'Change Password'}
            </button>
          </form>
        </div>

      </main>
    </div>
  )
}
