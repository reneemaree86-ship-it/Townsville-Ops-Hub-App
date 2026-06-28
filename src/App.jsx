import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

// Layout
import DashboardLayout from '@/components/layout/DashboardLayout';

// Pages
import Dashboard from '@/pages/Dashboard';
import SeoControlCentre from '@/pages/SeoControlCentre';
import WebsiteCrawlCentre from '@/pages/WebsiteCrawlCentre';
import OrganicTraffic from '@/pages/OrganicTraffic';
import QaTestingCentre from '@/pages/QaTestingCentre';
import LeadFinder from '@/pages/LeadFinder';
import TownsvilleLeads from '@/pages/TownsvilleLeads';
import AdGenerator from '@/pages/AdGenerator';
import PlatformStatus from '@/pages/PlatformStatus';
import ErrorFixLog from '@/pages/ErrorFixLog';
import ScanHistory from '@/pages/ScanHistory';
import Notifications from '@/pages/Notifications';
import FollowUps from '@/pages/FollowUps';
import ApprovalQueue from '@/pages/ApprovalQueue';
import BusinessSettings from '@/pages/BusinessSettings';
import UrlWatchlistPage from '@/pages/UrlWatchlistPage';
import CleaningAgent from '@/pages/CleaningAgent';
import FileCentre from '@/pages/FileCentre';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/seo" element={<SeoControlCentre />} />
          <Route path="/crawl" element={<WebsiteCrawlCentre />} />
          <Route path="/traffic" element={<OrganicTraffic />} />
          <Route path="/qa" element={<QaTestingCentre />} />
          <Route path="/leads" element={<LeadFinder />} />
          <Route path="/townsville-leads" element={<TownsvilleLeads />} />
          <Route path="/ads" element={<AdGenerator />} />
          <Route path="/platforms" element={<PlatformStatus />} />
          <Route path="/errors" element={<ErrorFixLog />} />
          <Route path="/scan-history" element={<ScanHistory />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/follow-ups" element={<FollowUps />} />
          <Route path="/approvals" element={<ApprovalQueue />} />
          <Route path="/settings" element={<BusinessSettings />} />
          <Route path="/watchlist" element={<UrlWatchlistPage />} />
          <Route path="/agent" element={<CleaningAgent />} />
          <Route path="/file-centre" element={<FileCentre />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;