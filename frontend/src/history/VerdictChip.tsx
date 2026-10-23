import { Chip } from '@mui/material'
import { bandFor } from '../theme/scoreBands'

/** Score band as icon + label (the status color never carries the meaning alone). */
export default function VerdictChip({ score, size = 'small' }: { score: number; size?: 'small' | 'medium' }) {
  const band = bandFor(score)
  return (
    <Chip
      size={size}
      icon={band.icon}
      label={band.label}
      variant="outlined"
      sx={{ fontWeight: 600, '& .MuiChip-icon': { color: band.color } }}
    />
  )
}
