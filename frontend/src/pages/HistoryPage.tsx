import { useState } from 'react'
import DeleteSweepOutlined from '@mui/icons-material/DeleteSweepOutlined'
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link as RouterLink } from 'react-router'
import { clearHistory, listHistory } from '../api/client'
import { HISTORY_QUERY_KEY } from '../api/queryKeys'
import { PROVIDER_NAMES } from '../api/types'
import ConfirmDialog from '../components/ConfirmDialog'
import PageHeader from '../components/PageHeader'
import Placeholder from '../components/Placeholder'
import VerdictChip from '../history/VerdictChip'
import { formatWhen } from '../history/formatWhen'

const PAGE_SIZE = 25

export default function HistoryPage() {
  const queryClient = useQueryClient()
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [confirmClear, setConfirmClear] = useState(false)
  const { data, error, isPending, isFetching } = useQuery({
    queryKey: [...HISTORY_QUERY_KEY, 'list', limit],
    queryFn: () => listHistory(limit),
    // Keep the current rows on screen while "Show more" loads the next page.
    placeholderData: keepPreviousData,
  })

  const clear = useMutation({
    mutationFn: clearHistory,
    onSuccess: () => {
      setConfirmClear(false)
      void queryClient.invalidateQueries({ queryKey: HISTORY_QUERY_KEY })
    },
  })

  const total = data?.total ?? 0

  return (
    <>
      <PageHeader
        title="History"
        subtitle={total ? `${total} past scoring run${total === 1 ? '' : 's'}, newest first.` : 'Past scoring runs.'}
        actions={
          total > 0 && (
            <Button color="inherit" startIcon={<DeleteSweepOutlined />} onClick={() => setConfirmClear(true)}>
              Clear history
            </Button>
          )
        }
      />

      {isPending && <CircularProgress aria-label="Loading history" />}
      {error && <Alert severity="error">{error.message}</Alert>}

      {data && total === 0 && (
        <Stack spacing={2} sx={{ alignItems: 'center' }}>
          <Placeholder
            icon={<HistoryOutlined sx={{ fontSize: 48 }} />}
            title="No history yet"
            description="Every resume you score is saved here, so you can reopen its full breakdown later."
          />
          <Button variant="contained" component={RouterLink} to="/">
            Score a resume
          </Button>
        </Stack>
      )}

      {data && total > 0 && (
        <Card>
          <List disablePadding aria-label="Past scoring runs">
            {data.items.map((item, index) => (
              <Box key={item.id}>
                {index > 0 && <Divider component="div" />}
                <ListItemButton
                  component={RouterLink}
                  to={`/history/${item.id}`}
                  sx={{ m: 0, borderRadius: 0, py: 1.5, gap: 2, alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <Typography
                    component="span"
                    sx={{ fontSize: 28, fontWeight: 700, minWidth: 48, textAlign: 'right' }}
                    aria-label={`Score ${item.overall_score}`}
                  >
                    {item.overall_score}
                  </Typography>
                  <Box sx={{ flex: '1 1 240px', minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {item.job_title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {[
                        item.candidate,
                        formatWhen(item.created_at),
                        `${PROVIDER_NAMES[item.model_used.provider]} · ${item.model_used.model}`,
                      ]
                        .filter(Boolean)
                        .join('  ·  ')}
                    </Typography>
                  </Box>
                  <VerdictChip score={item.overall_score} />
                </ListItemButton>
              </Box>
            ))}
          </List>
        </Card>
      )}

      {data && data.items.length < total && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button onClick={() => setLimit((l) => l + PAGE_SIZE)} disabled={isFetching}>
            {isFetching ? 'Loading…' : `Show more (${total - data.items.length} older)`}
          </Button>
        </Box>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Clear all history?"
        message={`This permanently deletes ${total} saved scoring run${total === 1 ? '' : 's'}.`}
        confirmLabel="Clear history"
        busy={clear.isPending}
        onConfirm={() => clear.mutate()}
        onClose={() => setConfirmClear(false)}
      />
    </>
  )
}
