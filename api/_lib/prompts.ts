import {
  AUDIENCES,
  DESIGN_STYLES,
  INDUSTRIES,
  SECTION_TAGS,
  SECTION_TYPES,
  USE_CASE_TAGS,
} from '../../shared/constants.js'
import type { AnalyzeRequest } from '../../shared/types.js'

const controlledVocab = `CONTROLLED VOCABULARIES (use ONLY these values):

industries: ${INDUSTRIES.join(', ')}

design_style: ${DESIGN_STYLES.join(', ')}

audience: ${AUDIENCES.join(', ')}

use_case_tags: ${USE_CASE_TAGS.join(', ')}

section tags: ${SECTION_TAGS.join(', ')}

section types: ${SECTION_TYPES.join(', ')}`

function searchContext(payload: AnalyzeRequest) {
  if (!payload.webSearch || !payload.url) {
    return ''
  }

  return `\n\nIMPORTANT: Use Google Search grounding to research "${payload.url}" before analyzing the screenshots. Bring in useful business context, positioning signals, awards, reviews, or market cues you can verify.`
}

export function buildPrompt(payload: AnalyzeRequest) {
  if (payload.analysisMode === 'site') {
    return `You are the ATLAS Curator. Analyze a reference website and produce a structured JSON entry for the ATLAS reference library.${searchContext(payload)}

Return ONLY valid JSON matching the requested schema.

Important rules:
- Be specific and insightful.
- Use ONLY the controlled vocabulary tags listed below.
- Score honestly. 6 = competent. 8 = genuinely excellent. 10 = elite.

${controlledVocab}

${payload.notes ? `Additional context from the curator: ${payload.notes}` : ''}
${payload.industry ? `Industry context: ${payload.industry}` : ''}
${payload.siteName ? `Preferred site_name: ${payload.siteName}` : ''}
${payload.url ? `Preferred url: ${payload.url}` : ''}`.trim()
  }

  return `You are the ATLAS Curator analyzing a specific website section for the pattern library.${searchContext(payload)}

Return ONLY valid JSON matching the requested schema.

Be extremely specific about design specs because another AI agent will use this to recreate the section.

${controlledVocab}

${payload.notes ? `Context: ${payload.notes}` : ''}
${payload.siteName ? `Source site: ${payload.siteName}` : ''}
${payload.url ? `Source URL: ${payload.url}` : ''}`.trim()
}
