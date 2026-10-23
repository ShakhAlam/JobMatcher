import { type DragEvent, type ReactNode, useId, useRef, useState } from 'react'
import ClearOutlined from '@mui/icons-material/ClearOutlined'
import InsertDriveFileOutlined from '@mui/icons-material/InsertDriveFileOutlined'
import UploadFileOutlined from '@mui/icons-material/UploadFileOutlined'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { extractText } from '../api/client'
import { ACCEPTED_UPLOAD_TYPES, MAX_INPUT_CHARS, MAX_UPLOAD_MB, MIN_INPUT_CHARS } from '../api/types'

interface DocumentInputProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  /** Extra buttons shown before Upload (e.g. "Use saved resume"). */
  actions?: ReactNode
  /** Called with the file name after an upload fills the field. */
  onFileLoaded?: (filename: string) => void
}

interface LoadedFile {
  name: string
  detail: string
  warnings: string[]
}

const numberFormat = new Intl.NumberFormat()

/** A large textarea that can also be filled by uploading or dropping a PDF, DOCX or text file. */
export default function DocumentInput({
  label,
  placeholder,
  value,
  onChange,
  disabled,
  actions,
  onFileLoaded,
}: DocumentInputProps) {
  const fieldId = useId()
  const fileInput = useRef<HTMLInputElement>(null)
  const [extracting, setExtracting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null)
  const [dragging, setDragging] = useState(false)

  const busy = disabled || extracting
  const length = value.length
  const tooShort = length > 0 && value.trim().length < MIN_INPUT_CHARS

  async function loadFile(file: File) {
    setUploadError(null)
    setLoadedFile(null)
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`${file.name} is larger than ${MAX_UPLOAD_MB} MB.`)
      return
    }
    setExtracting(true)
    try {
      const extracted = await extractText(file)
      onChange(extracted.text)
      onFileLoaded?.(extracted.filename)
      const parts = [extracted.file_type.toUpperCase()]
      if (extracted.pages) parts.push(`${extracted.pages} page${extracted.pages === 1 ? '' : 's'}`)
      parts.push(`${numberFormat.format(extracted.char_count)} characters`)
      setLoadedFile({ name: extracted.filename, detail: parts.join(' · '), warnings: extracted.warnings })
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Could not read that file.')
    } finally {
      setExtracting(false)
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file && !busy) void loadFile(file)
  }

  function clear() {
    onChange('')
    setLoadedFile(null)
    setUploadError(null)
  }

  return (
    <Card
      onDragOver={(event) => {
        event.preventDefault()
        if (!busy) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      sx={(theme) => ({
        height: '100%',
        position: 'relative',
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        ...(dragging && {
          borderColor: (theme.vars ?? theme).palette.primary.main,
          boxShadow: `0 0 0 2px ${theme.alpha((theme.vars ?? theme).palette.primary.main, 0.3)}`,
        }),
      })}
    >
      {extracting && <LinearProgress sx={{ position: 'absolute', top: 0, left: 0, right: 0 }} />}
      <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, height: '100%' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography component="label" htmlFor={fieldId} variant="h6" sx={{ flexGrow: 1 }}>
            {label}
          </Typography>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept={ACCEPTED_UPLOAD_TYPES}
            aria-label={`Upload ${label.toLowerCase()} file`}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = '' // allow re-selecting the same file
              if (file) void loadFile(file)
            }}
          />
          {actions}
          <Button
            size="small"
            variant="outlined"
            startIcon={<UploadFileOutlined />}
            onClick={() => fileInput.current?.click()}
            disabled={busy}
          >
            {extracting ? 'Reading…' : 'Upload'}
          </Button>
          <Tooltip title="Clear">
            <span>
              <IconButton
                size="small"
                aria-label={`Clear ${label.toLowerCase()}`}
                onClick={clear}
                disabled={busy || !value}
              >
                <ClearOutlined fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>

        {loadedFile && (
          <Box>
            <Chip
              size="small"
              icon={<InsertDriveFileOutlined />}
              label={`${loadedFile.name} — ${loadedFile.detail}`}
              onDelete={() => setLoadedFile(null)}
              sx={{ maxWidth: '100%' }}
            />
          </Box>
        )}
        {loadedFile?.warnings.map((warning) => (
          <Alert key={warning} severity="warning" variant="outlined">
            {warning}
          </Alert>
        ))}
        {uploadError && (
          <Alert severity="error" variant="outlined" onClose={() => setUploadError(null)}>
            {uploadError}
          </Alert>
        )}

        <TextField
          id={fieldId}
          multiline
          minRows={12}
          maxRows={22}
          fullWidth
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            if (loadedFile) setLoadedFile(null)
          }}
          placeholder={placeholder}
          disabled={busy}
          error={tooShort || length > MAX_INPUT_CHARS}
          slotProps={{ htmlInput: { maxLength: MAX_INPUT_CHARS, spellCheck: false } }}
          sx={{ flexGrow: 1, '& .MuiInputBase-root': { alignItems: 'flex-start', fontSize: '0.92rem' } }}
        />

        <Stack direction="row" sx={{ justifyContent: 'space-between', color: 'text.secondary' }}>
          <Typography variant="caption">
            {tooShort ? `Enter at least ${MIN_INPUT_CHARS} characters` : 'Paste text, or drop a PDF / DOCX here'}
          </Typography>
          <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {numberFormat.format(length)} / {numberFormat.format(MAX_INPUT_CHARS)}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  )
}
