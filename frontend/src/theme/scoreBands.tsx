import type { ReactElement } from 'react'
import CancelOutlined from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import ErrorOutlined from '@mui/icons-material/ErrorOutlined'
import ThumbUpOutlined from '@mui/icons-material/ThumbUpOutlined'

export interface ScoreBand {
  min: number
  label: string
  /** Status color. Never shown alone: always paired with the icon and label. */
  color: string
  icon: ReactElement
}

// Thresholds match the backend's verdict bands. Colors are the dataviz reference status
// palette (good / warning / critical); Strong and Good share "good" and differ by icon + label.
export const scoreBands: ScoreBand[] = [
  { min: 80, label: 'Strong match', color: '#0ca30c', icon: <CheckCircleOutlined /> },
  { min: 65, label: 'Good match', color: '#0ca30c', icon: <ThumbUpOutlined /> },
  { min: 45, label: 'Partial match', color: '#fab219', icon: <ErrorOutlined /> },
  { min: 0, label: 'Poor match', color: '#d03b3b', icon: <CancelOutlined /> },
]

export function bandFor(score: number): ScoreBand {
  return scoreBands.find((band) => score >= band.min) ?? scoreBands[scoreBands.length - 1]
}
