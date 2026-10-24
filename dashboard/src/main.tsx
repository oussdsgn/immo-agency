import '@fontsource-variable/plus-jakarta-sans'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/ui/Toast'
import { I18nProvider } from '@/i18n'
import { AlertsProvider } from './alerts/AlertsProvider'
import { LoginPage } from './auth/LoginPage'
import { PendingPage } from './auth/PendingPage'
import { RequireStaff, StaffProvider } from './auth/staff'
import { Shell } from './layout/Shell'
import { db } from './lib/supabase'
import { AnnouncementsPage } from './pages/AnnouncementsPage'
import { DispatchPage } from './pages/DispatchPage'
import { LeadsPage } from './pages/LeadsPage'
import { NotConfigured } from './pages/NotConfigured'
import { OverviewPage } from './pages/OverviewPage'
import { ReportDetailPage } from './pages/ReportDetailPage'
import { ReportsPage } from './pages/ReportsPage'
import { ResidenceDetailPage } from './pages/ResidenceDetailPage'
import { ResidencesPage } from './pages/ResidencesPage'
import { TeamPage } from './pages/TeamPage'
import { TechniciansPage } from './pages/TechniciansPage'

// The dashboard is French-only for now; the shared i18n provides status and
// category labels identical to the resident app.
try {
  localStorage.setItem('immo-agency.locale', 'fr')
} catch {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nProvider>
      <ToastProvider>
        {!db ? (
          <NotConfigured />
        ) : (
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <StaffProvider>
              <Routes>
                <Route path="/connexion" element={<LoginPage />} />
                <Route path="/en-attente" element={<PendingPage />} />
                <Route
                  element={
                    <RequireStaff>
                      <AlertsProvider>
                        <Shell />
                      </AlertsProvider>
                    </RequireStaff>
                  }
                >
                  <Route index element={<OverviewPage />} />
                  <Route path="signalements" element={<ReportsPage />} />
                  <Route path="signalements/:id" element={<ReportDetailPage />} />
                  <Route path="interventions" element={<DispatchPage />} />
                  <Route path="immeubles" element={<ResidencesPage />} />
                  <Route path="immeubles/:id" element={<ResidenceDetailPage />} />
                  <Route path="techniciens" element={<TechniciansPage />} />
                  <Route path="annonces" element={<AnnouncementsPage />} />
                  <Route path="demandes" element={<LeadsPage />} />
                  <Route path="equipe" element={<TeamPage />} />
                  <Route path="*" element={<OverviewPage />} />
                </Route>
              </Routes>
            </StaffProvider>
          </BrowserRouter>
        )}
      </ToastProvider>
    </I18nProvider>
  </StrictMode>,
)
