import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearSessionCookie } from '../_lib/auth'
import { allowMethods, json } from '../_lib/http'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    allowMethods(response, ['POST'])
    return json(response, 405, { error: 'Method not allowed.' })
  }

  clearSessionCookie(response)
  return json(response, 200, { authenticated: false })
}
