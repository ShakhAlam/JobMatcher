import RefreshOutlined from '@mui/icons-material/RefreshOutlined'
import { Alert, Autocomplete, Box, IconButton, Stack, TextField, Tooltip, Typography } from '@mui/material'
import type { ModelList } from '../api/types'

interface ModelPickerProps {
  value: string
  onChange: (model: string) => void
  list: ModelList | undefined
  loading: boolean
  onRefresh: () => void
  /** Shown under the field when the list is a suggestion rather than live. */
  suggestedHint: string
}

/** Pick a model from the provider's list, or type any model id (the list may be incomplete). */
export default function ModelPicker({ value, onChange, list, loading, onRefresh, suggestedHint }: ModelPickerProps) {
  const options = list?.models ?? []
  const optionFor = (id: string) => options.find((o) => o.id === id)
  /** The provider's display name, only when it adds something beyond the id. */
  const friendlyName = (id: string) => {
    const label = optionFor(id)?.label
    return label && label !== id ? label : null
  }
  const detailFor = (id: string) => optionFor(id)?.detail ?? null
  const join = (...parts: (string | null)[]) => parts.filter(Boolean).join(' · ')

  return (
    <Stack spacing={1}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Autocomplete
          freeSolo
          forcePopupIcon
          fullWidth
          options={options.map((o) => o.id)}
          value={value}
          loading={loading}
          onChange={(_, next) => onChange(next ?? '')}
          onInputChange={(_, next, reason) => {
            if (reason === 'input') onChange(next)
          }}
          // The field always shows the exact model id that will be sent; friendly names live in the list.
          getOptionLabel={(id) => id}
          renderOption={({ key, ...props }, id) => (
            <Box component="li" key={key} {...props}>
              <Stack>
                <Typography>{friendlyName(id) ?? id}</Typography>
                {join(friendlyName(id) && id, detailFor(id)) && (
                  <Typography variant="caption" color="text.secondary">
                    {join(friendlyName(id) && id, detailFor(id))}
                  </Typography>
                )}
              </Stack>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Model"
              helperText={
                join(friendlyName(value), detailFor(value)) || (list?.source === 'suggested' ? suggestedHint : ' ')
              }
            />
          )}
        />
        <Tooltip title="Reload the model list">
          <span>
            <IconButton aria-label="Reload the model list" onClick={onRefresh} disabled={loading} sx={{ mt: 1 }}>
              <RefreshOutlined />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>
      {list?.error && (
        <Alert severity="warning" variant="outlined">
          {list.error}
        </Alert>
      )}
      {list && !list.error && list.source === 'live' && options.length === 0 && (
        <Alert severity="info" variant="outlined">
          No models found. Pull one with <code>ollama pull qwen2.5-coder:14b</code>, then reload.
        </Alert>
      )}
    </Stack>
  )
}
