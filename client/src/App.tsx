import { RouterProvider } from 'react-router/dom'
import router from './routes'
import AppTheme from './AppTheme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ToastContainer } from 'react-toastify'
import { AppProvider } from './providers/app.provider'

import { ErrorBoundary } from 'react-error-boundary'
import { Box, Typography, Button } from '@mui/material'

const ErrorFallback = ({ error, resetErrorBoundary }: any) => {
  return (
    <Box sx={{ p: 5, textAlign: 'center', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
      <Typography variant="h4" gutterBottom fontWeight={1000}>Hệ thống đang bảo trì</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Chúng tôi xin lỗi vì sự bất tiện này. Vui lòng thử lại sau.</Typography>
      <Button variant="contained" onClick={resetErrorBoundary} sx={{ borderRadius: 100, px: 4 }}>THỬ LẠI</Button>
      {process.env.NODE_ENV === 'development' && (
        <Typography variant="caption" sx={{ mt: 4, opacity: 0.5 }}>{error.message}</Typography>
      )}
    </Box>
  )
}

const App = () => {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <AppProvider>
        <AppTheme>
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <RouterProvider router={router} />
          </ErrorBoundary>
        </AppTheme>
        <ReactQueryDevtools initialIsOpen={false} />
        <ToastContainer
          position='top-right'
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme='colored'
        />
      </AppProvider>
    </QueryClientProvider>
  )
}

export default App
