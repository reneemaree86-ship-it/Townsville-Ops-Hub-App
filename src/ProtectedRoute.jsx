import { useAuth } from '@/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

export default function ProtectedRoute({ unauthenticatedElement }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) return null;
  return isAuthenticated ? <Outlet /> : (unauthenticatedElement || <Navigate to="/login" replace />);
}
