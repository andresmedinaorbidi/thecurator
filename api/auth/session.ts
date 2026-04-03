import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getCookieValue, verifySessionToken } from '../_lib/auth.js'
import { allowMethods, json } from '../_lib/http.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'GET') {
    allowMethods(response, ['GET'])
    return json(response, 405, { error: 'Method not allowed.' })
  }

  const token = getCookieValue(request)
  const authenticated = token ? await verifySessionToken(token) : false
  return json(response, 200, { authenticated })
}
