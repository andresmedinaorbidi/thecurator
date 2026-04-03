import { neon } from '@neondatabase/serverless'
import type { AnalysisMode, AnalysisResult, LibraryEntry } from '../../shared/types'

let sqlClient: ReturnType<typeof neon> | null = null

function getClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL environment variable.')
  }

  sqlClient ??= neon(process.env.DATABASE_URL)
  return sqlClient
}

type LibraryRow = {
  id: string
  created_at: string
  analysis_mode: AnalysisMode
  payload: AnalysisResult
}

function mapRow(row: LibraryRow): LibraryEntry {
  return {
    id: row.id,
    createdAt: row.created_at,
    analysisMode: row.analysis_mode,
    payload: row.payload,
  }
}

export async function listEntries(): Promise<LibraryEntry[]> {
  const sql = getClient()
  const rows = (await sql`
    SELECT id, created_at, analysis_mode, payload
    FROM library_entries
    ORDER BY created_at DESC
  `) as LibraryRow[]

  return rows.map(mapRow)
}

export async function insertEntry({
  analysisMode,
  result,
}: {
  analysisMode: AnalysisMode
  result: AnalysisResult
}) {
  const sql = getClient()
  const siteName =
    'site_name' in result ? result.site_name : result.pattern_name || result.source_site || null
  const url = 'url' in result ? result.url || null : ('source_url' in result ? result.source_url || null : null)
  const industry =
    'industry' in result ? result.industry || null : result.industries?.[0] || null
  const score =
    'overall_score' in result
      ? result.overall_score || null
      : ('quality_score' in result ? result.quality_score || null : null)

  const rows = (await sql`
    INSERT INTO library_entries (analysis_mode, site_name, url, industry, score, payload)
    VALUES (${analysisMode}, ${siteName}, ${url}, ${industry}, ${score}, ${JSON.stringify(result)}::jsonb)
    RETURNING id, created_at, analysis_mode, payload
  `) as LibraryRow[]

  return mapRow(rows[0])
}

export async function deleteEntry(id: string) {
  const sql = getClient()
  await sql`DELETE FROM library_entries WHERE id = ${id}`
}

export async function clearEntries() {
  const sql = getClient()
  await sql`TRUNCATE TABLE library_entries`
}
