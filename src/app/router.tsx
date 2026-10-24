import { createBrowserRouter } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { AcquisitionPage } from '@/features/acquisition/AcquisitionPage'
import { ListingDetailPage } from '@/features/acquisition/ListingDetailPage'
import { SignInPage } from '@/features/auth/SignInPage'
import { DevToolsPage } from '@/features/dev/DevToolsPage'
import { EmergencyPage } from '@/features/emergency/EmergencyPage'
import { HomePage } from '@/features/home/HomePage'
import { NotFoundPage } from '@/features/NotFoundPage'
import { NotificationsPage } from '@/features/notifications/NotificationsPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { AboutPage } from '@/features/profile/AboutPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { PropertiesPage } from '@/features/properties/PropertiesPage'
import { PropertyDetailPage } from '@/features/properties/PropertyDetailPage'
import { ConfirmationPage } from '@/features/reports/ConfirmationPage'
import { NewReportPage } from '@/features/reports/new/NewReportPage'
import { ReportDetailPage } from '@/features/reports/ReportDetailPage'
import { ReportsPage } from '@/features/reports/ReportsPage'
import { RequireSession } from './session'

/** French slugs are kept in both languages so links stay stable. */
export const router = createBrowserRouter([
  { path: '/bienvenue', element: <OnboardingPage /> },
  { path: '/connexion', element: <SignInPage /> },
  {
    element: (
      <RequireSession>
        <AppShell />
      </RequireSession>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'biens', element: <PropertiesPage /> },
      { path: 'biens/:id', element: <PropertyDetailPage /> },
      { path: 'signaler', element: <NewReportPage /> },
      { path: 'signaler/confirmation/:id', element: <ConfirmationPage /> },
      { path: 'signalements', element: <ReportsPage /> },
      { path: 'signalements/:id', element: <ReportDetailPage /> },
      { path: 'acquerir', element: <AcquisitionPage /> },
      { path: 'acquerir/:id', element: <ListingDetailPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'urgences', element: <EmergencyPage /> },
      { path: 'profil', element: <ProfilePage /> },
      { path: 'a-propos', element: <AboutPage /> },
      { path: 'dev', element: <DevToolsPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
