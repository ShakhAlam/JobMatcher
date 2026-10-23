import { useState } from 'react'
import MenuIcon from '@mui/icons-material/Menu'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import SettingsOutlined from '@mui/icons-material/SettingsOutlined'
import WorkOutlined from '@mui/icons-material/WorkOutlined'
import {
  AppBar,
  Avatar,
  Box,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { Link as RouterLink } from 'react-router'
import ApiStatusChip from '../components/ApiStatusChip'
import ThemeToggle from '../components/ThemeToggle'

interface TopBarProps {
  onMenuClick: () => void
}

export default function TopBar({ onMenuClick }: TopBarProps) {
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const closeMenu = () => setMenuAnchor(null)

  return (
    <AppBar position="fixed" sx={(theme) => ({ zIndex: theme.zIndex.drawer + 1 })}>
      <Toolbar sx={{ gap: 1 }}>
        <IconButton edge="start" color="inherit" aria-label="Toggle navigation" onClick={onMenuClick}>
          <MenuIcon />
        </IconButton>

        <Stack
          direction="row"
          spacing={1}
          component={RouterLink}
          to="/"
          sx={{ alignItems: 'center', color: 'inherit', textDecoration: 'none' }}
        >
          <Box
            sx={(theme) => {
              const { palette } = theme.vars ?? theme
              return {
                display: 'grid',
                placeItems: 'center',
                width: 32,
                height: 32,
                borderRadius: 2,
                color: palette.primary.contrastText,
                background: `linear-gradient(135deg, ${palette.primary.main}, ${palette.secondary.main})`,
              }
            }}
          >
            <WorkOutlined fontSize="small" />
          </Box>
          <Typography variant="h6" component="span" noWrap>
            Job Matcher
          </Typography>
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        <ApiStatusChip />
        <ThemeToggle />
        <Tooltip title="Account">
          <IconButton aria-label="Open account menu" onClick={(e) => setMenuAnchor(e.currentTarget)} sx={{ p: 0.5 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
              <PersonOutlined fontSize="small" />
            </Avatar>
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={menuAnchor}
          open={menuAnchor !== null}
          onClose={closeMenu}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <MenuItem component={RouterLink} to="/profile" onClick={closeMenu}>
            <ListItemIcon>
              <PersonOutlined fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem component={RouterLink} to="/settings" onClick={closeMenu}>
            <ListItemIcon>
              <SettingsOutlined fontSize="small" />
            </ListItemIcon>
            Settings
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}
