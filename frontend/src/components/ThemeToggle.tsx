import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlined from '@mui/icons-material/LightModeOutlined'
import { IconButton, Tooltip } from '@mui/material'
import { useColorScheme } from '@mui/material/styles'

export default function ThemeToggle() {
  const { mode, systemMode, setMode } = useColorScheme()
  // `mode` is undefined until MUI has read the saved preference.
  if (!mode) return null

  const resolved = mode === 'system' ? systemMode : mode
  const isDark = resolved === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <Tooltip title={label}>
      <IconButton aria-label={label} onClick={() => setMode(isDark ? 'light' : 'dark')} color="inherit">
        {isDark ? <LightModeOutlined /> : <DarkModeOutlined />}
      </IconButton>
    </Tooltip>
  )
}
