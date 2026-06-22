import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from 'plaid'

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
  try {
    const { userSessionId } = await request.json()

    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: userSessionId },
      client_name: 'Compass',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    })

    return Response.json({ link_token: response.data.link_token })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
