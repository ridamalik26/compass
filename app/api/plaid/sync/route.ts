import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid'
import { createServerClient, getAuthUser } from '@/lib/supabase-server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'
import { dollarsToCents, splitThreeWays } from '@/lib/money'
import type { GoalType } from '@/lib/pace'

export const maxDuration = 30

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

const GOAL_TYPES: GoalType[] = ['6month', '1year', '5year']
const PAGE_SIZE = 500

function plaidErrorCode(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null) return undefined
  const response = (err as { response?: { data?: { error_code?: unknown } } }).response
  const code = response?.data?.error_code
  return typeof code === 'string' ? code : undefined
}

export async function POST(request: Request) {
  const { user, error: authError } = await getAuthUser(request)
  if (!user) return Response.json({ error: authError }, { status: 401 })

  const supabase = createServerClient(request.headers.get('Authorization'))

  try {
    // Service-role client: plaid_tokens has no RLS policies. user.id was verified by getAuthUser above.
    const tokenRow = await getSupabaseAdmin()
      .from('plaid_tokens')
      .select('access_token')
      .eq('user_session_id', user.id)
      .maybeSingle()

    if (tokenRow.error) {
      return Response.json({ error: 'Could not load your linked bank account.' }, { status: 500 })
    }
    if (!tokenRow.data) {
      return Response.json({ error: 'No linked bank account found.' }, { status: 400 })
    }

    const endDate = new Date().toISOString().split('T')[0]
    const startDate = new Date(Date.now() - 30 * 86_400_000).toISOString().split('T')[0]

    // Paginate through every transaction in the window, not just the first page.
    const transactions: Awaited<ReturnType<typeof plaidClient.transactionsGet>>['data']['transactions'] = []
    let totalTransactions = Infinity
    while (transactions.length < totalTransactions) {
      const txRes = await plaidClient.transactionsGet({
        access_token: tokenRow.data.access_token,
        start_date: startDate,
        end_date: endDate,
        options: { count: PAGE_SIZE, offset: transactions.length },
      })
      totalTransactions = txRes.data.total_transactions
      transactions.push(...txRes.data.transactions)
      if (txRes.data.transactions.length === 0) break
    }

    // Idempotency: a transaction already stored for this user has already been counted toward
    // goal progress, so re-running a sync over the same window must not add its amount again.
    const fetchedIds = transactions.map((tx) => tx.transaction_id)
    const existingRes = fetchedIds.length
      ? await supabase
          .from('transactions')
          .select('transaction_id')
          .eq('user_session_id', user.id)
          .in('transaction_id', fetchedIds)
      : { data: [], error: null }
    if (existingRes.error) {
      return Response.json({ error: `Failed to check existing transactions: ${existingRes.error.message}` }, { status: 500 })
    }
    const alreadyCounted = new Set((existingRes.data ?? []).map((row) => row.transaction_id))
    const newTransactions = transactions.filter((tx) => !alreadyCounted.has(tx.transaction_id))

    if (transactions.length > 0) {
      const { error: txError } = await supabase.from('transactions').upsert(
        transactions.map((tx) => ({
          user_session_id: user.id,
          transaction_id: tx.transaction_id,
          amount: tx.amount,
          date: tx.date,
          description: tx.merchant_name ?? tx.original_description ?? null,
          category: tx.personal_finance_category?.primary ?? null,
        })),
        { onConflict: 'user_session_id,transaction_id' },
      )
      if (txError) {
        return Response.json({ error: `Failed to save transactions: ${txError.message}` }, { status: 500 })
      }
    }

    // Plaid: positive amount = debit (money out), negative = credit (money in). Summed in cents
    // per transaction so repeated additions cannot drift the total away from the true sum.
    const netSavingsCents = newTransactions.reduce((sum, tx) => {
      const amountCents = dollarsToCents(tx.amount)
      return sum + (amountCents > 0 ? -amountCents : Math.abs(amountCents))
    }, 0)

    if (netSavingsCents <= 0) {
      return Response.json({ synced: transactions.length, netSavings: 0, updated: false })
    }

    const progressRes = await supabase
      .from('goal_progress')
      .select('*')
      .eq('user_session_id', user.id)

    if (progressRes.error) {
      return Response.json({ error: `Failed to load goal progress: ${progressRes.error.message}` }, { status: 500 })
    }

    const currentCents: Record<string, number> = {}
    for (const row of progressRes.data ?? []) {
      currentCents[row.goal_type] = dollarsToCents(Number(row.current_amount))
    }

    // Any leftover cent from the three-way split goes to the first goal type (6month).
    const shareCents = splitThreeWays(netSavingsCents)

    // save_progress upserts the balance and inserts a history row in one transaction, so every
    // sync leaves a snapshot behind (not just manual balance edits).
    const updates = await Promise.all(
      GOAL_TYPES.map((t, i) =>
        supabase.rpc('save_progress', {
          goal_type: t,
          amount_cents: (currentCents[t] ?? 0) + shareCents[i],
        }),
      ),
    )

    const failed = updates.find((r) => r.error)
    if (failed?.error) {
      return Response.json({ error: `Failed to update goal progress: ${failed.error.message}` }, { status: 500 })
    }

    return Response.json({
      synced: transactions.length,
      netSavings: Math.round(netSavingsCents / 100),
      updated: true,
    })
  } catch (err) {
    if (plaidErrorCode(err) === 'PRODUCT_NOT_READY') {
      return Response.json(
        { error: 'Your transactions are still being prepared by your bank. Please try again in a minute.' },
        { status: 503 },
      )
    }
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
