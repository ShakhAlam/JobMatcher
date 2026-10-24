import { lazy, Suspense, useState } from 'react'
import ArrowBackOutlined from '@mui/icons-material/ArrowBackOutlined'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined'
import OpenInNewOutlined from '@mui/icons-material/OpenInNewOutlined'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink, useNavigate, useParams } from 'react-router'
import { ApiError, deleteHistoryEntry, getHistoryEntry } from '../api/client'
import { HISTORY_QUERY_KEY } from '../api/queryKeys'
import { PROVIDER_NAMES } from '../api/types'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadErrorAlert from '../components/LoadErrorAlert'
import PageHeader from '../components/PageHeader'
import { formatWhen } from '../history/formatWhen'
import { useScoreWorkspace } from '../score/workspace'

const MatchResultView = lazy(() => import('../score/results/MatchResultView'))

function InputText({ title, text }: { title: string; text: string }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        {title}
      </Typography>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          maxHeight: 320,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          fontFamily: 'inherit',
          fontSize: '0.875rem',
          bgcolor: 'background.default',
          borderRadius: 1,
        }}
      >
        {text}
      </Box>
    </Box>
  )
}

export default function HistoryDetailPage() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { restore } = useScoreWorkspace()
  const [confirmDelete, setConfirmDelete] = useState(false)

  const {
    data: entry,
    error,
    isPending,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [...HISTORY_QUERY_KEY, 'entry', id],
    queryFn: () => getHistoryEntry(id),
    enabled: Number.isInteger(id),
  })

  const remove = useMutation({
    mutationFn: () => deleteHistoryEntry(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
      void navigate('/history')
    },
  })

  const back = (
    <Button component={RouterLink} to="/history" startIcon={<ArrowBackOutlined />} color="inherit" sx={{ mb: 1 }}>
      All history
    </Button>
  )

  if (!Number.isInteger(id) || (error instanceof ApiError && error.status === 404)) {
    return (
      <>
        {back}
        <Alert severity="info">That scoring run no longer exists.</Alert>
      </>
    )
  }
  if (error) {
    return (
      <>
        {back}
        <LoadErrorAlert what="this scoring run" error={error} onRetry={() => void refetch()} retrying={isFetching} />
      </>
    )
  }
  if (isPending || !entry) return <CircularProgress aria-label="Loading scoring run" />

  const subtitle = [
    entry.candidate,
    `scored ${formatWhen(entry.created_at)} with ${PROVIDER_NAMES[entry.model_used.provider]} · ${entry.model_used.model}`,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <>
      {back}
      <PageHeader
        title={entry.job_title}
        subtitle={subtitle.charAt(0).toUpperCase() + subtitle.slice(1)}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<OpenInNewOutlined />}
              onClick={() => {
                restore({ jobDescription: entry.job_description, resume: entry.resume, result: entry.result })
                void navigate('/')
              }}
            >
              Open in Score page
            </Button>
            <Button color="inherit" startIcon={<DeleteOutlined />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </Stack>
        }
      />

      <Accordion disableGutters variant="outlined" sx={{ mb: 3, borderRadius: 1, '&::before': { display: 'none' } }}>
        <AccordionSummary expandIcon={<ExpandMoreOutlined />}>
          <Typography sx={{ fontWeight: 600 }}>Job description and resume</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <InputText title="Job description" text={entry.job_description} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <InputText title="Resume" text={entry.resume} />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      <Suspense fallback={<CircularProgress aria-label="Loading result" />}>
        <MatchResultView result={entry.result} />
      </Suspense>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this scoring run?"
        message="It will be removed from History permanently."
        confirmLabel="Delete"
        busy={remove.isPending}
        onConfirm={() => remove.mutate()}
        onClose={() => setConfirmDelete(false)}
      />
    </>
  )
}
