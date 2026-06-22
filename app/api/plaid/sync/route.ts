import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { createServerClient, getAuthUser } from '@/lib/supabase-server'

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

  const supabase = createServerClient(request.headers.get('Authorization'))

  try {
    const tokenRow = await supabase
      .from('plaid_tokens')
      .select('access_token')
      .eq('user_session_id', user.id)
      .single()

    if (tokenRow.error || !tokenRow.data) {
      return Response.json({ error: 'No linked bank account found.' }, { status: 400 })
    }

    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]

    const txRes = await plaidClient.transactionsGet({
      access_token: tokenRow.data.access_token,
      start_date: startDate,
      end_date: endDate,
    })

    const transactions = txRes.data.transactions

    if (transactions.length > 0) {
      await supabase.from('transactions').upsert(
        transactions.map((tx) => ({
          user_session_id: user.id,
          transaction_id: tx.transaction_id,
          amount: tx.amount,
          date: tx.date,
          description: tx.merchant_name ?? tx.original_description ?? null,
          category: tx.personal_finance_category?.primary ?? null,
        })),
        { onConflict: 'transaction_id' },
      )
    }

    // Plaid: positive amount = debit (money out), negative = credit (money in)
    const netSavings = transactions.reduce((sum, tx) => sum + (tx.amount > 0 ? -tx.amount : Math.abs(tx.amount)), 0)

    if (netSavings <= 0) {
      return Response.json({ synced: transactions.length, netSavings: 0, updated: false })
    }

    const progressRes = await supabase
      .from('goal_progress')
      .select('*')
      .eq('user_session_id', user.id)

    const currentProgress: Record<string, number> = {}
    for (const row of progressRes.data ?? []) {
      currentProgress[row.goal_type] = Number(row.current_amount)
    }

    const share = netSavings / 3
    const types = ['6month', '1year', '5year']

    await Promise.all(
      types.map((t) =>
        supabase.from('goal_progress').upsert(
          {
            user_session_id: user.id,
            goal_type: t,
            current_amount: (currentProgress[t] ?? 0) + share,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_session_id,goal_type' },
        ),
      ),
    )

    return Response.json({ synced: transactions.length, netSavings: Math.round(netSavings), updated: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
