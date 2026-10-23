import { type ReactNode, useState } from 'react'
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined'
import { Button, Card, CardContent, Snackbar, Stack, Typography } from '@mui/material'
import type { MatchResult } from '../../api/types'
import CriteriaChart from './CriteriaChart'
import CriterionBreakdown from './CriterionBreakdown'
import InsightLists from './InsightLists'
import ScoreSummary from './ScoreSummary'
import { resultToMarkdown } from './toMarkdown'

interface MatchResultViewProps {
  result: MatchResult
  /** Heading for the section; History shows the run's date here instead. */
  title?: string
  /** Extra buttons beside "Copy report". */
  actions?: ReactNode
}

export default function MatchResultView({ result, title = 'Result', actions }: MatchResultViewProps) {
  const [copied, setCopied] = useState<string | null>(null)

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(resultToMarkdown(result))
      setCopied('Report copied as Markdown')
    } catch {
      setCopied('Could not copy to the clipboard')
    }
  }

  return (
    <Stack spacing={2} component="section" aria-label="Match result">
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
          {title}
        </Typography>
        {actions}
        <Button startIcon={<ContentCopyOutlined />} onClick={copyReport}>
          Copy report
        </Button>
      </Stack>

      <ScoreSummary result={result} />

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2">
            Score by criterion
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            0–100 per criterion; the overall score is their weighted average.
          </Typography>
          <CriteriaChart criteria={result.criteria} />
        </CardContent>
      </Card>

      <InsightLists result={result} />

      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Why these scores
          </Typography>
          <CriterionBreakdown criteria={result.criteria} />
        </CardContent>
      </Card>

      <Snackbar
        open={copied !== null}
        autoHideDuration={3000}
        onClose={() => setCopied(null)}
        message={copied}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </Stack>
  )
}
