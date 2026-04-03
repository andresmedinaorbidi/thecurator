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
  if (!result) return '—'
  return 'overall_score' in result ? result.overall_score ?? '—' : ('quality_score' in result ? result.quality_score ?? '—' : '—')
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
  if (field === 'industries') {
    return result.industries || []
  }

  if (field === 'design_style') {
    return result.design_style || []
  }

  if (field === 'audience') {
    return result.audience || []
  }

  return 'use_case_tags' in result ? result.use_case_tags || [] : []
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
    if (showExport === 'all') {
      return JSON.stringify(saved.map((entry) => entry.payload), null, 2)
    }

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
      if (!('sections_identified' in previous) || !previous.sections_identified) {
        return previous
      }

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
          <div className="eyebrow">ATLAS Curator</div>
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
              {sessionState === 'loading'
                ? 'Checking session...'
                : loggingIn
                  ? 'Signing in...'
                  : 'Enter workspace'}
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
                <button className="ghost-button" onClick={() => setShowExport(null)}>
                  ×
                </button>
              </div>
              <textarea className="export-box" onFocus={(event) => event.target.select()} readOnly value={exportValue} />
            </div>
          </div>
        ) : null}

        <div className="row between top">
          <div>
            <div className="eyebrow">ATLAS Curator</div>
            <h1>Reference Library Builder</h1>
          </div>
          <div className="row wrap">
            {saved.length > 0 ? (
              <>
                <button className="secondary-button" onClick={() => setStep('library')}>
                  {loadingLibrary ? 'Loading...' : `${saved.length} in library`}
                </button>
                <button className="secondary-button" onClick={() => setShowExport('all')}>
                  Export all
                </button>
              </>
            ) : null}
            <button className="secondary-button" onClick={() => void handleLogout()}>
              Log out
            </button>
          </div>
        </div>

        {error ? <div className="error">{error}</div> : null}

        {step === 'input' ? (
          <div className="stack">
            <div className="mode-toggle">
              <button
                className={analysisMode === 'site' ? 'active' : ''}
                onClick={() => setAnalysisMode('site')}
              >
                Full Site Analysis
              </button>
              <button
                className={analysisMode === 'section' ? 'active' : ''}
                onClick={() => setAnalysisMode('section')}
              >
                Section Pattern
              </button>
            </div>

            <div>
              <label className="label">Screenshots *</label>
              <button className="upload-zone" onClick={() => fileRef.current?.click()}>
                {images.length === 0 ? (
                  <div className="stack tight">
                    <strong>Upload screenshots</strong>
                    <span>
                      {analysisMode === 'site'
                        ? 'Use full-page captures for the clearest analysis.'
                        : 'Use a focused section screenshot.'}
                    </span>
                  </div>
                ) : (
                  <div className="image-grid">
                    {images.map((image, index) => (
                      <div className="image-card" key={`${image.name}-${index}`}>
                        <img alt="" src={image.preview} />
                        <span>{image.sizeKB}KB</span>
                        <button
                          className="ghost-button image-remove"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeImage(index)
                          }}
                        >
                          ×
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

            <button className={`toggle-card ${webSearch ? 'active' : ''}`} onClick={() => setWebSearch((previous) => !previous)}>
              <strong>Google Search grounding {webSearch ? 'ON' : 'OFF'}</strong>
              <span>
                {webSearch
                  ? 'Gemini can enrich its analysis with live web context.'
                  : 'Analysis uses screenshots only.'}
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
                <label className="label">Notes</label>
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="What stands out or feels worth stealing?" />
              </div>
            </div>

            <button className="primary-button" disabled={images.length === 0 || analyzing} onClick={() => void analyze()}>
              {analyzing ? 'Analyzing with Gemini...' : 'Analyze'}
            </button>
          </div>
        ) : null}

        {step === 'result' && result ? (
          <div className="stack">
            <div className="row wrap">
              <button className="secondary-button" onClick={reset}>
                New
              </button>
              <button className="secondary-button" onClick={() => setShowExport('single')}>
                JSON
              </button>
              <button className="secondary-button" onClick={() => setEditMode((previous) => !previous)}>
                {editMode ? 'Done editing' : 'Edit tags'}
              </button>
              <button className="primary-button push" disabled={savingEntry} onClick={() => void saveToLibrary()}>
                {savingEntry ? 'Saving...' : 'Save to library'}
              </button>
            </div>

            <div className="panel">
              <div className="row between top">
                <div>
                  <h2>{getResultTitle(result) || 'Analysis'}</h2>
                  <p className="muted">{getResultUrl(result)}</p>
                </div>
                <div className="score">
                  <strong>{currentScore}</strong>
                  <span>Score</span>
                </div>
              </div>
              <div className="tag-cloud">
                {'industry' in result && result.industry ? <span className="tag">{result.industry}</span> : null}
                {'positioning' in result && result.positioning ? <span className="tag">{result.positioning}</span> : null}
                {'locale' in result && result.locale ? <span className="tag">{result.locale}</span> : null}
                {(result.design_style || []).map((value) => (
                  <span className="tag" key={value}>
                    {value}
                  </span>
                ))}
                {(result.audience || []).map((value) => (
                  <span className="tag" key={value}>
                    {value}
                  </span>
                ))}
                {'use_case_tags' in result
                  ? result.use_case_tags?.map((value) => (
                      <span className="tag" key={value}>
                        {value}
                      </span>
                    ))
                  : null}
              </div>
            </div>

            {editMode ? (
              <div className="panel stack">
                <div className="grid two">
                  <div>
                    <label className="label">Site Name</label>
                    <input value={'site_name' in result ? result.site_name || '' : ''} onChange={(event) => updateField('site_name', event.target.value)} />
                  </div>
                  <div>
                    <label className="label">Positioning</label>
                    <input value={'positioning' in result ? result.positioning || '' : ''} onChange={(event) => updateField('positioning', event.target.value)} />
                  </div>
                </div>
                {[
                  { label: 'Industries', field: 'industries' as const, options: INDUSTRIES },
                  { label: 'Design Style', field: 'design_style' as const, options: DESIGN_STYLES },
                  { label: 'Audience', field: 'audience' as const, options: AUDIENCES },
                  { label: 'Use Case', field: 'use_case_tags' as const, options: USE_CASE_TAGS },
                ].map((group) => (
                  <div className="stack tight" key={group.field}>
                    <span className="label">{group.label}</span>
                    <div className="tag-cloud">
                      {group.options.map((tag) => {
                        const active = getEditableTags(result, group.field).includes(tag)
                        return (
                          <button
                            className={`tag-button ${active ? 'active' : ''}`}
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
                        <strong>{section.type} — {section.name}</strong>
                        <div className="tag-cloud">
                          {SECTION_TAGS.map((tag) => {
                            const active = (section.tags || []).includes(tag)
                            return (
                              <button
                                className={`tag-button ${active ? 'active' : ''}`}
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
            <div className="row wrap">
              <button className="secondary-button" onClick={reset}>
                New analysis
              </button>
              <button className="secondary-button" onClick={() => setShowExport('all')}>
                Export all ({saved.length})
              </button>
              <button className="secondary-button" disabled={libraryBusy || saved.length === 0} onClick={() => void clearLibrary()}>
                Clear all
              </button>
            </div>
            {saved.map((entry) => {
              const payload = entry.payload
              const score = getResultScore(payload)

              return (
                <div className="panel" key={entry.id}>
                  <div className="row between top">
                    <div className="stack tight">
                      <span className="tag">{entry.analysisMode}</span>
                      <h3>{getResultTitle(payload) || 'Entry'}</h3>
                      <p className="muted">{getResultUrl(payload) || 'No URL'}</p>
                      {'key_insight' in payload && payload.key_insight ? <p>{payload.key_insight}</p> : null}
                    </div>
                    <div className="score">
                      <strong>{score}</strong>
                      <span>Score</span>
                    </div>
                  </div>
                  <div className="row wrap">
                    <button className="secondary-button" onClick={() => openEntry(entry)}>
                      View
                    </button>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setResult(payload)
                        setShowExport('single')
                      }}
                    >
                      Copy JSON
                    </button>
                    <button className="secondary-button push" disabled={libraryBusy} onClick={() => void removeEntry(entry.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : null}

        {step === 'saved' ? (
          <div className="panel center stack">
            <div className="saved-mark">✓</div>
            <h2>Saved to library</h2>
            <p className="muted">
              {saved.length} {saved.length === 1 ? 'entry' : 'entries'} in your library.
            </p>
            <div className="row center wrap">
              <button className="primary-button" onClick={reset}>
                Analyze another
              </button>
              <button className="secondary-button" onClick={() => setShowExport('all')}>
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
  return (
    <div className="panel stack tight">
      <div className="eyebrow">{title}</div>
      {entries.map(([key, value]) => (
        <div key={key}>
          <strong>{key.replaceAll('_', ' ')}</strong>
          <pre>{Array.isArray(value) ? value.join(', ') : JSON.stringify(value, null, 2)}</pre>
        </div>
      ))}
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
      <div className="eyebrow">Sections</div>
      {sections.map((section, index) => (
        <div className="section-editor" key={`${section.name}-${index}`}>
          <strong>{section.type} — {section.name}</strong>
          <p>{section.why_it_works}</p>
          <div className="tag-cloud">
            {(section.tags || []).map((tag) => (
              <span className="tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
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
      <div className="eyebrow">Content Slots</div>
      {slots.map((slot: ContentSlot, index: number) => (
        <div className="section-editor" key={`${slot.name}-${index}`}>
          <strong>{slot.name}</strong>
          <p>{slot.guidelines}</p>
          <span className="tag">{slot.type}</span>
        </div>
      ))}
    </div>
  )
}

export default App
