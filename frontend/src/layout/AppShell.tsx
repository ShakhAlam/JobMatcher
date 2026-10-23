import { useEffect, useState } from 'react'
import { Box, Toolbar, useMediaQuery } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { Outlet } from 'react-router'
import SideNav from './SideNav'
import TopBar from './TopBar'

const EXPANDED_KEY = 'jobmatcher.sidenav.expanded'

function readExpanded(): boolean {
  try {
    return localStorage.getItem(EXPANDED_KEY) !== 'false'
  } catch {
    return true
  }
}

export default function AppShell() {
  const theme = useTheme()
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'))
  const [desktopExpanded, setDesktopExpanded] = useState(readExpanded)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    try {
      localStorage.setItem(EXPANDED_KEY, String(desktopExpanded))
    } catch {
      // Storage may be unavailable (private mode); the preference just won't persist.
    }
  }, [desktopExpanded])

  const toggleNav = () => (isDesktop ? setDesktopExpanded((v) => !v) : setMobileOpen((v) => !v))

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <TopBar onMenuClick={toggleNav} />
      <SideNav
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop ? desktopExpanded : mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, px: { xs: 2, sm: 3, md: 4 }, pb: 6 }}>
        <Toolbar />
        <Box sx={{ maxWidth: 1280, mx: 'auto', pt: { xs: 2, md: 3 } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
