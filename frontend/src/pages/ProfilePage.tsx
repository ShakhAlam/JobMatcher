import { useState } from 'react'
import PersonOutlined from '@mui/icons-material/PersonOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getProfile, updateProfile } from '../api/client'
import { PROFILE_QUERY_KEY } from '../api/queryKeys'
import type { Profile } from '../api/types'
import LoadErrorAlert from '../components/LoadErrorAlert'
import PageHeader from '../components/PageHeader'
import { initials } from '../components/initials'
import DocumentInput from '../score/DocumentInput'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function ProfilePage() {
  const { data, error, isPending, isFetching, refetch } = useQuery({ queryKey: PROFILE_QUERY_KEY, queryFn: getProfile })
  // Bumped after a save so the form re-initialises from what the server stored.
  const [formVersion, setFormVersion] = useState(0)
  const [toast, setToast] = useState<string | null>(null)

  return (
    <>
      <PageHeader title="Profile" subtitle="Your details and the default resume used for scoring." />
      {isPending && <CircularProgress aria-label="Loading profile" />}
      {error && (
        <LoadErrorAlert what="your profile" error={error} onRetry={() => void refetch()} retrying={isFetching} />
      )}
      {data && (
        <ProfileForm
          key={formVersion}
          saved={data}
          onSaved={() => {
            setFormVersion((v) => v + 1)
            setToast('Profile saved')
          }}
        />
      )}
      <Snackbar
        open={toast !== null}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
    </>
  )
}

function ProfileForm({ saved, onSaved }: { saved: Profile; onSaved: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(saved.name)
  const [email, setEmail] = useState(saved.email ?? '')
  const [headline, setHeadline] = useState(saved.headline)
  const [resume, setResume] = useState(saved.default_resume)
  const [resumeFile, setResumeFile] = useState(saved.default_resume_filename)

  const emailInvalid = email.trim() !== '' && !EMAIL_PATTERN.test(email.trim())
  const dirty =
    name !== saved.name ||
    email !== (saved.email ?? '') ||
    headline !== saved.headline ||
    resume !== saved.default_resume ||
    resumeFile !== saved.default_resume_filename

  const save = useMutation({
    mutationFn: () =>
      updateProfile({
        name,
        email: email.trim() || null,
        headline,
        default_resume: resume,
        default_resume_filename: resume ? resumeFile : null,
      }),
    onSuccess: (stored) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, stored)
      onSaved()
    },
  })

  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack spacing={2.5}>
                <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                  <Avatar sx={{ width: 64, height: 64, fontSize: 24, bgcolor: 'secondary.main' }}>
                    {initials(name) || <PersonOutlined />}
                  </Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" component="h2" noWrap>
                      {name.trim() || 'About you'}
                    </Typography>
                    <Typography color="text.secondary" noWrap>
                      {headline.trim() || 'Add a name and headline'}
                    </Typography>
                  </Box>
                </Stack>
                <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  error={emailInvalid}
                  helperText={emailInvalid ? 'Enter a valid email address' : 'Optional'}
                />
                <TextField
                  label="Headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  placeholder="e.g. Senior Java engineer, fintech"
                  slotProps={{ htmlInput: { maxLength: 200 } }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={1} sx={{ height: '100%' }}>
            <DocumentInput
              label="Default resume"
              placeholder="Paste or upload the resume you score most often. The Score page starts with it."
              value={resume}
              onChange={(text) => {
                setResume(text)
                setResumeFile(null)
              }}
              onFileLoaded={setResumeFile}
            />
            {resumeFile && (
              <Box>
                <Chip size="small" label={`From ${resumeFile}`} variant="outlined" />
              </Box>
            )}
          </Stack>
        </Grid>
      </Grid>

      {save.error && <Alert severity="error">{save.error.message}</Alert>}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
        {dirty && <Chip size="small" label="Unsaved changes" color="warning" variant="outlined" />}
        <Button
          variant="contained"
          startIcon={<SaveOutlined />}
          onClick={() => save.mutate()}
          disabled={!dirty || emailInvalid || save.isPending}
        >
          Save
        </Button>
      </Stack>
    </Stack>
  )
}
