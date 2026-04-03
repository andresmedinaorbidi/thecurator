export type AnalysisMode = 'site' | 'section'

export type AnalyzeImage = {
  name: string
  mediaType: string
  base64: string
}

export type AnalyzeRequest = {
  analysisMode: AnalysisMode
  url?: string
  siteName?: string
  industry?: string
  notes?: string
  webSearch: boolean
  images: AnalyzeImage[]
}

export type ContentSlot = {
  name: string
  type: string
  required?: boolean
  guidelines: string
  example?: string
}

export type SiteSection = {
  type: string
  name: string
  tags?: string[]
  why_it_works: string
  best_for?: string[]
  not_for?: string[]
  content_slots?: Array<string | ContentSlot>
  design_notes?: string
}

export type SiteReference = {
  site_name: string
  url?: string
  industry?: string
  industries?: string[]
  design_style?: string[]
  audience?: string[]
  use_case_tags?: string[]
  positioning?: string
  business_context?: string
  locale?: string
  design_analysis?: {
    color_strategy?: string
    color_palette?: string[]
    typography_strategy?: string
    heading_font?: string
    body_font?: string
    whitespace_usage?: string
    imagery_approach?: string
    animation_approach?: string
    layout_philosophy?: string
    standout_detail?: string
  }
  strategic_analysis?: {
    primary_goal?: string
    conversion_mechanism?: string
    trust_building?: string[]
    content_hierarchy?: string[]
    what_works?: string[]
    what_could_improve?: string[]
    conversion_path?: string
  }
  sections_identified?: SiteSection[]
  overall_score?: number
  best_for?: string[]
  key_insight?: string
  _note?: string
}

export type SectionPattern = {
  section_type: string
  pattern_name: string
  source_site?: string
  source_url?: string
  tags?: string[]
  why_it_works: string
  best_for?: string[]
  not_for?: string[]
  psychological_mechanism?: string
  content_slots?: ContentSlot[]
  design_specs?: {
    layout?: string
    min_height?: string
    padding?: string
    background?: string
    grid?: string
    responsive?: string
    animation?: string
  }
  color_flexibility?: string
  industries?: string[]
  audience?: string[]
  design_style?: string[]
  data_requirements?: string[]
  quality_score?: number
  key_insight?: string
  _note?: string
}

export type AnalysisResult = SiteReference | SectionPattern

export type AnalyzeResponse = {
  result: AnalysisResult
  grounded?: boolean
}

export type CreateLibraryEntryRequest = {
  analysisMode: AnalysisMode
  result: AnalysisResult
}

export type LibraryEntry = {
  id: string
  createdAt: string
  analysisMode: AnalysisMode
  payload: AnalysisResult
}

export type SessionResponse = {
  authenticated: boolean
}
