import {
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import { NavLink } from 'react-router'
import { navItems } from './navItems'

export const DRAWER_WIDTH = 240
export const DRAWER_COLLAPSED_WIDTH = 72

interface SideNavProps {
  /** Desktop: permanent drawer that collapses to icons. Mobile: temporary overlay. */
  variant: 'permanent' | 'temporary'
  open: boolean
  onClose: () => void
}

export default function SideNav({ variant, open, onClose }: SideNavProps) {
  const collapsed = variant === 'permanent' && !open
  const width = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH

  const list = (
    <List component="nav" aria-label="Main navigation" sx={{ pt: 1 }}>
      {navItems.map((item) => {
        const button = (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end={item.path === '/'}
            onClick={variant === 'temporary' ? onClose : undefined}
            // NavLink sets aria-current="page" on the active route; mirror it as MUI's selected state.
            sx={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              px: collapsed ? 0 : 2,
              '&[aria-current="page"]': (theme) => {
                const primary = (theme.vars ?? theme).palette.primary.main
                return {
                  backgroundColor: theme.alpha(primary, 0.14),
                  color: primary,
                  '& .MuiListItemIcon-root': { color: primary },
                  // High-contrast (forced colors) modes drop background colors; keep the active item visible.
                  '@media (forced-colors: active)': { outline: '2px solid Highlight', outlineOffset: -2 },
                }
              },
            }}
            aria-label={collapsed ? item.label : undefined}
          >
            <ListItemIcon sx={{ minWidth: collapsed ? 0 : 40, justifyContent: 'center' }}>{item.icon}</ListItemIcon>
            {!collapsed && <ListItemText primary={item.label} />}
          </ListItemButton>
        )
        return collapsed ? (
          <Tooltip key={item.path} title={item.label} placement="right">
            {button}
          </Tooltip>
        ) : (
          button
        )
      })}
    </List>
  )

  return (
    <Drawer
      variant={variant}
      open={variant === 'temporary' ? open : true}
      onClose={onClose}
      ModalProps={{ keepMounted: true }}
      sx={(theme) => ({
        width,
        flexShrink: 0,
        whiteSpace: 'nowrap',
        transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
        '& .MuiDrawer-paper': {
          width,
          overflowX: 'hidden',
          boxSizing: 'border-box',
          transition: theme.transitions.create('width', { duration: theme.transitions.duration.shorter }),
        },
      })}
    >
      {/* Spacer so the list starts below the fixed app bar. */}
      <Toolbar />
      {list}
      <Box sx={{ flexGrow: 1 }} />
      {!collapsed && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 3, py: 2 }}>
          Job Matcher v0.1
        </Typography>
      )}
    </Drawer>
  )
}
