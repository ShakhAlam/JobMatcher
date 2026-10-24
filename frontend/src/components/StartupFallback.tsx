import { Box, CircularProgress } from '@mui/material'

/** Shown only while the first page's code loads on a cold start (e.g. opening /history directly). */
export default function StartupFallback() {
  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <CircularProgress aria-label="Loading" />
    </Box>
  )
}
