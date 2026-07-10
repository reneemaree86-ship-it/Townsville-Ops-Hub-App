import { Toaster } from "@/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PageNotFound from '@/PageNotFound';
import { AuthProvider, useAuth } from '@/AuthContext';
import ScrollToTop from '@/ScrollToTop';
import ProtectedRoute from '@/ProtectedRoute';
import Login from '@/Login';
import Register from '@/Register';
import ForgotPassword from '@/ForgotPassword';
import ResetPassword from '@/ResetPassword';

// Layout
import DashboardLayout from '@/DashboardLayout';

// Pages
import Dashboard from '@/Dashboard';
import SeoControlCentre from '@/SeoControlCentre';
import WebsiteCrawlCentre from '@/WebsiteCrawlCentre';
import OrganicTraffic from '@/OrganicTraffic';
import QaTestingCentre from '@/QaTestingCentre';
import LeadFinder from '@/LeadFinder';
import TownsvilleLeads from '@/TownsvilleLeads';
import AdGenerator from '@/AdGenerator';
import PlatformStatus from '@/PlatformStatus';
import ErrorFixLog from '@/ErrorFixLog';
import ScanHistory from '@/ScanHistory';
import Notifications from '@/Notifications';
import FollowUps from '@/FollowUps';
import ApprovalQueue from '@/ApprovalQueue';
import BusinessSettings from '@/BusinessSettings';
import UrlWatchlistPage from '@/UrlWatchlistPage';
import CleaningAgent from '@/CleaningAgent';
import ReneesCleaningProfile from '@/ReneesCleaningProfile';
import BusinessInbox from '@/BusinessInbox';
import Invoices from '@/Invoices';
import Clients from '@/Clients';
import Quotes from '@/Quotes';
import ServicesCatalog from '@/ServicesCatalog';
import Jobs from '@/Jobs';

// ---------------------------------------------------------------------------
// FacebookOAuthCatcher
//
// Facebook redirects back to the app root with ?code=xxx&state=fb_connect
// This component MUST run OUTSIDE of AuthenticatedApp so it fires before any
// auth check, spinner, or navigateToLogin() can wipe the URL.
//
// Strategy:
//   1. On first render, synchronously read the URL params (no useEffect delay).
//   2. If we see a valid code+state, stash the code in sessionStorage immediately.
//   3. Navigate to /platforms so PlatformStatus picks it up and calls the backend.
// ---------------------------------------------------------------------------
const FacebookOAuthCatcher = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Run synchronously on every render so we catch the code as soon as possible.
  // We use a ref-free inline check rather than useEffect to avoid the one-frame
  // delay that lets the auth guard fire first.
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const state = params.get('state');

  useEffect(() => {
    if (code && state === 'fb_connect') {
      // Store the code before any navigation can occur
      sessionStorage.setItem('fb_oauth_code', code);
      // Replace the current history entry so the user can't land back on /?code=...
      navigate('/platforms', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

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
      return <div>User not registered.</div>;
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
          <Route path="/inbox" element={<BusinessInbox />} />
          <Route path="/invoices" element={<Invoices />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/quotes" element={<Quotes />} />
          <Route path="/services" element={<ServicesCatalog />} />
          <Route path="/jobs" element={<Jobs />} />
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
          <Route path="/renees-cleaning" element={<ReneesCleaningProfile />} />
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
          {/* FacebookOAuthCatcher MUST be outside AuthenticatedApp so it fires
              before any auth check can navigate away from the callback URL */}
          <FacebookOAuthCatcher />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
