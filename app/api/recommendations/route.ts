import { handleRecommendationRequest } from '@/lib/ai/advice'

export const maxDuration = 30

export async function POST(request: Request) {
  return handleRecommendationRequest(request)
}
