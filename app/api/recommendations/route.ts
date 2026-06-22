import Anthropic from '@anthropic-ai/sdk'

interface GoalInput {
  type: string
  title: string
  targetAmount: number
  currentAmount: number
  daysTotal: number
  createdAt: string
  status: 'Ahead' | 'On Track' | 'Behind'
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim()
  if (!apiKey) {
    console.error('[recommendations] ANTHROPIC_API_KEY is not set')
    return Response.json({ error: 'ANTHROPIC_API_KEY is not configured on the server.' }, { status: 500 })
  }

  let goals: GoalInput[]
  try {
    const body = await request.json()
    goals = body.goals
    console.log('[recommendations] received goals:', JSON.stringify(goals, null, 2))
  } catch (err) {
    return Response.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  if (!goals?.length) {
    return Response.json({ error: 'No goals provided.' }, { status: 400 })
  }

  try {
    const client = new Anthropic({ apiKey })

    const lines = goals.map((g) => {
      const daysSince = Math.max(
        0,
        Math.floor((Date.now() - new Date(g.createdAt).getTime()) / 86_400_000),
      )
      const timeElapsed = Math.min(daysSince / g.daysTotal, 1)
      const expectedAmount = timeElapsed * g.targetAmount
      const shortfall = expectedAmount - g.currentAmount
      const surplus = g.currentAmount - expectedAmount
      const pct = g.targetAmount > 0 ? Math.round((g.currentAmount / g.targetAmount) * 100) : 0
      const daysLeft = Math.max(0, g.daysTotal - daysSince)

      let analysis: string
      if (g.status === 'Behind') {
        analysis = `shortfall of $${shortfall.toFixed(0)} vs expected pace`
      } else if (g.status === 'Ahead') {
        analysis = `surplus of $${surplus.toFixed(0)} ahead of pace`
      } else {
        analysis = `on track within 5% of expected pace`
      }

      return `- "${g.title}" (${g.type}): $${g.currentAmount} saved of $${g.targetAmount} target (${pct}%), ${daysLeft} days left, status: ${g.status}, ${analysis}`
    })

    const prompt = `You are a concise financial coach. The user has 3 savings goals:

${lines.join('\n')}

Give 2–4 short, specific, actionable tips to help them stay on track or catch up. Be direct and encouraging. Use plain text only — no markdown, no bullet points, no headers.`

    console.log('[recommendations] calling Claude with prompt:', prompt)

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    })

    console.log('[recommendations] Claude response stop_reason:', message.stop_reason)

    const text = message.content[0]?.type === 'text' ? message.content[0].text : ''
    console.log('[recommendations] text length:', text.length)

    return Response.json({ recommendation: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[recommendations] Claude API error:', msg)
    return Response.json({ error: `Claude API error: ${msg}` }, { status: 500 })
  }
}
