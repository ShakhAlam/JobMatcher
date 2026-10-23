import { Alert, AlertTitle, Button, Stack } from '@mui/material'
import { isRouteErrorResponse, useRouteError } from 'react-router'

/** Shown inside the app shell when a page fails to render, so navigation keeps working. */
export default function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  return (
    <Stack spacing={2} sx={{ py: 4 }}>
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      >
        <AlertTitle>Something went wrong on this page</AlertTitle>
        {message}
      </Alert>
    </Stack>
  )
}
