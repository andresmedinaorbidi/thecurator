import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createLibraryEntrySchema } from '../../shared/schemas.js'
import { requireAuth } from '../_lib/auth.js'
import { clearEntries, insertEntry, listEntries } from '../_lib/db.js'
import { allowMethods, handleApiError, json } from '../_lib/http.js'

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (!(await requireAuth(request, response))) {
    return
  }

  try {
    if (request.method === 'GET') {
      return json(response, 200, { entries: await listEntries() })
    }

    if (request.method === 'POST') {
      const payload = createLibraryEntrySchema.parse(request.body)
      return json(response, 201, { entry: await insertEntry(payload) })
    }

    if (request.method === 'DELETE') {
      await clearEntries()
      return json(response, 200, { ok: true })
    }

    allowMethods(response, ['GET', 'POST', 'DELETE'])
    return json(response, 405, { error: 'Method not allowed.' })
  } catch (error) {
    return handleApiError(response, error)
  }
}
