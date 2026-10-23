import { useState } from 'react'
import DeleteOutlined from '@mui/icons-material/DeleteOutlined'
import KeyOutlined from '@mui/icons-material/KeyOutlined'
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined'
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined'
import { Button, Chip, IconButton, InputAdornment, Stack, TextField, Typography } from '@mui/material'
import type { ApiKeyStatus } from '../api/types'

interface ApiKeyFieldProps {
  providerName: string
  status: ApiKeyStatus
  /** A newly typed key (not saved yet). */
  value: string
  onChange: (key: string) => void
  removePending: boolean
  onRemove: () => void
}

export default function ApiKeyField({
  providerName,
  status,
  value,
  onChange,
  removePending,
  onRemove,
}: ApiKeyFieldProps) {
  const [visible, setVisible] = useState(false)
  const hasSaved = status.source === 'saved' && !removePending

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography variant="subtitle2">API key</Typography>
        {hasSaved && <Chip size="small" icon={<KeyOutlined />} label={`Saved: ${status.masked}`} variant="outlined" />}
        {status.source === 'env' && (
          <Chip size="small" icon={<KeyOutlined />} label={`From environment: ${status.masked}`} variant="outlined" />
        )}
        {removePending && <Chip size="small" color="warning" label="Will be removed on save" />}
        {!status.source && !value && <Chip size="small" color="warning" label="No key yet" />}
        {hasSaved && (
          <Button size="small" color="inherit" startIcon={<DeleteOutlined />} onClick={onRemove}>
            Remove
          </Button>
        )}
      </Stack>
      <TextField
        label={status.source ? `Replace ${providerName} API key` : `${providerName} API key`}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        helperText="Stored only in this app's local database. The full key is never shown again."
        slotProps={{
          htmlInput: { spellCheck: false },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  aria-label={visible ? 'Hide API key' : 'Show API key'}
                  onClick={() => setVisible((v) => !v)}
                  edge="end"
                >
                  {visible ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
    </Stack>
  )
}
