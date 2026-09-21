import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { getAuthUser } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

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

  try {
    const { publicToken } = await request.json()

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
