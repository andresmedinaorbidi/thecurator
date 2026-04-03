import { describe, expect, it } from 'vitest'
import { repairJsonPayload } from '../api/_lib/gemini'

describe('repairJsonPayload', () => {
  it('repairs fenced json with trailing commas', () => {
    expect(repairJsonPayload('```json\n{"site_name":"Test",}\n```')).toEqual({
      site_name: 'Test',
    })
  })

  it('balances truncated braces', () => {
    expect(repairJsonPayload('{"section_type":"hero","pattern_name":"A"')).toEqual({
      section_type: 'hero',
      pattern_name: 'A',
    })
  })
})
