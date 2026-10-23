import type { ReactElement } from 'react'
import HistoryOutlined from '@mui/icons-material/HistoryOutlined'
import InsightsOutlined from '@mui/icons-material/InsightsOutlined'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'

export interface NavItem {
  label: string
  path: string
  icon: ReactElement
}

export const navItems: NavItem[] = [
  { label: 'Score', path: '/', icon: <InsightsOutlined /> },
  { label: 'History', path: '/history', icon: <HistoryOutlined /> },
  { label: 'Profile', path: '/profile', icon: <PersonOutlined /> },
  { label: 'Settings', path: '/settings', icon: <SettingsOutlined /> },
]
