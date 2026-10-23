import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { scoreResume } from '../api/client'
import type { MatchResult } from '../api/types'
import { type ScoreStatus, ScoreWorkspaceContext } from './workspace'

const JD_KEY = 'jobmatcher.draft.jobDescription'
const RESUME_KEY = 'jobmatcher.draft.resume'

function readDraft(key: string): string {
  try {
    return localStorage.getItem(key) ?? ''
  } catch {
    return ''
  }
}

function writeDraft(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value)
    else localStorage.removeItem(key)
  } catch {
    // Storage unavailable; drafts just won't survive a reload.
  }
}

/**
 * Holds the Score page's inputs and the scoring request above the router, so switching
 * pages mid-score neither loses the text nor cancels the request.
 */
export default function ScoreWorkspaceProvider({ children }: { children: ReactNode }) {
  const [jobDescription, setJobDescription] = useState(() => readDraft(JD_KEY))
  const [resume, setResume] = useState(() => readDraft(RESUME_KEY))
  const [status, setStatus] = useState<ScoreStatus>('idle')
  const [result, setResult] = useState<MatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => writeDraft(JD_KEY, jobDescription), [jobDescription])
  useEffect(() => writeDraft(RESUME_KEY, resume), [resume])
  useEffect(() => () => abortRef.current?.abort(), [])

  const score = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setStatus('running')
    setError(null)
    setStartedAt(Date.now())

    scoreResume({ job_description: jobDescription, resume }, controller.signal)
      .then((match) => {
        setResult(match)
        setStatus('success')
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        setError(err instanceof Error ? err.message : 'Scoring failed.')
        setStatus('error')
      })
      .finally(() => {
        if (abortRef.current === controller) abortRef.current = null
        setStartedAt(null)
      })
  }, [jobDescription, resume])

  const cancel = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStartedAt(null)
    // Keep showing the previous result, if any.
    setStatus((current) => (current === 'running' ? (result ? 'success' : 'idle') : current))
  }, [result])

  const reset = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setJobDescription('')
    setResume('')
    setResult(null)
    setError(null)
    setStatus('idle')
    setStartedAt(null)
  }, [])

  const value = useMemo(
    () => ({
      jobDescription,
      setJobDescription,
      resume,
      setResume,
      status,
      result,
      error,
      startedAt,
      score,
      cancel,
      reset,
    }),
    [jobDescription, resume, status, result, error, startedAt, score, cancel, reset],
  )

  return <ScoreWorkspaceContext.Provider value={value}>{children}</ScoreWorkspaceContext.Provider>
}
