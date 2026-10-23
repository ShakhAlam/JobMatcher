import { createContext, useContext } from 'react'
import type { MatchResult } from '../api/types'

export type ScoreStatus = 'idle' | 'running' | 'success' | 'error'

export interface ScoreWorkspace {
  jobDescription: string
  setJobDescription: (value: string) => void
  resume: string
  setResume: (value: string) => void
  status: ScoreStatus
  result: MatchResult | null
  error: string | null
  /** Epoch ms when the running request started (for the elapsed timer). */
  startedAt: number | null
  score: () => void
  cancel: () => void
  /** Clear the job description and result; the resume goes back to the saved default, if any. */
  reset: () => void
  /** Reopen a past run (from History): its inputs and result. */
  restore: (run: { jobDescription: string; resume: string; result: MatchResult }) => void
  /** The default resume saved on the Profile page, if any. */
  defaultResume: string
}

export const ScoreWorkspaceContext = createContext<ScoreWorkspace | null>(null)

export function useScoreWorkspace(): ScoreWorkspace {
  const workspace = useContext(ScoreWorkspaceContext)
  if (!workspace) throw new Error('useScoreWorkspace must be used inside ScoreWorkspaceProvider')
  return workspace
}
