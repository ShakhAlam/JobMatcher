import { Button, Stack, Typography } from '@mui/material'
import { Link as RouterLink } from 'react-router'

export default function NotFoundPage() {
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 10 }}>
      <Typography variant="h4" component="h1">
        Page not found
      </Typography>
      <Typography color="text.secondary">That page doesn't exist.</Typography>
      <Button variant="contained" component={RouterLink} to="/">
        Back to scoring
      </Button>
    </Stack>
  )
}
