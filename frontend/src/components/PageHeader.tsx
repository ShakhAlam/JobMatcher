import type { ReactNode } from 'react'
import { Box, Stack, Typography } from '@mui/material'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ alignItems: { sm: 'flex-end' }, justifyContent: 'space-between', mb: 3 }}
    >
      <Box>
        <Typography variant="h4" component="h1">
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {actions}
    </Stack>
  )
}
