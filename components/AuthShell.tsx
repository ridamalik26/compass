import type { ReactNode } from 'react'

export function OrDivider() {
  return (
    <div className="my-5 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-[#E2E8F0]" />
      <span className="text-xs text-[#94A3B8]">or</span>
      <span className="h-px flex-1 bg-[#E2E8F0]" />
    </div>
  )
}

export default function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string
  subtitle: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] px-4 py-10">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 ring-1 ring-emerald-100">
            <svg className="h-9 w-9 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <circle cx="12" cy="12" r="9.5" />
              <polygon points="12,3.5 13.5,12 12,10.5 10.5,12" className="fill-emerald-500 stroke-none" />
              <polygon points="12,20.5 10.5,12 12,13.5 13.5,12" className="fill-emerald-200 stroke-none" />
            </svg>
            <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse rounded-full bg-emerald-400 ring-2 ring-white" />
          </span>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-[#0F172A]">{title}</h1>
          <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl border border-[#E2E8F0] bg-white px-6 py-7 shadow-sm">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-[#64748B]">{footer}</div>}
      </div>
    </main>
  )
}
