import type { VercelRequest, VercelResponse } from '@vercel/node'
import { analysisRequestSchema } from '../shared/schemas'
import { requireAuth } from './_lib/auth'
import { analyzeWithGemini } from './_lib/gemini'
import { allowMethods, handleApiError, json } from './_lib/http'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    allowMethods(response, ['POST'])
    return json(response, 405, { error: 'Method not allowed.' })
  }

  if (!(await requireAuth(request, response))) {
    return
  }

  try {
    const payload = analysisRequestSchema.parse(request.body)
    const approxBytes = payload.images.reduce(
      (total, image) => total + image.base64.length * 0.75,
      0,
    )

    if (approxBytes > 18 * 1024 * 1024) {
      return json(response, 400, {
        error: 'Screenshot payload is too large. Try fewer or smaller images.',
      })
    }

    return json(response, 200, await analyzeWithGemini(payload))
  } catch (error) {
    return handleApiError(response, error)
  }
}
