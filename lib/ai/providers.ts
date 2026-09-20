// SERVER ONLY. One OpenAI-compatible chat-completions adapter for free providers.
// Select with AI_PROVIDER = groq | gemini | openrouter | none. Provider model names change often:
// verify them in each provider's docs and override with AI_MODEL if a default is retired.

const PRESETS = {
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
  },
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    model: 'gemini-2.5-flash-lite',
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
  },
} as const

type ProviderName = keyof typeof PRESETS

const MAX_TOKENS = 300
const TIMEOUT_MS = 8000

function resolveProvider(): { name: ProviderName; key: string } | null {
  const name = process.env.AI_PROVIDER?.trim().toLowerCase()
  const key = process.env.AI_API_KEY?.trim()
  if (!name || name === 'none' || !key) return null
  if (!(name in PRESETS)) return null
  return { name: name as ProviderName, key }
}

/** True when a provider and key are configured. Lets callers skip quota use when AI is off. */
export function isAiConfigured(): boolean {
  return resolveProvider() !== null
}

/**
 * Returns the model's text, or null when the provider is none/unknown, the key is missing,
 * or the reply is empty. Throws on a non-OK response or a network/timeout failure.
 * The thrown message never includes the response body.
 */
export async function complete(prompt: string): Promise<string | null> {
  const provider = resolveProvider()
  if (!provider) return null

  const preset = PRESETS[provider.name]
  const res = await fetch(preset.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.key}`,
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL?.trim() || preset.model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!res.ok) throw new Error(`AI provider responded with status ${res.status}`)

  const data = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
  const content = data.choices?.[0]?.message?.content
  return typeof content === 'string' && content.trim() ? content.trim() : null
}
