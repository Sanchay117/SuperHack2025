import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (requiredRole && !hasRole(requiredRole)) {
      router.push('/dashboard'); // Redirect to dashboard if no permission
      return;
    }

    setAuthChecked(true);
  }, [user, loading, requiredRole, router, hasRole]);

  if (loading || !authChecked || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return children;
}

