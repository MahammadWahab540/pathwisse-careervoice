import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Loader2 } from 'lucide-react';

import { LoginPage } from './pages/LoginPage';
import { RolePage } from './pages/onboarding/RolePage';
import { StudentOnboardingPage } from './pages/onboarding/StudentOnboardingPage';
import { PlacementOnboardingPage } from './pages/onboarding/PlacementOnboardingPage';
import { InvitePage } from './pages/InvitePage';
import { StudentHomePage } from './pages/student/StudentHomePage';
import { AssessmentPage } from './pages/student/AssessmentPage';
import { StudentResultPage } from './pages/student/StudentResultPage';
import { PlacementOverviewPage } from './pages/placement/PlacementOverviewPage';
import { CampaignsPage } from './pages/placement/CampaignsPage';
import { NewCampaignPage } from './pages/placement/NewCampaignPage';
import { CampaignDetailPage } from './pages/placement/CampaignDetailPage';
import { StudentsPage } from './pages/placement/StudentsPage';
import { StudentDossierPage } from './pages/placement/StudentDossierPage';
import { ReportsPage } from './pages/placement/ReportsPage';
import { ReportDetailPage } from './pages/placement/ReportDetailPage';
import { InsightsPage } from './pages/placement/InsightsPage';
import { SettingsPage } from './pages/placement/SettingsPage';
import { UnauthorizedPage } from './pages/UnauthorizedPage';
import { NotFoundPage } from './pages/NotFoundPage';

function BootstrapSpinner() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#f8fafc] text-[#0b111d]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#ea580c]" />
        <p className="text-xs font-semibold text-[#64748b]">Loading CareerVoice…</p>
      </div>
    </div>
  );
}

const PLACEMENT_ROLES = new Set<string>(['placement_team', 'college', 'college_management']);

function RootRedirect() {
  const { identity, userRole } = useAuth();
  if (!identity) return <Navigate to="/login" replace />;
  if (userRole && PLACEMENT_ROLES.has(userRole)) return <Navigate to="/placement" replace />;
  if (userRole === 'student') return <Navigate to="/student" replace />;
  return <Navigate to="/onboarding/role" replace />;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { identity, isBootstrapping } = useAuth();
  const location = useLocation();
  if (isBootstrapping) return <BootstrapSpinner />;
  if (!identity) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

function StudentGuard({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuth();
  if (userRole && PLACEMENT_ROLES.has(userRole)) return <Navigate to="/placement" replace />;
  return <>{children}</>;
}

function PlacementGuard({ children }: { children: React.ReactNode }) {
  const { userRole } = useAuth();
  if (userRole === 'student') return <Navigate to="/student" replace />;
  return <>{children}</>;
}

export function AppRouter() {
  const { isBootstrapping } = useAuth();
  if (isBootstrapping) return <BootstrapSpinner />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Root Redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public & Auth Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/invite/:token" element={<InvitePage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/404" element={<NotFoundPage />} />

        {/* Onboarding Routes */}
        <Route path="/onboarding/role" element={<AuthGuard><RolePage /></AuthGuard>} />
        <Route
          path="/onboarding/student"
          element={<AuthGuard><StudentGuard><StudentOnboardingPage /></StudentGuard></AuthGuard>}
        />
        <Route
          path="/onboarding/placement"
          element={<AuthGuard><PlacementGuard><PlacementOnboardingPage /></PlacementGuard></AuthGuard>}
        />

        {/* Student Routes */}
        <Route
          path="/student"
          element={<AuthGuard><StudentGuard><StudentHomePage /></StudentGuard></AuthGuard>}
        />
        <Route
          path="/student/assessment"
          element={<AuthGuard><StudentGuard><AssessmentPage /></StudentGuard></AuthGuard>}
        />
        <Route
          path="/student/result/:assessmentId"
          element={<AuthGuard><StudentGuard><StudentResultPage /></StudentGuard></AuthGuard>}
        />

        {/* Placement Command Center Routes */}
        <Route
          path="/placement"
          element={<AuthGuard><PlacementGuard><PlacementOverviewPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/campaigns"
          element={<AuthGuard><PlacementGuard><CampaignsPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/campaigns/new"
          element={<AuthGuard><PlacementGuard><NewCampaignPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/campaigns/:campaignId"
          element={<AuthGuard><PlacementGuard><CampaignDetailPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/students"
          element={<AuthGuard><PlacementGuard><StudentsPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/students/:studentId"
          element={<AuthGuard><PlacementGuard><StudentDossierPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/reports"
          element={<AuthGuard><PlacementGuard><ReportsPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/reports/:reportId"
          element={<AuthGuard><PlacementGuard><ReportDetailPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/insights"
          element={<AuthGuard><PlacementGuard><InsightsPage /></PlacementGuard></AuthGuard>}
        />
        <Route
          path="/placement/messages"
          element={<Navigate to="/placement" replace />}
        />
        <Route
          path="/placement/settings"
          element={<AuthGuard><PlacementGuard><SettingsPage /></PlacementGuard></AuthGuard>}
        />

        {/* Wildcard Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
