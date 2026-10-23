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
  reset: () => void
}

export const ScoreWorkspaceContext = createContext<ScoreWorkspace | null>(null)

export function useScoreWorkspace(): ScoreWorkspace {
  const workspace = useContext(ScoreWorkspaceContext)
  if (!workspace) throw new Error('useScoreWorkspace must be used inside ScoreWorkspaceProvider')
  return workspace
}
