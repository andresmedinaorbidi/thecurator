import { GoogleGenAI } from '@google/genai'
import {
  sectionPatternSchema,
  sectionResponseJsonSchema,
  siteReferenceSchema,
  siteResponseJsonSchema,
} from '../../shared/schemas'
import type { AnalyzeRequest, AnalyzeResponse } from '../../shared/types'
import { buildPrompt } from './prompts'

function getClient() {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY environment variable.')
  }

  return new GoogleGenAI({ apiKey })
}

export async function analyzeWithGemini(payload: AnalyzeRequest): Promise<AnalyzeResponse> {
  const grounded = Boolean(payload.webSearch && payload.url)
  const ai = getClient()
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    contents: [
      ...payload.images.map((image) => ({
        inlineData: {
          mimeType: image.mediaType,
          data: image.base64,
        },
      })),
      buildPrompt(payload),
    ],
    config: {
      temperature: 0.3,
      responseMimeType: 'application/json',
      responseJsonSchema:
        payload.analysisMode === 'site'
          ? siteResponseJsonSchema
          : sectionResponseJsonSchema,
      tools: grounded ? [{ googleSearch: {} }] : undefined,
    },
  })

  const text = response.text?.trim()
  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    parsed = repairJsonPayload(text)
  }

  const result =
    payload.analysisMode === 'site'
      ? siteReferenceSchema.parse(parsed)
      : sectionPatternSchema.parse(parsed)

  return { result, grounded }
}

export function repairJsonPayload(text: string) {
  let repaired = text.replace(/```json|```/g, '').trim()
  repaired = repaired.replace(/,\s*([}\]])/g, '$1')

  const openBrackets = (repaired.match(/\[/g) || []).length
  const closeBrackets = (repaired.match(/]/g) || []).length
  const openBraces = (repaired.match(/{/g) || []).length
  const closeBraces = (repaired.match(/}/g) || []).length

  if (openBrackets > closeBrackets) {
    repaired += ']'.repeat(openBrackets - closeBrackets)
  }

  if (openBraces > closeBraces) {
    repaired += '}'.repeat(openBraces - closeBraces)
  }

  return JSON.parse(repaired)
}
