'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'

const NAV = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Connect Bank',
    href: '/connect-bank',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 10.5l9-6.5 9 6.5v10H3v-10z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 21V13h6v8" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    setDropdownOpen(false)
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <>
      {/* ── Desktop top bar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 hidden border-b border-[#E2E8F0] bg-white/95 backdrop-blur-sm md:block">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-1 px-6">

          {/* Logo */}
          <Link href="/dashboard" className="mr-6 flex items-center gap-2 shrink-0">
            <span className="relative flex h-7 w-7 items-center justify-center">
              <svg className="h-7 w-7 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                <circle cx="12" cy="12" r="9.5" />
                <polygon points="12,3.5 13.5,12 12,10.5 10.5,12" className="fill-emerald-500 stroke-none" />
                <polygon points="12,20.5 10.5,12 12,13.5 13.5,12" className="fill-emerald-200 stroke-none" />
              </svg>
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 animate-pulse rounded-full bg-emerald-400 ring-2 ring-white" />
            </span>
            <span className="font-heading text-sm font-bold tracking-tight text-[#0F172A]">Compass</span>
          </Link>

          {/* Nav items */}
          <nav className="flex flex-1 items-center gap-0.5">
            {NAV.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                  }`}
                >
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Avatar dropdown */}
          <div className="relative flex shrink-0 items-center" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-emerald-100 transition hover:ring-emerald-200"
            >
              <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-10 z-50 min-w-[160px] rounded-xl border border-[#E2E8F0] bg-white py-1 shadow-lg">
                <Link
                  href="/goals"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] transition hover:bg-[#F8FAFC]"
                >
                  <svg className="h-4 w-4 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="9" strokeWidth={1.75} />
                    <circle cx="12" cy="12" r="5" strokeWidth={1.75} />
                    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                  </svg>
                  Edit Goals
                </Link>
                <div className="my-1 border-t border-[#F1F5F9]" />
                <button
                  onClick={handleSignOut}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[#374151] transition hover:bg-[#F8FAFC]"
                >
                  <svg className="h-4 w-4 text-[#94A3B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile bottom bar ────────────────────────────────────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E2E8F0] bg-white/95 backdrop-blur-sm md:hidden">
        <div className="flex">
          {NAV.map(({ href, label, icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex flex-1 flex-col items-center justify-center py-3 min-h-[52px] transition-colors ${
                  active ? 'text-emerald-600' : 'text-[#94A3B8]'
                }`}
              >
                {icon}
                {active && <span className="mt-1 h-1 w-1 rounded-full bg-emerald-500" />}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
