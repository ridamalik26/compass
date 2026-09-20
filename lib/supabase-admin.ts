// SERVER ONLY. Bypasses RLS. Never import this from a client component or a 'use client' file,
// and never expose SUPABASE_SERVICE_ROLE_KEY via a NEXT_PUBLIC_ variable.
// Use it only for plaid_tokens, only after getAuthUser has verified the user,
// and always filter by the verified user.id.
import { createClient } from '@supabase/supabase-js'

let adminClient: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (adminClient) return adminClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set.')
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local and to the Vercel project environment variables (server-side only, not NEXT_PUBLIC_).',
    )
  }

  adminClient = createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  return adminClient
}
