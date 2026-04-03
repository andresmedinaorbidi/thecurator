import { z } from 'zod'

const contentSlotSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().optional(),
  guidelines: z.string(),
  example: z.string().optional(),
})

const siteSectionSchema = z.object({
  type: z.string(),
  name: z.string(),
  tags: z.array(z.string()).optional(),
  why_it_works: z.string(),
  best_for: z.array(z.string()).optional(),
  not_for: z.array(z.string()).optional(),
  content_slots: z.array(z.union([z.string(), contentSlotSchema])).optional(),
  design_notes: z.string().optional(),
})

export const siteReferenceSchema = z.object({
  site_name: z.string(),
  url: z.string().optional(),
  industry: z.string().optional(),
  industries: z.array(z.string()).optional(),
  design_style: z.array(z.string()).optional(),
  audience: z.array(z.string()).optional(),
  use_case_tags: z.array(z.string()).optional(),
  positioning: z.string().optional(),
  business_context: z.string().optional(),
  locale: z.string().optional(),
  design_analysis: z
    .object({
      color_strategy: z.string().optional(),
      color_palette: z.array(z.string()).optional(),
      typography_strategy: z.string().optional(),
      heading_font: z.string().optional(),
      body_font: z.string().optional(),
      whitespace_usage: z.string().optional(),
      imagery_approach: z.string().optional(),
      animation_approach: z.string().optional(),
      layout_philosophy: z.string().optional(),
      standout_detail: z.string().optional(),
    })
    .optional(),
  strategic_analysis: z
    .object({
      primary_goal: z.string().optional(),
      conversion_mechanism: z.string().optional(),
      trust_building: z.array(z.string()).optional(),
      content_hierarchy: z.array(z.string()).optional(),
      what_works: z.array(z.string()).optional(),
      what_could_improve: z.array(z.string()).optional(),
      conversion_path: z.string().optional(),
    })
    .optional(),
  sections_identified: z.array(siteSectionSchema).optional(),
  overall_score: z.coerce.number().optional(),
  best_for: z.array(z.string()).optional(),
  key_insight: z.string().catch('No key insight returned.'),
  _note: z.string().optional(),
})

export const sectionPatternSchema = z.object({
  section_type: z.string(),
  pattern_name: z.string(),
  source_site: z.string().optional(),
  source_url: z.string().optional(),
  tags: z.array(z.string()).optional(),
  why_it_works: z.string(),
  best_for: z.array(z.string()).optional(),
  not_for: z.array(z.string()).optional(),
  psychological_mechanism: z.string().optional(),
  content_slots: z.array(contentSlotSchema).optional(),
  design_specs: z
    .object({
      layout: z.string().optional(),
      min_height: z.string().optional(),
      padding: z.string().optional(),
      background: z.string().optional(),
      grid: z.string().optional(),
      responsive: z.string().optional(),
      animation: z.string().optional(),
    })
    .optional(),
  color_flexibility: z.string().optional(),
  industries: z.array(z.string()).optional(),
  audience: z.array(z.string()).optional(),
  design_style: z.array(z.string()).optional(),
  data_requirements: z.array(z.string()).optional(),
  quality_score: z.coerce.number().optional(),
  key_insight: z.string().catch('No key insight returned.'),
  _note: z.string().optional(),
})

export const analysisRequestSchema = z.object({
  analysisMode: z.enum(['site', 'section']),
  url: z.string().url().optional(),
  siteName: z.string().optional(),
  industry: z.string().optional(),
  notes: z.string().optional(),
  webSearch: z.boolean(),
  images: z
    .array(
      z.object({
        name: z.string(),
        mediaType: z.string(),
        base64: z.string().min(1),
      }),
    )
    .min(1)
    .max(8),
})

export const createLibraryEntrySchema = z.object({
  analysisMode: z.enum(['site', 'section']),
  result: z.union([siteReferenceSchema, sectionPatternSchema]),
})

export const sessionRequestSchema = z.object({
  password: z.string().min(1),
})

export const siteResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['site_name', 'key_insight'],
  properties: {
    site_name: { type: 'string' },
    url: { type: 'string' },
    industry: { type: 'string' },
    industries: { type: 'array', items: { type: 'string' } },
    design_style: { type: 'array', items: { type: 'string' } },
    audience: { type: 'array', items: { type: 'string' } },
    use_case_tags: { type: 'array', items: { type: 'string' } },
    positioning: { type: 'string' },
    business_context: { type: 'string' },
    locale: { type: 'string' },
    design_analysis: {
      type: 'object',
      additionalProperties: false,
      properties: {
        color_strategy: { type: 'string' },
        color_palette: { type: 'array', items: { type: 'string' } },
        typography_strategy: { type: 'string' },
        heading_font: { type: 'string' },
        body_font: { type: 'string' },
        whitespace_usage: { type: 'string' },
        imagery_approach: { type: 'string' },
        animation_approach: { type: 'string' },
        layout_philosophy: { type: 'string' },
        standout_detail: { type: 'string' },
      },
    },
    strategic_analysis: {
      type: 'object',
      additionalProperties: false,
      properties: {
        primary_goal: { type: 'string' },
        conversion_mechanism: { type: 'string' },
        trust_building: { type: 'array', items: { type: 'string' } },
        content_hierarchy: { type: 'array', items: { type: 'string' } },
        what_works: { type: 'array', items: { type: 'string' } },
        what_could_improve: { type: 'array', items: { type: 'string' } },
        conversion_path: { type: 'string' },
      },
    },
    sections_identified: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'name', 'why_it_works'],
        properties: {
          type: { type: 'string' },
          name: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          why_it_works: { type: 'string' },
          best_for: { type: 'array', items: { type: 'string' } },
          not_for: { type: 'array', items: { type: 'string' } },
          content_slots: {
            type: 'array',
            items: {
              anyOf: [
                { type: 'string' },
                {
                  type: 'object',
                  additionalProperties: false,
                  required: ['name', 'type', 'guidelines'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string' },
                    required: { type: 'boolean' },
                    guidelines: { type: 'string' },
                    example: { type: 'string' },
                  },
                },
              ],
            },
          },
          design_notes: { type: 'string' },
        },
      },
    },
    overall_score: { type: 'number' },
    best_for: { type: 'array', items: { type: 'string' } },
    key_insight: { type: 'string' },
  },
}

export const sectionResponseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['section_type', 'pattern_name', 'why_it_works', 'key_insight'],
  properties: {
    section_type: { type: 'string' },
    pattern_name: { type: 'string' },
    source_site: { type: 'string' },
    source_url: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    why_it_works: { type: 'string' },
    best_for: { type: 'array', items: { type: 'string' } },
    not_for: { type: 'array', items: { type: 'string' } },
    psychological_mechanism: { type: 'string' },
    content_slots: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'type', 'guidelines'],
        properties: {
          name: { type: 'string' },
          type: { type: 'string' },
          required: { type: 'boolean' },
          guidelines: { type: 'string' },
          example: { type: 'string' },
        },
      },
    },
    design_specs: {
      type: 'object',
      additionalProperties: false,
      properties: {
        layout: { type: 'string' },
        min_height: { type: 'string' },
        padding: { type: 'string' },
        background: { type: 'string' },
        grid: { type: 'string' },
        responsive: { type: 'string' },
        animation: { type: 'string' },
      },
    },
    color_flexibility: { type: 'string' },
    industries: { type: 'array', items: { type: 'string' } },
    audience: { type: 'array', items: { type: 'string' } },
    design_style: { type: 'array', items: { type: 'string' } },
    data_requirements: { type: 'array', items: { type: 'string' } },
    quality_score: { type: 'number' },
    key_insight: { type: 'string' },
  },
}
