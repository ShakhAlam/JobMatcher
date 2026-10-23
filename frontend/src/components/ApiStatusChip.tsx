import { Chip, Tooltip } from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../api/client'

export default function ApiStatusChip() {
  const { isSuccess, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  })

  if (!isSuccess && !isError) return null

  const online = isSuccess
  return (
    <Tooltip title={online ? 'Backend API is reachable' : (error?.message ?? 'Backend API is unreachable')}>
      <Chip
        size="small"
        variant="outlined"
        color={online ? 'success' : 'error'}
        label={online ? 'API online' : 'API offline'}
        sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
      />
    </Tooltip>
  )
}
