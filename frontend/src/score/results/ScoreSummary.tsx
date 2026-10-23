import { Box, Card, CardContent, Chip, LinearProgress, Stack, Typography } from '@mui/material'
import type { MatchResult } from '../../api/types'
import { bandFor } from '../../theme/scoreBands'

const providerNames: Record<string, string> = { ollama: 'Ollama', anthropic: 'Claude', openai: 'OpenAI' }

function formatDuration(ms: number) {
  const seconds = Math.round(ms / 1000)
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`
}

interface ScoreSummaryProps {
  result: MatchResult
}

export default function ScoreSummary({ result }: ScoreSummaryProps) {
  const band = bandFor(result.overall_score)
  const title = result.requirements.title
  const candidate = result.candidate.name ?? result.candidate.current_title

  return (
    <Card>
      <CardContent>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 4 }}>
          <Stack spacing={1.5} sx={{ minWidth: { md: 240 } }}>
            <Typography variant="overline" color="text.secondary">
              Overall match
            </Typography>
            {/* Hero figure: one per view, same sans as everything else. */}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'baseline' }}>
              <Typography component="p" sx={{ fontSize: 64, fontWeight: 700, lineHeight: 1 }}>
                {result.overall_score}
              </Typography>
              <Typography color="text.secondary" sx={{ fontSize: 20 }}>
                / 100
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={result.overall_score}
              aria-label={`Overall score ${result.overall_score} out of 100, ${band.label}`}
              sx={(theme) => ({
                height: 8,
                borderRadius: 4,
                // Meter: the unfilled track is a lighter step of the same hue as the fill.
                backgroundColor: theme.alpha(band.color, 0.2),
                '& .MuiLinearProgress-bar': { backgroundColor: band.color, borderRadius: 4 },
              })}
            />
            <Box>
              {/* Status color never stands alone: icon + label carry the verdict. */}
              <Chip
                icon={band.icon}
                label={band.label}
                variant="outlined"
                sx={{ fontWeight: 600, '& .MuiChip-icon': { color: band.color } }}
              />
            </Box>
          </Stack>

          <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h2">
              {candidate ? `${candidate} for ${title}` : title}
            </Typography>
            <Typography>{result.summary}</Typography>
            <Typography variant="body2" color="text.secondary">
              Scored by {providerNames[result.model_used.provider] ?? result.model_used.provider} ·{' '}
              {result.model_used.model} in {formatDuration(result.duration_ms)}
            </Typography>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
