import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { requireAuth } from '../_lib/auth'
import { deleteEntry } from '../_lib/db'
import { allowMethods, handleApiError, json } from '../_lib/http'

const paramsSchema = z.object({
  id: z.string().uuid(),
})

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'DELETE') {
    allowMethods(response, ['DELETE'])
    return json(response, 405, { error: 'Method not allowed.' })
  }

  if (!(await requireAuth(request, response))) {
    return
  }

  try {
    const { id } = paramsSchema.parse(request.query)
    await deleteEntry(id)
    return json(response, 200, { ok: true })
  } catch (error) {
    return handleApiError(response, error)
  }
}
