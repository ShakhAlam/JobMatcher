import { Alert, AlertTitle, Button } from '@mui/material'

interface LoadErrorAlertProps {
  /** What failed to load, e.g. "settings". */
  what: string
  error: Error
  onRetry: () => void
  retrying?: boolean
}

/** A page's data failed to load (usually the backend is down): say so and offer a retry. */
export default function LoadErrorAlert({ what, error, onRetry, retrying }: LoadErrorAlertProps) {
  return (
    <Alert
      severity="error"
      action={
        <Button color="inherit" size="small" onClick={onRetry} disabled={retrying}>
          {retrying ? 'Retrying…' : 'Try again'}
        </Button>
      }
    >
      <AlertTitle>Couldn't load {what}</AlertTitle>
      {error.message}
    </Alert>
  )
}
