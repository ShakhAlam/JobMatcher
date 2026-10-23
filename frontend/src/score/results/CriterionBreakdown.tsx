import { Fragment } from 'react'
import CheckOutlined from '@mui/icons-material/CheckOutlined'
import CloseOutlined from '@mui/icons-material/CloseOutlined'
import { Box, Chip, Divider, Grid, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import type { CriterionScore } from '../../api/types'

function FactList({ title, items, kind }: { title: string; items: string[]; kind: 'evidence' | 'missing' }) {
  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {items.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {kind === 'evidence' ? 'None cited.' : 'Nothing missing.'}
        </Typography>
      ) : (
        <List dense disablePadding>
          {items.map((item) => (
            <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 28, mt: 0.25 }}>
                {kind === 'evidence' ? (
                  <CheckOutlined fontSize="small" color="success" aria-label="Has" />
                ) : (
                  <CloseOutlined fontSize="small" color="error" aria-label="Missing" />
                )}
              </ListItemIcon>
              <ListItemText primary={item} slotProps={{ primary: { variant: 'body2' } }} />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  )
}

interface CriterionBreakdownProps {
  criteria: CriterionScore[]
}

/** The "why" for each criterion; also the table view of every number in the chart. */
export default function CriterionBreakdown({ criteria }: CriterionBreakdownProps) {
  return (
    <Stack divider={<Divider flexItem />} spacing={2.5}>
      {criteria.map((criterion) => (
        <Fragment key={criterion.key}>
          <Box component="section" aria-labelledby={`criterion-${criterion.key}`}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1, flexWrap: 'wrap', rowGap: 1 }}>
              <Typography id={`criterion-${criterion.key}`} variant="subtitle1" component="h3" sx={{ fontWeight: 600 }}>
                {criterion.label}
              </Typography>
              <Chip size="small" label={`${Math.round(criterion.weight * 100)}% weight`} variant="outlined" />
              <Box sx={{ flexGrow: 1 }} />
              <Typography sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
                {criterion.score}
                <Typography component="span" color="text.secondary">
                  {' '}
                  / 100
                </Typography>
              </Typography>
            </Stack>
            <Typography sx={{ mb: 1.5 }}>{criterion.rationale}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FactList title="Evidence in the resume" items={criterion.evidence} kind="evidence" />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FactList title="Missing or weaker" items={criterion.missing} kind="missing" />
              </Grid>
            </Grid>
          </Box>
        </Fragment>
      ))}
    </Stack>
  )
}
