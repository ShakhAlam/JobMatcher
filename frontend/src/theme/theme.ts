import { alpha, createTheme } from '@mui/material/styles'

// Score bands shared by charts and chips (matches the backend's verdict thresholds).
export const scoreBands = [
  { min: 80, label: 'Strong match', color: '#10b981' },
  { min: 65, label: 'Good match', color: '#22c55e' },
  { min: 45, label: 'Partial match', color: '#f59e0b' },
  { min: 0, label: 'Poor match', color: '#ef4444' },
] as const

export function bandFor(score: number) {
  return scoreBands.find((band) => score >= band.min) ?? scoreBands[scoreBands.length - 1]
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    dark: {
      palette: {
        primary: { main: '#2dd4bf', contrastText: '#04201c' },
        secondary: { main: '#818cf8' },
        background: { default: '#0b1020', paper: '#111830' },
        divider: alpha('#94a3b8', 0.16),
        text: { primary: '#e2e8f0', secondary: '#94a3b8' },
      },
    },
    light: {
      palette: {
        primary: { main: '#0d9488' },
        secondary: { main: '#4f46e5' },
        background: { default: '#f5f7fb', paper: '#ffffff' },
        divider: alpha('#0f172a', 0.1),
        text: { primary: '#0f172a', secondary: '#475569' },
      },
    },
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: '"Inter", "Segoe UI", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 700, letterSpacing: '-0.02em' },
    h5: { fontWeight: 700, letterSpacing: '-0.01em' },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  components: {
    MuiAppBar: {
      defaultProps: { elevation: 0, color: 'inherit' },
      styleOverrides: {
        root: ({ theme }) => ({
          backgroundColor: theme.alpha(theme.vars.palette.background.default, 0.8),
          backdropFilter: 'blur(12px)',
          borderBottom: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: ({ theme }) => ({
          backgroundColor: theme.vars.palette.background.default,
          borderRight: `1px solid ${theme.vars.palette.divider}`,
        }),
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiListItemButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius,
          margin: theme.spacing(0.25, 1),
          '&.Mui-selected': {
            backgroundColor: theme.alpha(theme.vars.palette.primary.main, 0.14),
            color: theme.vars.palette.primary.main,
            '& .MuiListItemIcon-root': { color: theme.vars.palette.primary.main },
          },
          '&.Mui-selected:hover': { backgroundColor: theme.alpha(theme.vars.palette.primary.main, 0.2) },
        }),
      },
    },
    MuiListItemIcon: { styleOverrides: { root: { minWidth: 40 } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
})
