import { useState } from 'react'
import CloudOutlined from '@mui/icons-material/CloudOutlined'
import ComputerOutlined from '@mui/icons-material/ComputerOutlined'
import NetworkCheckOutlined from '@mui/icons-material/NetworkCheckOutlined'
import SaveOutlined from '@mui/icons-material/SaveOutlined'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Slider,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useTheme } from '@mui/material/styles'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSettings, listModels, testConnection, updateSettings } from '../api/client'
import { SETTINGS_QUERY_KEY } from '../api/queryKeys'
import {
  type ConnectionResult,
  type HostedProvider,
  type LLMProvider,
  PROVIDER_NAMES,
  type SettingsUpdate,
  type UserSettings,
} from '../api/types'
import LoadErrorAlert from '../components/LoadErrorAlert'
import PageHeader from '../components/PageHeader'
import ApiKeyField from '../settings/ApiKeyField'
import ModelPicker from '../settings/ModelPicker'
import { useDebouncedValue } from '../settings/useDebouncedValue'

const PROVIDERS: { id: LLMProvider; caption: string; icon: React.ReactElement }[] = [
  { id: 'ollama', caption: 'Runs on this computer', icon: <ComputerOutlined /> },
  { id: 'anthropic', caption: 'Anthropic API', icon: <CloudOutlined /> },
  { id: 'openai', caption: 'OpenAI API', icon: <CloudOutlined /> },
]

const NO_KEYS: Record<HostedProvider, string> = { anthropic: '', openai: '' }
const NO_REMOVALS: Record<HostedProvider, boolean> = { anthropic: false, openai: false }

export default function SettingsPage() {
  const { data, error, isPending, isFetching, refetch } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: getSettings,
  })
  // Bumped after a save so the form re-initialises from what the server stored.
  const [formVersion, setFormVersion] = useState(0)
  // Lives here, not in the form, because the form remounts after a save.
  const [toast, setToast] = useState<string | null>(null)

  return (
    <>
      <PageHeader title="Settings" subtitle="Choose the model that scores resumes and manage API keys." />
      {isPending && <CircularProgress aria-label="Loading settings" />}
      {error && <LoadErrorAlert what="settings" error={error} onRetry={() => void refetch()} retrying={isFetching} />}
      {data && (
        <SettingsForm
          key={formVersion}
          saved={data}
          onSaved={() => {
            setFormVersion((v) => v + 1)
            setToast('Settings saved')
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

interface SettingsFormProps {
  saved: UserSettings
  onSaved: () => void
}

function SettingsForm({ saved, onSaved }: SettingsFormProps) {
  const queryClient = useQueryClient()
  const [provider, setProvider] = useState(saved.provider)
  const [models, setModels] = useState(saved.models)
  const [ollamaUrl, setOllamaUrl] = useState(saved.ollama_base_url)
  const [temperature, setTemperature] = useState(saved.temperature)
  const [newKeys, setNewKeys] = useState(NO_KEYS)
  const [removeKeys, setRemoveKeys] = useState(NO_REMOVALS)
  const [testResult, setTestResult] = useState<ConnectionResult | null>(null)

  const hosted = provider === 'ollama' ? null : provider
  // Three wide buttons don't fit side by side on a phone; stack them so the group borders stay intact.
  const stackProviders = useMediaQuery(useTheme().breakpoints.down('sm'))
  const model = models[provider]
  const newKey = hosted ? newKeys[hosted].trim() : ''

  // Reload the list when the server URL or a typed key settles, not on every keystroke.
  const listUrl = useDebouncedValue(ollamaUrl.trim())
  const listKey = useDebouncedValue(newKey)
  const modelList = useQuery({
    queryKey: ['models', provider, provider === 'ollama' ? listUrl : listKey],
    queryFn: () =>
      listModels(
        provider === 'ollama'
          ? { provider, ollama_base_url: listUrl || undefined }
          : { provider, api_key: listKey || undefined },
      ),
    staleTime: 60_000,
  })

  const change = buildUpdate(saved, { provider, models, ollamaUrl, temperature, newKeys, removeKeys })
  const dirty = Object.keys(change).length > 0

  const save = useMutation({
    mutationFn: () => updateSettings(change),
    onSuccess: (stored) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, stored)
      void queryClient.invalidateQueries({ queryKey: ['models'] })
      onSaved()
    },
  })

  const test = useMutation({
    mutationFn: () =>
      testConnection({
        provider,
        model,
        api_key: newKey || undefined,
        base_url: provider === 'ollama' ? ollamaUrl.trim() : undefined,
      }),
    onMutate: () => setTestResult(null),
    onSuccess: setTestResult,
    onError: (err) => setTestResult({ ok: false, message: err.message, latency_ms: null }),
  })

  const keyMissing = hosted !== null && !newKey && (saved.api_keys[hosted].source === null || removeKeys[hosted])

  return (
    <Stack spacing={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Model provider
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={provider}
            onChange={(_, next: LLMProvider | null) => {
              if (next) {
                setProvider(next)
                setTestResult(null)
              }
            }}
            aria-label="Model provider"
            orientation={stackProviders ? 'vertical' : 'horizontal'}
          >
            {PROVIDERS.map((p) => (
              <ToggleButton key={p.id} value={p.id} sx={{ py: 1.5, gap: 1.5, justifyContent: 'flex-start' }}>
                {p.icon}
                <Stack sx={{ alignItems: 'flex-start', textAlign: 'left' }}>
                  <Typography sx={{ fontWeight: 600, textTransform: 'none' }}>{PROVIDER_NAMES[p.id]}</Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'none' }}>
                    {p.caption}
                  </Typography>
                </Stack>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <Divider sx={{ my: 3 }} />

          <Stack spacing={3}>
            {provider === 'ollama' && (
              <TextField
                label="Ollama server URL"
                value={ollamaUrl}
                onChange={(event) => setOllamaUrl(event.target.value)}
                helperText="Usually http://localhost:11434"
                error={!ollamaUrl.trim()}
              />
            )}
            {hosted && (
              <ApiKeyField
                providerName={PROVIDER_NAMES[hosted]}
                status={saved.api_keys[hosted]}
                value={newKeys[hosted]}
                onChange={(key) => setNewKeys((k) => ({ ...k, [hosted]: key }))}
                removePending={removeKeys[hosted]}
                onRemove={() => setRemoveKeys((r) => ({ ...r, [hosted]: true }))}
              />
            )}
            <ModelPicker
              value={model}
              onChange={(next) => setModels((m) => ({ ...m, [provider]: next }))}
              list={modelList.data}
              loading={modelList.isFetching}
              onRefresh={() => void modelList.refetch()}
              suggestedHint="Suggested models. Add an API key to load your account's full list."
            />
            <Box sx={{ maxWidth: 380 }}>
              <Typography id="temperature-label" variant="subtitle2">
                Temperature: {temperature.toFixed(1)}
              </Typography>
              {/* Side padding on a wrapper: margin on the Slider itself would add to its 100% width. */}
              <Box sx={{ px: 1 }}>
                <Slider
                  aria-labelledby="temperature-label"
                  value={temperature}
                  onChange={(_, v) => setTemperature(v as number)}
                  min={0}
                  max={1}
                  step={0.1}
                  marks={[
                    { value: 0, label: 'Consistent' },
                    { value: 1, label: 'Varied' },
                  ]}
                  sx={{
                    // Keep the end labels inside the card instead of centring them past its edges.
                    '& .MuiSlider-markLabel[data-index="0"]': { transform: 'translateX(-8px)' },
                    '& .MuiSlider-markLabel[data-index="1"]': { transform: 'translateX(calc(-100% + 8px))' },
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary" component="p">
                0 gives the most repeatable scores for the same inputs.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {testResult && (
        <Alert severity={testResult.ok ? 'success' : 'error'} onClose={() => setTestResult(null)}>
          {testResult.message}
        </Alert>
      )}
      {save.error && <Alert severity="error">{save.error.message}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
        <Button
          variant="outlined"
          startIcon={test.isPending ? <CircularProgress size={18} /> : <NetworkCheckOutlined />}
          onClick={() => test.mutate()}
          disabled={test.isPending || !model.trim() || keyMissing}
        >
          {test.isPending ? 'Testing…' : 'Test connection'}
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {dirty && <Chip size="small" label="Unsaved changes" color="warning" variant="outlined" />}
        <Button
          variant="contained"
          startIcon={<SaveOutlined />}
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending || !model.trim() || !ollamaUrl.trim()}
        >
          Save
        </Button>
      </Stack>
      {keyMissing && (
        <Typography variant="body2" color="text.secondary">
          Add a {PROVIDER_NAMES[hosted]} API key to test or score with {PROVIDER_NAMES[hosted]}.
        </Typography>
      )}
    </Stack>
  )
}

interface Draft {
  provider: LLMProvider
  models: Record<LLMProvider, string>
  ollamaUrl: string
  temperature: number
  newKeys: Record<HostedProvider, string>
  removeKeys: Record<HostedProvider, boolean>
}

/** Only the fields that differ from what is saved, in the shape PUT /api/settings expects. */
function buildUpdate(saved: UserSettings, draft: Draft): SettingsUpdate {
  const change: SettingsUpdate = {}
  if (draft.provider !== saved.provider) change.provider = draft.provider
  const models = Object.fromEntries(
    Object.entries(draft.models).filter(([p, m]) => m.trim() && m.trim() !== saved.models[p as LLMProvider]),
  )
  if (Object.keys(models).length) change.models = models
  if (draft.ollamaUrl.trim() && draft.ollamaUrl.trim() !== saved.ollama_base_url)
    change.ollama_base_url = draft.ollamaUrl.trim()
  if (draft.temperature !== saved.temperature) change.temperature = draft.temperature
  const keys: SettingsUpdate['api_keys'] = {}
  for (const p of ['anthropic', 'openai'] as const) {
    if (draft.newKeys[p].trim()) keys[p] = draft.newKeys[p].trim()
    else if (draft.removeKeys[p]) keys[p] = null
  }
  if (Object.keys(keys).length) change.api_keys = keys
  return change
}
