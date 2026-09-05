import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { store } from '@/store'
import { AppShell } from '@/components/layout/AppShell'
import { DashboardPage } from '@/pages/DashboardPage'
import { IncidentsPage } from '@/pages/IncidentsPage'
import { ServiceRequestsPage } from '@/pages/ServiceRequestsPage'
import { ChangesPage } from '@/pages/ChangesPage'
import { SLAPage } from '@/pages/SLAPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { SettingsPage } from '@/pages/SettingsPage'

import '@/styles/index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
})

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider delayDuration={300}>
            <BrowserRouter>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/incidents" element={<IncidentsPage />} />
                  <Route path="/service-requests" element={<ServiceRequestsPage />} />
                  <Route path="/changes" element={<ChangesPage />} />
                  <Route path="/sla" element={<SLAPage />} />
                  <Route path="/assets" element={<AssetsPage />} />
                  <Route path="/knowledge-base" element={<KnowledgeBasePage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </BrowserRouter>
            <Toaster position="top-right" />
          </TooltipProvider>
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  )
}
