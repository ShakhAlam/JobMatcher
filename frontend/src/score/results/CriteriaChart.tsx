import { Box, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { BarChart } from '@mui/x-charts/BarChart'
import type { CriterionScore } from '../../api/types'

const ROW_HEIGHT = 44
// With ROW_HEIGHT 44 this leaves bars ~22px thick (spec: <= 24px, let the slot breathe).
const CATEGORY_GAP = 0.5
const X_AXIS_BAND = 32
// Enough room past 100 for a bold "100" label on a phone-width chart.
const LABEL_HEADROOM_MAX = 120

// Phone-width axis labels; the full names stay in the breakdown below the chart.
const SHORT_LABELS: Record<string, string> = {
  skills: 'Skills',
  experience: 'Experience',
  responsibilities: 'Responsibilities',
  tools: 'Tools',
  education: 'Education',
  soft_skills: 'Soft skills',
}

interface CriteriaChartProps {
  criteria: CriterionScore[]
}

/**
 * One series (score per criterion), so one hue for every bar and no legend; the card title
 * names what is plotted. Values are labelled at the bar tips, and CriterionBreakdown below
 * is the table view with every number and its explanation.
 */
export default function CriteriaChart({ criteria }: CriteriaChartProps) {
  const theme = useTheme()
  const narrow = useMediaQuery(theme.breakpoints.down('sm'))
  const height = criteria.length * ROW_HEIGHT + X_AXIS_BAND

  return (
    <Box sx={{ width: '100%', height }}>
      <BarChart
        height={height}
        layout="horizontal"
        dataset={criteria.map((c) => ({
          label: narrow ? (SHORT_LABELS[c.key] ?? c.label) : c.label,
          score: c.score,
        }))}
        yAxis={[
          {
            scaleType: 'band',
            dataKey: 'label',
            categoryGapRatio: CATEGORY_GAP,
            width: narrow ? 104 : 180,
            disableTicks: true,
            tickLabelStyle: { fontSize: narrow ? 12 : 13 },
          },
        ]}
        xAxis={[
          {
            min: 0,
            // The bar layer is clipped to the plot area, so the domain runs past 100 to leave room
            // for tip labels on high scores. Ticks and gridlines still stop at 100.
            max: LABEL_HEADROOM_MAX,
            tickInterval: [0, 25, 50, 75, 100],
            disableTicks: true,
            disableLine: true,
            tickLabelStyle: { fontSize: 12 },
          },
        ]}
        series={[
          {
            dataKey: 'score',
            label: 'Score',
            color: 'var(--mui-palette-chart-bar)',
            barLabel: 'value',
            barLabelPlacement: 'outside',
            valueFormatter: (value) => (value == null ? '' : `${value} / 100`),
          },
        ]}
        borderRadius={4}
        grid={{ vertical: true }}
        hideLegend
        margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
        sx={{
          // Recessive hairline grid and axes; the bars are the only loud thing.
          '& .MuiChartsGrid-line': { stroke: 'var(--mui-palette-divider)', strokeWidth: 1 },
          '& .MuiChartsAxis-line': { stroke: 'var(--mui-palette-divider)' },
          '& .MuiChartsAxis-tickLabel': { fill: 'var(--mui-palette-text-secondary)' },
          '& .MuiBarChart-label': { fill: 'var(--mui-palette-text-primary)', fontWeight: 600 },
        }}
      />
    </Box>
  )
}
