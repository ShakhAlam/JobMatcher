import type { ReactElement } from 'react'
import { Card, CardContent, Stack, Typography } from '@mui/material'

interface PlaceholderProps {
  icon: ReactElement
  title: string
  description: string
}

/** Stand-in body for pages that later phases will build. */
export default function Placeholder({ icon, title, description }: PlaceholderProps) {
  return (
    <Card sx={{ borderStyle: 'dashed' }}>
      <CardContent>
        <Stack spacing={1.5} sx={{ alignItems: 'center', textAlign: 'center', py: 6, color: 'text.secondary' }}>
          {icon}
          <Typography variant="h6" color="text.primary">
            {title}
          </Typography>
          <Typography sx={{ maxWidth: 520 }}>{description}</Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
