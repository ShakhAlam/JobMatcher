import type { ReactElement } from 'react'
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined'
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined'
import SchoolOutlined from '@mui/icons-material/SchoolOutlined'
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined'
import { Card, CardContent, Grid, List, ListItem, ListItemIcon, ListItemText, Stack, Typography } from '@mui/material'
import type { MatchResult } from '../../api/types'

interface InsightCardProps {
  title: string
  icon: ReactElement
  items: string[] | undefined
  empty: string
}

// `items` defaults to [] so a response from an older or newer backend can't crash the page.
function InsightCard({ title, icon, items = [], empty }: InsightCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          {icon}
          <Typography variant="h6" component="h2">
            {title}
          </Typography>
        </Stack>
        {items.length === 0 ? (
          <Typography color="text.secondary">{empty}</Typography>
        ) : (
          <List dense disablePadding>
            {items.map((item) => (
              <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start' }}>
                <ListItemIcon sx={{ minWidth: 20, mt: 1.1 }}>
                  <Typography component="span" aria-hidden sx={{ lineHeight: 0, fontSize: 18 }}>
                    •
                  </Typography>
                </ListItemIcon>
                <ListItemText primary={item} />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  )
}

export default function InsightLists({ result }: { result: MatchResult }) {
  const cards: InsightCardProps[] = [
    {
      title: 'Strengths',
      icon: <CheckCircleOutlined color="success" />,
      items: result.strengths,
      empty: 'No standout strengths were identified.',
    },
    {
      title: 'Gaps',
      icon: <WarningAmberOutlined color="warning" />,
      items: result.gaps,
      empty: 'No significant gaps were identified.',
    },
    {
      title: 'Tailor the resume',
      icon: <EditNoteOutlined color="secondary" />,
      items: result.resume_tips,
      empty: 'The resume already presents its relevant experience well.',
    },
    {
      title: 'Skills to build',
      icon: <SchoolOutlined color="secondary" />,
      items: result.skills_to_build,
      empty: 'No missing skills to build.',
    },
  ]

  return (
    <Grid container spacing={2}>
      {cards.map((card) => (
        <Grid key={card.title} size={{ xs: 12, md: 6 }}>
          <InsightCard {...card} />
        </Grid>
      ))}
    </Grid>
  )
}
