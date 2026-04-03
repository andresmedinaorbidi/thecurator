import { describe, expect, it } from 'vitest'
import { buildPrompt } from '../api/_lib/prompts'

describe('buildPrompt', () => {
  it('includes search grounding when enabled', () => {
    const prompt = buildPrompt({
      analysisMode: 'site',
      siteName: 'Example Co',
      url: 'https://example.com',
      webSearch: true,
      images: [{ name: 'hero.jpg', mediaType: 'image/jpeg', base64: 'abc' }],
    })

    expect(prompt).toContain('Google Search grounding')
    expect(prompt).toContain('Example Co')
  })

  it('builds a section prompt without search copy when disabled', () => {
    const prompt = buildPrompt({
      analysisMode: 'section',
      webSearch: false,
      images: [{ name: 'section.jpg', mediaType: 'image/jpeg', base64: 'abc' }],
    })

    expect(prompt).toContain('specific website section')
    expect(prompt).not.toContain('Google Search grounding')
  })
})
