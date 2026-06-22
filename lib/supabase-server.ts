import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export function createServerClient(authHeader: string | null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: authHeader ? { Authorization: authHeader } : {} },
    auth: { persistSession: false },
  })
}

export async function getAuthUser(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return { user: null, error: 'Missing Authorization header' }

  const supabase = createServerClient(authHeader)
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, error: 'Invalid or expired token' }

  return { user, error: null }
}
