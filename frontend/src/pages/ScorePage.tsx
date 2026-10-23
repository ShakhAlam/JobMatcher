import { lazy, Suspense, useEffect, useRef } from 'react'
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined'
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined'
import { Alert, Box, Button, CircularProgress, Grid, Stack, Typography } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { getSettings } from '../api/client'
import { SETTINGS_QUERY_KEY } from '../api/queryKeys'
import { MIN_INPUT_CHARS, PROVIDER_NAMES } from '../api/types'
import PageHeader from '../components/PageHeader'
import ActiveModelChip from '../score/ActiveModelChip'
import DocumentInput from '../score/DocumentInput'
import ScoreProgress from '../score/ScoreProgress'
import { useScoreWorkspace } from '../score/workspace'

// The results view pulls in the charts library; load it only once there is a result to show.
const MatchResultView = lazy(() => import('../score/results/MatchResultView'))

export default function ScorePage() {
  const {
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
  } = useScoreWorkspace()
  const running = status === 'running'
  const resultRef = useRef<HTMLDivElement>(null)

  const { data: settings } = useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: getSettings })
  const hosted = settings && settings.provider !== 'ollama' ? settings.provider : null
  const keyMissing = hosted !== null && settings?.api_keys[hosted].source === null

  const missing = [
    jobDescription.trim().length < MIN_INPUT_CHARS && 'a job description',
    resume.trim().length < MIN_INPUT_CHARS && 'a resume',
  ].filter(Boolean)
  const canScore = missing.length === 0 && !running && !keyMissing

  // Bring a fresh result into view once scoring finishes.
  const previousStatus = useRef(status)
  useEffect(() => {
    if (previousStatus.current === 'running' && status === 'success') {
      resultRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' })
    }
    previousStatus.current = status
  }, [status])

  return (
    <>
      <PageHeader
        title="Score a resume"
        subtitle="Paste or upload a job description and a resume to see how well they match, and why."
        actions={
          (jobDescription || resume || result) && (
            <Button color="inherit" startIcon={<RestartAltOutlined />} onClick={reset} disabled={running}>
              Start over
            </Button>
          )
        }
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <DocumentInput
            label="Job description"
            placeholder="Paste the job description: title, responsibilities, requirements…"
            value={jobDescription}
            onChange={setJobDescription}
            disabled={running}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <DocumentInput
            label="Resume"
            placeholder="Paste the resume text, or upload a PDF or DOCX…"
            value={resume}
            onChange={setResume}
            disabled={running}
          />
        </Grid>
      </Grid>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ alignItems: { sm: 'center' }, justifyContent: 'flex-end', my: 3 }}
      >
        {settings && <ActiveModelChip settings={settings} keyMissing={keyMissing} />}
        <Box sx={{ flexGrow: 1, display: { xs: 'none', sm: 'block' } }} />
        {!running && keyMissing && hosted && (
          <Typography variant="body2" color="text.secondary">
            Add a {PROVIDER_NAMES[hosted]} API key in Settings to score.
          </Typography>
        )}
        {!running && !keyMissing && missing.length > 0 && (
          <Typography variant="body2" color="text.secondary">
            Add {missing.join(' and ')} to score.
          </Typography>
        )}
        <Button
          variant="contained"
          size="large"
          startIcon={<AutoAwesomeOutlined />}
          onClick={score}
          disabled={!canScore}
          sx={{ px: 4 }}
        >
          {result ? 'Score again' : 'Score resume'}
        </Button>
      </Stack>

      <Stack spacing={3}>
        {running && startedAt !== null && <ScoreProgress startedAt={startedAt} onCancel={cancel} />}
        {status === 'error' && error && (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={score} disabled={!canScore}>
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        )}
        {result && (
          <div ref={resultRef} style={{ scrollMarginTop: 80, opacity: running ? 0.5 : 1 }}>
            <Suspense fallback={<CircularProgress aria-label="Loading result" sx={{ display: 'block', mx: 'auto' }} />}>
              <MatchResultView result={result} />
            </Suspense>
          </div>
        )}
      </Stack>
    </>
  )
}
