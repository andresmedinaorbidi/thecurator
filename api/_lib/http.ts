import type { VercelResponse } from '@vercel/node'
import { ZodError } from 'zod'

export function json(response: VercelResponse, status: number, body: unknown) {
  response.status(status).json(body)
}

export function allowMethods(response: VercelResponse, methods: string[]) {
  response.setHeader('Allow', methods.join(', '))
}

export function handleApiError(response: VercelResponse, error: unknown) {
  if (error instanceof ZodError) {
    return json(response, 400, {
      error: 'Invalid request or model response.',
      details: error.flatten(),
    })
  }

  if (error instanceof Error) {
    return json(response, 500, { error: error.message })
  }

  return json(response, 500, { error: 'Unknown server error.' })
}
