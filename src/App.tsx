import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import {
  AUDIENCES,
  DESIGN_STYLES,
  INDUSTRIES,
  SECTION_TAGS,
  USE_CASE_TAGS,
} from '../shared/constants'
import type {
  AnalysisMode,
  AnalysisResult,
  AnalyzeRequest,
  ContentSlot,
  LibraryEntry,
} from '../shared/types'
import {
  analyzeSite,
  clearLibraryEntries,
  createLibraryEntry,
  deleteLibraryEntry,
  getLibraryEntries,
  getSession,
  login,
  logout,
} from './lib/api'
import { resizeImageFile } from './lib/image'

type Step = 'input' | 'result' | 'library' | 'saved'
type SessionState = 'loading' | 'authenticated' | 'unauthenticated'

type UploadImage = {
  name: string
  base64: string
  preview: string
  mediaType: string
  sizeKB: number
}

function getResultScore(result: AnalysisResult | null) {
  if (!result) return '--'
  return 'overall_score' in result ? result.overall_score ?? '--' : ('quality_score' in result ? result.quality_score ?? '--' : '--')
}

function getResultTitle(result: AnalysisResult) {
  return 'site_name' in result ? result.site_name : result.pattern_name
}

function getResultUrl(result: AnalysisResult) {
  return 'url' in result ? result.url || '' : ('source_url' in result ? result.source_url || '' : '')
}

function getEditableTags(
  result: AnalysisResult,
  field: 'industries' | 'design_style' | 'audience' | 'use_case_tags',
) {
  if (field === 'industries') return result.industries || []
  if (field === 'design_style') return result.design_style || []
  if (field === 'audience') return result.audience || []
  return 'use_case_tags' in result ? result.use_case_tags || [] : []
}

function getScoreTone(score: string | number) {
  const numericScore = typeof score === 'number' ? score : Number(score)
  if (Number.isNaN(numericScore)) return 'neutral'
  return numericScore >= 8 ? 'high' : 'warm'
}

function App() {
  const [sessionState, setSessionState] = useState<SessionState>('loading')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [loggingIn, setLoggingIn] = useState(false)

  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [siteName, setSiteName] = useState('')
  const [industry, setIndustry] = useState('')
  const [notes, setNotes] = useState('')
  const [images, setImages] = useState<UploadImage[]>([])
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('site')
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<LibraryEntry[]>([])
  const [loadingLibrary, setLoadingLibrary] = useState(true)
  const [savingEntry, setSavingEntry] = useState(false)
  const [libraryBusy, setLibraryBusy] = useState(false)
  const [webSearch, setWebSearch] = useState(true)
  const [showExport, setShowExport] = useState<'all' | 'single' | null>(null)
  const [editMode, setEditMode] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    void bootstrap()
  }, [])

  async function bootstrap() {
    try {
      const session = await getSession()
      setSessionState(session.authenticated ? 'authenticated' : 'unauthenticated')
      if (session.authenticated) {
        await loadLibrary()
      } else {
        setLoadingLibrary(false)
      }
    } catch {
      setSessionState('unauthenticated')
      setLoadingLibrary(false)
    }
  }

  async function loadLibrary() {
    setLoadingLibrary(true)
    try {
      setSaved(await getLibraryEntries())
    } catch (err) {
      handleAuthAwareError(err, 'Failed to load library.')
    } finally {
      setLoadingLibrary(false)
    }
  }

  function handleAuthAwareError(err: unknown, fallback: string) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      setSessionState('unauthenticated')
      setAuthError('Your session expired. Please sign in again.')
      return
    }

    setError(err instanceof Error ? err.message : fallback)
  }

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoggingIn(true)
    setAuthError(null)

    try {
      await login(password)
      setPassword('')
      setSessionState('authenticated')
      await loadLibrary()
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setLoggingIn(false)
    }
  }

  async function handleLogout() {
    await logout()
    setSessionState('unauthenticated')
    setSaved([])
    setResult(null)
    setStep('input')
  }

  const exportValue = useMemo(() => {
    if (showExport === 'all') return JSON.stringify(saved.map((entry) => entry.payload), null, 2)
    return JSON.stringify(result, null, 2)
  }, [result, saved, showExport])

  const currentScore = useMemo(() => getResultScore(result), [result])

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    try {
      const next = await Promise.all(files.map((file) => resizeImageFile(file)))
      setImages((prev) => [...prev, ...next])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process screenshots.')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, current) => current !== index))
  }

  async function analyze() {
    setAnalyzing(true)
    setError(null)

    const payload: AnalyzeRequest = {
      analysisMode,
      url: url || undefined,
      siteName: siteName || undefined,
      industry: industry || undefined,
      notes: notes || undefined,
      webSearch,
      images: images.map((image) => ({
        name: image.name,
        mediaType: image.mediaType,
        base64: image.base64,
      })),
    }

    try {
      const response = await analyzeSite(payload)
      setResult(response.result)
      setEditMode(false)
      setStep('result')
    } catch (err) {
      handleAuthAwareError(err, 'Analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  function updateResult(updater: (previous: AnalysisResult) => AnalysisResult) {
    setResult((previous) => (previous ? updater(previous) : previous))
  }

  function toggleTag(
    field: 'industries' | 'design_style' | 'audience' | 'use_case_tags',
    tag: string,
  ) {
    updateResult((previous) => {
      const currentValues = getEditableTags(previous, field)
      const hasTag = currentValues.includes(tag)
      return {
        ...previous,
        [field]: hasTag
          ? currentValues.filter((value: string) => value !== tag)
          : [...currentValues, tag],
      }
    })
  }

  function toggleSectionTag(sectionIndex: number, tag: string) {
    updateResult((previous) => {
      if (!('sections_identified' in previous) || !previous.sections_identified) return previous

      const sections = [...previous.sections_identified]
      const section = { ...sections[sectionIndex] }
      const tags = section.tags || []
      section.tags = tags.includes(tag)
        ? tags.filter((value) => value !== tag)
        : [...tags, tag]
      sections[sectionIndex] = section
      return { ...previous, sections_identified: sections }
    })
  }

  function updateField(field: string, value: string | number) {
    updateResult((previous) => ({ ...previous, [field]: value }))
  }

  async function saveToLibrary() {
    if (!result) return

    setSavingEntry(true)
    try {
      const entry = await createLibraryEntry({ analysisMode, result })
      setSaved((previous) => [entry, ...previous])
      setStep('saved')
    } catch (err) {
      handleAuthAwareError(err, 'Failed to save entry.')
    } finally {
      setSavingEntry(false)
    }
  }

  function reset() {
    setStep('input')
    setUrl('')
    setSiteName('')
    setIndustry('')
    setNotes('')
    setImages([])
    setResult(null)
    setError(null)
    setEditMode(false)
  }

  async function removeEntry(id: string) {
    setLibraryBusy(true)
    try {
      await deleteLibraryEntry(id)
      setSaved((previous) => previous.filter((entry) => entry.id !== id))
    } catch (err) {
      handleAuthAwareError(err, 'Failed to remove entry.')
    } finally {
      setLibraryBusy(false)
    }
  }

  async function clearLibrary() {
    if (!window.confirm('Clear entire library? This cannot be undone.')) return

    setLibraryBusy(true)
    try {
      await clearLibraryEntries()
      setSaved([])
    } catch (err) {
      handleAuthAwareError(err, 'Failed to clear library.')
    } finally {
      setLibraryBusy(false)
    }
  }

  function openEntry(entry: LibraryEntry) {
    setResult(entry.payload)
    setEditMode(false)
    setStep('result')
  }

  if (sessionState !== 'authenticated') {
    return (
      <div className="shell">
        <div className="login-card">
          <div className="brand-row">
            <span className="brand-dot" aria-hidden="true" />
            <div className="eyebrow">ATLAS Curator</div>
          </div>
          <h1>Private reference library builder</h1>
          <p>
            Analyze website screenshots with Gemini, curate structured references,
            and persist the library in Neon.
          </p>
          <form className="stack" onSubmit={handleLogin}>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Shared password"
            />
            {authError ? <div className="error">{authError}</div> : null}
            <button className="primary-button" disabled={!password.trim() || loggingIn}>
              {sessionState === 'loading' ? 'Checking session...' : loggingIn ? 'Signing in...' : 'Enter workspace'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="shell">
      <div className="container">
        {showExport ? (
          <div className="overlay" onClick={() => setShowExport(null)}>
            <div className="modal" onClick={(event) => event.stopPropagation()}>
              <div className="row between">
                <h3>{showExport === 'all' ? 'Export Library' : 'Export Entry'}</h3>
                <button className="modal-close" onClick={() => setShowExport(null)} type="button">
                  x
                </button>
              </div>
              <p className="export-hint">Select all and copy.</p>
              <textarea className="export-box" onFocus={(event) => event.target.select()} readOnly value={exportValue} />
            </div>
          </div>
        ) : null}

        <div className="row between top header-row">
          <div>
            <div className="brand-row">
              <span className="brand-dot" aria-hidden="true" />
              <div className="eyebrow">ATLAS Curator</div>
            </div>
            <h1>Reference Library Builder</h1>
          </div>
          <div className="row wrap">
            {saved.length > 0 ? (
              <>
                <button className="secondary-button library-pill" onClick={() => setStep('library')}>
                  {loadingLibrary ? 'Loading...' : `${saved.length} in library`}
                </button>
                <button className="secondary-button subtle-button" onClick={() => setShowExport('all')}>
                  Export all
                </button>
              </>
            ) : null}
            <button className="secondary-button subtle-button" onClick={() => void handleLogout()}>
              Log out
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}

        {step === 'input' ? (
          <div className="stack">
            <div className="mode-toggle">
              <button className={analysisMode === 'site' ? 'active' : ''} onClick={() => setAnalysisMode('site')} type="button">
                <strong>Full Site Analysis</strong>
                <span>Analyze entire website</span>
              </button>
              <button className={analysisMode === 'section' ? 'active' : ''} onClick={() => setAnalysisMode('section')} type="button">
                <strong>Section Pattern</strong>
                <span>Analyze specific section</span>
              </button>
            </div>

            <div>
              <label className="label">Screenshots *</label>
              <button className={`upload-zone ${images.length === 0 ? 'empty' : 'filled'}`} onClick={() => fileRef.current?.click()} type="button">
                {images.length === 0 ? (
                  <div className="stack tight">
                    <span className="upload-icon" aria-hidden="true">[]</span>
                    <strong>Upload screenshots</strong>
                    <span>{analysisMode === 'site' ? 'Full page screenshots' : 'Screenshot of the specific section'}</span>
                  </div>
                ) : (
                  <div className="image-grid">
                    {images.map((image, index) => (
                      <div className="image-card" key={`${image.name}-${index}`}>
                        <img alt="" src={image.preview} />
                        <span className={image.sizeKB > 1500 ? 'size-bad' : 'size-good'}>{image.sizeKB}KB</span>
                        <button
                          className="image-remove"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeImage(index)
                          }}
                          type="button"
                        >
                          x
                        </button>
                      </div>
                    ))}
                    <div className="image-add">+</div>
                  </div>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(event) => void handleImageUpload(event)}
                hidden
              />
            </div>

            <div className="grid two">
              <div>
                <label className="label">Site Name</label>
                <input value={siteName} onChange={(event) => setSiteName(event.target.value)} placeholder="e.g. Sincro Barcelona" />
              </div>
              <div>
                <label className="label">URL</label>
                <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://..." />
              </div>
            </div>

            <button className={`toggle-card ${webSearch ? 'active' : ''}`} onClick={() => setWebSearch((previous) => !previous)} type="button">
              <span className="toggle-switch" aria-hidden="true">
                <span className="toggle-knob" />
              </span>
              <span className="toggle-copy">
                <strong>Google Search grounding {webSearch ? 'ON' : 'OFF'}</strong>
                <span>
                  {webSearch ? 'Gemini can enrich its analysis with live web context.' : 'Analysis uses screenshots only.'}
                </span>
              </span>
            </button>

            <div className="grid two">
              <div>
                <label className="label">Industry</label>
                <select value={industry} onChange={(event) => setIndustry(event.target.value)}>
                  <option value="">Auto-detect</option>
                  {INDUSTRIES.map((value) => (
                    <option key={value} value={value}>
                      {value.replaceAll('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Analysis Mode</label>
                <div className="mode-summary">
                  {analysisMode === 'site' ? 'Full Site -> SiteReference' : 'Section -> SectionPattern'}
                </div>
              </div>
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="What stands out or feels worth stealing?" />
            </div>

            <button className="primary-button" disabled={images.length === 0 || analyzing} onClick={() => void analyze()}>
              {analyzing ? 'Analyzing with Gemini...' : 'Analyze'}
            </button>
          </div>
        ) : null}

        {step === 'result' && result ? (
          <div className="stack">
            <div className="row wrap toolbar-row">
              <button className="secondary-button subtle-button" onClick={reset}>
                New
              </button>
              <button className="secondary-button subtle-button" onClick={() => setShowExport('single')}>
                JSON
              </button>
              <button className={`secondary-button subtle-button ${editMode ? 'edit-active' : ''}`} onClick={() => setEditMode((previous) => !previous)}>
                {editMode ? 'Done editing' : 'Edit tags'}
              </button>
              <button className="primary-button push" disabled={savingEntry} onClick={() => void saveToLibrary()}>
                {savingEntry ? 'Saving...' : 'Save to library'}
              </button>
            </div>

            <div className="panel result-card">
              <div className="row between top">
                <div>
                  <h2>{getResultTitle(result) || 'Analysis'}</h2>
                  <p className="muted">{getResultUrl(result)}</p>
                </div>
                <div className={`score score-${getScoreTone(currentScore)}`}>
                  <strong>{currentScore}</strong>
                  <span>Score</span>
                </div>
              </div>
              <div className="tag-cloud">
                {'industry' in result && result.industry ? <span className="tag tag-accent">{result.industry}</span> : null}
                {'positioning' in result && result.positioning ? <span className="tag tag-indigo">{result.positioning}</span> : null}
                {'locale' in result && result.locale ? <span className="tag tag-muted">{result.locale}</span> : null}
                {(result.design_style || []).map((value) => (
                  <span className="tag tag-violet" key={value}>
                    {value}
                  </span>
                ))}
                {(result.audience || []).map((value) => (
                  <span className="tag tag-green" key={value}>
                    {value}
                  </span>
                ))}
                {'use_case_tags' in result
                  ? result.use_case_tags?.map((value) => (
                      <span className="tag tag-blue" key={value}>
                        {value}
                      </span>
                    ))
                  : null}
              </div>
            </div>

            {editMode ? (
              <div className="panel stack edit-panel">
                <div className="edit-title">Edit Classification Tags</div>
                <div className="grid two">
                  <div>
                    <label className="label">Site Name</label>
                    <input value={'site_name' in result ? result.site_name || '' : ''} onChange={(event) => updateField('site_name', event.target.value)} />
                  </div>
                  <div>
                    <label className="label">Positioning</label>
                    <input value={'positioning' in result ? result.positioning || '' : ''} onChange={(event) => updateField('positioning', event.target.value)} />
                  </div>
                  <div>
                    <label className="label">Score</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.5"
                      value={currentScore === '--' ? '' : currentScore}
                      onChange={(event) => updateField('overall_score', Number(event.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <label className="label">Locale</label>
                    <input value={'locale' in result ? result.locale || '' : ''} onChange={(event) => updateField('locale', event.target.value)} />
                  </div>
                </div>
                {[
                  { label: 'Industries', field: 'industries' as const, options: INDUSTRIES, tone: 'accent' },
                  { label: 'Design Style', field: 'design_style' as const, options: DESIGN_STYLES, tone: 'violet' },
                  { label: 'Audience', field: 'audience' as const, options: AUDIENCES, tone: 'green' },
                  { label: 'Use Case', field: 'use_case_tags' as const, options: USE_CASE_TAGS, tone: 'blue' },
                ].map((group) => (
                  <div className="stack tight" key={group.field}>
                    <span className={`label tone-${group.tone}`}>{group.label}</span>
                    <div className="tag-cloud">
                      {group.options.map((tag) => {
                        const active = getEditableTags(result, group.field).includes(tag)
                        return (
                          <button
                            className={`tag-button tone-${group.tone} ${active ? 'active' : ''}`}
                            key={tag}
                            onClick={() => toggleTag(group.field, tag)}
                            type="button"
                          >
                            {tag}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {'sections_identified' in result && result.sections_identified?.length ? (
                  <div className="stack tight">
                    <span className="label">Section Tags</span>
                    {result.sections_identified.map((section, sectionIndex) => (
                      <div className="section-editor" key={`${section.name}-${sectionIndex}`}>
                        <strong><span className="section-type">{section.type}</span> - {section.name}</strong>
                        <div className="tag-cloud">
                          {SECTION_TAGS.map((tag) => {
                            const active = (section.tags || []).includes(tag)
                            return (
                              <button
                                className={`tag-button tone-violet compact ${active ? 'active' : ''}`}
                                key={tag}
                                onClick={() => toggleSectionTag(sectionIndex, tag)}
                                type="button"
                              >
                                {tag}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {'key_insight' in result && result.key_insight ? (
              <div className="panel insight">
                <div className="eyebrow">Key Insight</div>
                <p>{result.key_insight}</p>
              </div>
            ) : null}

            {'design_analysis' in result && result.design_analysis ? (
              <DetailPanel title="Design Analysis" entries={Object.entries(result.design_analysis)} />
            ) : null}
            {'strategic_analysis' in result && result.strategic_analysis ? (
              <DetailPanel title="Strategic Analysis" entries={Object.entries(result.strategic_analysis)} />
            ) : null}
            {'sections_identified' in result && result.sections_identified?.length ? (
              <SectionsPanel sections={result.sections_identified} />
            ) : null}
            {'content_slots' in result && result.content_slots?.length ? (
              <SlotsPanel slots={result.content_slots} />
            ) : null}
          </div>
        ) : null}

        {step === 'library' ? (
          <div className="stack">
            <div className="row wrap toolbar-row">
              <button className="secondary-button subtle-button" onClick={reset}>
                New analysis
              </button>
              <button className="primary-button push" onClick={() => setShowExport('all')}>
                Export all ({saved.length})
              </button>
              <button className="secondary-button danger-button" disabled={libraryBusy || saved.length === 0} onClick={() => void clearLibrary()}>
                Clear all
              </button>
            </div>
            {saved.map((entry) => {
              const payload = entry.payload
              const score = getResultScore(payload)

              return (
                <div className="panel library-card" key={entry.id}>
                  <div className="row between top">
                    <div className="stack tight">
                      <span className="tag tag-accent compact-tag">{entry.analysisMode}</span>
                      <h3>{getResultTitle(payload) || 'Entry'}</h3>
                      <p className="muted">{getResultUrl(payload) || 'No URL'}</p>
                      {'key_insight' in payload && payload.key_insight ? <p className="section-copy">{payload.key_insight}</p> : null}
                    </div>
                    <div className={`score score-${getScoreTone(score)}`}>
                      <strong>{score}</strong>
                    </div>
                  </div>
                  <div className="row wrap">
                    <button className="secondary-button subtle-button" onClick={() => openEntry(entry)}>
                      View
                    </button>
                    <button
                      className="secondary-button subtle-button"
                      onClick={() => {
                        setResult(payload)
                        setShowExport('single')
                      }}
                    >
                      Copy JSON
                    </button>
                    <button className="secondary-button danger-button push" disabled={libraryBusy} onClick={() => void removeEntry(entry.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {step === 'saved' ? (
          <div className="panel center stack saved-panel">
            <div className="saved-mark">OK</div>
            <h2>Saved to library</h2>
            <p className="muted">
              {saved.length} {saved.length === 1 ? 'entry' : 'entries'} in your library.
            </p>
            <div className="row center wrap">
              <button className="primary-button" onClick={reset}>
                Analyze another
              </button>
              <button className="secondary-button subtle-button" onClick={() => setShowExport('all')}>
                Export all
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function DetailPanel({ title, entries }: { title: string; entries: [string, unknown][] }) {
  const isDesignAnalysis = title === 'Design Analysis'
  const colorPalette = isDesignAnalysis
    ? entries.find(([key]) => key === 'color_palette')?.[1]
    : null
  const visibleEntries = isDesignAnalysis
    ? entries.filter(([key]) => key !== 'color_palette')
    : entries

  return (
    <div className="panel stack tight analysis-panel">
      <div className="eyebrow">{title}</div>
      {visibleEntries.map(([key, value]) => (
        <div className="analysis-entry" key={key}>
          <strong>{key.replaceAll('_', ' ')}</strong>
          {Array.isArray(value) ? (
            <div className="analysis-list">
              {value.map((item, index) => (
                <div className="analysis-list-item" key={`${key}-${index}`}>
                  <span className="analysis-bullet" aria-hidden="true">
                    {title === 'Strategic Analysis' && key === 'what_could_improve' ? '!' : '+'}
                  </span>
                  <span>{String(item)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="analysis-copy">{String(value)}</p>
          )}
        </div>
      ))}
      {Array.isArray(colorPalette) && colorPalette.length > 0 ? (
        <div className="analysis-entry">
          <strong>color palette</strong>
          <div className="palette-row">
            {colorPalette.map((color) => (
              <div className="palette-chip" key={String(color)}>
                <span className="palette-swatch" style={{ background: String(color) }} />
                <span>{String(color)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SectionsPanel({
  sections,
}: {
  sections: NonNullable<Extract<AnalysisResult, { sections_identified?: unknown }>['sections_identified']>
}) {
  return (
    <div className="panel stack tight">
      <div className="eyebrow">Sections ({sections.length})</div>
      {sections.map((section, index) => (
        <div className="section-editor" key={`${section.name}-${index}`}>
          <strong><span className="tag tag-accent compact-tag">{section.type}</span>{section.name}</strong>
          <p className="section-copy">{section.why_it_works}</p>
          <div className="tag-cloud">
            {(section.tags || []).map((tag) => (
              <span className="tag tag-violet" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          {'content_slots' in section && section.content_slots?.length ? (
            <p className="section-meta">
              Slots:{' '}
              {section.content_slots
                .map((slot) => (typeof slot === 'string' ? slot : slot.name || 'slot'))
                .join(', ')}
            </p>
          ) : null}
          {'design_notes' in section && section.design_notes ? (
            <p className="section-meta">{section.design_notes}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function SlotsPanel({
  slots,
}: {
  slots: NonNullable<Extract<AnalysisResult, { content_slots?: unknown }>['content_slots']>
}) {
  return (
    <div className="panel stack tight">
      <div className="eyebrow">Content Slots ({slots.length})</div>
      {slots.map((slot: ContentSlot, index: number) => (
        <div className="section-editor" key={`${slot.name}-${index}`}>
          <strong>{slot.name}</strong>
          <div className="slot-badges">
            <span className="tag tag-muted">{slot.type}</span>
            {slot.required ? <span className="tag tag-danger">required</span> : null}
          </div>
          <p className="section-copy">{slot.guidelines}</p>
          {slot.example ? <p className="slot-example">Example: "{slot.example}"</p> : null}
        </div>
      ))}
    </div>
  )
}

export default App
