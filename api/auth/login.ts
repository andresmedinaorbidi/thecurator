import type { VercelRequest, VercelResponse } from '@vercel/node'
import { sessionRequestSchema } from '../../shared/schemas'
import { createSessionToken, setSessionCookie } from '../_lib/auth'
import { allowMethods, handleApiError, json } from '../_lib/http'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    allowMethods(response, ['POST'])
    return json(response, 405, { error: 'Method not allowed.' })
  }

  try {
    const { password } = sessionRequestSchema.parse(request.body)
    if (!process.env.APP_PASSWORD) {
      throw new Error('Missing APP_PASSWORD environment variable.')
    }

    if (password !== process.env.APP_PASSWORD) {
      return json(response, 401, { error: 'Incorrect password.' })
    }

    setSessionCookie(response, await createSessionToken())
    return json(response, 200, { authenticated: true })
  } catch (error) {
    return handleApiError(response, error)
  }
}
