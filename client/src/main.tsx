import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

import { store } from '@/store'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { PublicOnlyRoute } from '@/components/auth/PublicOnlyRoute'
import { RoleGuard } from '@/components/auth/RoleGuard'
import { AppBootstrap } from '@/components/auth/AppBootstrap'
import { DashboardPage } from '@/pages/DashboardPage'
import { IncidentsPage } from '@/pages/IncidentsPage'
import { ServiceRequestsPage } from '@/pages/ServiceRequestsPage'
import { ChangesPage } from '@/pages/ChangesPage'
import { SLAPage } from '@/pages/SLAPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { KnowledgeBasePage } from '@/pages/KnowledgeBasePage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { UserManagementPage } from '@/pages/UserManagementPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { VerifyEmailPage } from '@/pages/auth/VerifyEmailPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage'
import { AcceptInvitePage } from '@/pages/auth/AcceptInvitePage'

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
              <AppBootstrap>
                <Routes>
                  {/* Public auth routes */}
                  <Route
                    path="/login"
                    element={
                      <PublicOnlyRoute>
                        <LoginPage />
                      </PublicOnlyRoute>
                    }
                  />
                  {/*
                   * RegisterPage is kept for backward compatibility with existing
                   * accounts and the test suite. New users must join through an
                   * admin invitation. The RegisterPage is no longer advertised in
                   * the UI — it is only reachable by direct URL access.
                   */}
                  <Route
                    path="/register"
                    element={
                      <PublicOnlyRoute>
                        <RegisterPage />
                      </PublicOnlyRoute>
                    }
                  />
                  <Route path="/verify-email" element={<VerifyEmailPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/*
                   * Accept invite — public but token-protected.
                   * Anyone with the token can accept it. No auth required.
                   */}
                  <Route path="/accept-invite" element={<AcceptInvitePage />} />

                  {/* Protected application routes */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppShell />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/incidents" element={<IncidentsPage />} />
                    <Route
                      path="/service-requests"
                      element={<ServiceRequestsPage />}
                    />
                    <Route path="/changes" element={<ChangesPage />} />
                    <Route path="/sla" element={<SLAPage />} />
                    <Route path="/assets" element={<AssetsPage />} />
                    <Route
                      path="/knowledge-base"
                      element={<KnowledgeBasePage />}
                    />
                    <Route path="/analytics" element={<AnalyticsPage />} />

                    {/*
                     * User Management — admin only.
                     * Backend independently enforces admin role on every mutation.
                     */}
                    <Route
                      path="/users"
                      element={
                        <RoleGuard allowedRoles={['admin']}>
                          <UserManagementPage />
                        </RoleGuard>
                      }
                    />

                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>

                  {/* Fallback */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppBootstrap>
            </BrowserRouter>
            <Toaster position="top-right" />
          </TooltipProvider>
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  )
}
