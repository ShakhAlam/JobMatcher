import { useEffect, useState } from 'react'
import { Button, Card, CardContent, LinearProgress, Stack, Typography } from '@mui/material'

const STEPS = [
  { after: 0, text: 'Reading the job description and resume…' },
  { after: 8, text: 'Extracting requirements and the candidate profile…' },
  { after: 25, text: 'Scoring each criterion…' },
  { after: 60, text: 'Still working. Local models can take a few minutes.' },
]

function formatElapsed(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
}

interface ScoreProgressProps {
  startedAt: number
  onCancel: () => void
}

/**
 * The backend doesn't stream progress yet, so the step text is time-based guidance
 * rather than real stage reporting.
 */
export default function ScoreProgress({ startedAt, onCancel }: ScoreProgressProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = Math.max(0, Math.floor((now - startedAt) / 1000))
  const step = [...STEPS].reverse().find((s) => elapsed >= s.after) ?? STEPS[0]

  return (
    <Card role="status" aria-live="polite">
      <LinearProgress aria-label="Scoring in progress" />
      <CardContent>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
          <Stack sx={{ flexGrow: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>Scoring the resume</Typography>
            <Typography color="text.secondary">{step.text}</Typography>
          </Stack>
          <Typography color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatElapsed(elapsed)}
          </Typography>
          <Button variant="outlined" color="inherit" onClick={onCancel}>
            Cancel
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}
