import CloudOutlined from '@mui/icons-material/CloudOutlined'
import ComputerOutlined from '@mui/icons-material/ComputerOutlined'
import { Chip, Tooltip } from '@mui/material'
import { Link as RouterLink } from 'react-router'
import { PROVIDER_NAMES, type UserSettings } from '../api/types'

/** Which model the next score will use; links to Settings to change it. */
export default function ActiveModelChip({ settings, keyMissing }: { settings: UserSettings; keyMissing: boolean }) {
  const name = PROVIDER_NAMES[settings.provider]
  return (
    <Tooltip describeChild title={keyMissing ? `Add a ${name} API key in Settings` : 'Change the model in Settings'}>
      <Chip
        component={RouterLink}
        to="/settings"
        clickable
        variant="outlined"
        color={keyMissing ? 'warning' : 'default'}
        icon={settings.provider === 'ollama' ? <ComputerOutlined /> : <CloudOutlined />}
        label={`${name} · ${settings.models[settings.provider]}${keyMissing ? ' (no API key)' : ''}`}
        sx={{ maxWidth: '100%' }}
      />
    </Tooltip>
  )
}
