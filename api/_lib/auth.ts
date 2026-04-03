import { SignJWT, jwtVerify } from 'jose'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const COOKIE_NAME = 'atlas_curator_session'
const encoder = new TextEncoder()

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('Missing SESSION_SECRET environment variable.')
  }

  return encoder.encode(secret)
}

export async function createSessionToken() {
  return new SignJWT({ scope: 'atlas-curator' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSessionSecret())
}

export async function verifySessionToken(token: string) {
  try {
    const result = await jwtVerify(token, getSessionSecret())
    return result.payload.scope === 'atlas-curator'
  } catch {
    return false
  }
}

export function setSessionCookie(response: VercelResponse, token: string) {
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=604800`,
  )
}

export function clearSessionCookie(response: VercelResponse) {
  response.setHeader(
    'Set-Cookie',
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`,
  )
}

export function getCookieValue(request: VercelRequest, name = COOKIE_NAME) {
  const header = request.headers.cookie
  if (!header) return null

  for (const part of header.split(';')) {
    const segment = part.trim()
    if (segment.startsWith(`${name}=`)) {
      return decodeURIComponent(segment.slice(name.length + 1))
    }
  }

  return null
}

export async function requireAuth(request: VercelRequest, response: VercelResponse) {
  const token = getCookieValue(request)
  if (!token) {
    response.status(401).json({ error: 'Unauthorized' })
    return false
  }

  const valid = await verifySessionToken(token)
  if (!valid) {
    clearSessionCookie(response)
    response.status(401).json({ error: 'Unauthorized' })
    return false
  }

  return true
}
