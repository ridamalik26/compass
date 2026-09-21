'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { consumeIntentionalSignOut } from '@/lib/auth-flag'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/forgot-password', '/reset-password']

export default function AuthWatcher() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_OUT') return
      // Always consume the flag so it cannot suppress a later, real expiry.
      if (consumeIntentionalSignOut()) return
      if (PUBLIC_PATHS.includes(pathnameRef.current)) return
      router.replace('/login?expired=1')
    })
    return () => data.subscription.unsubscribe()
  }, [router])

  return null
}
