import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { z } from 'zod'
import { getAuthUser } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

const exchangeTokenSchema = z.object({
  publicToken: z.string().trim().min(1, 'publicToken is required.'),
})

const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV as keyof typeof PlaidEnvironments ?? 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
})

const plaidClient = new PlaidApi(configuration)

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthUser(request)
  if (!user) return Response.json({ error: authError }, { status: 401 })

  let publicToken: string
  try {
    const body = await request.json()
    const parsed = exchangeTokenSchema.safeParse(body)
    if (!parsed.success) {
      return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request body.' }, { status: 400 })
    }
    publicToken = parsed.data.publicToken
  } catch {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  try {
    const exchangeResponse = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    })

    const { access_token, item_id } = exchangeResponse.data

    // Service-role client: plaid_tokens has no RLS policies. user.id was verified by getAuthUser above.
    const { error } = await getSupabaseAdmin().from('plaid_tokens').upsert(
      { user_session_id: user.id, access_token, item_id },
      { onConflict: 'user_session_id' },
    )

    if (error) return Response.json({ error: error.message }, { status: 500 })

    return Response.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
