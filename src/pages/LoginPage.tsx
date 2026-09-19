import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthStep } from '../components/auth/AuthStep';
import { useAuth } from '../context/AuthContext';
import type { UserIdentity } from '../types';
import type { UserRole } from '../domain/careerVoiceFlow';

const PLACEMENT_ROLES = new Set<string>(['placement_team', 'college', 'college_management']);

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { identity, userRole, setIdentity, setUserRole } = useAuth();

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (identity) {
      const next = searchParams.get('next');
      if (next && next.startsWith('/')) {
        navigate(next, { replace: true });
      } else if (userRole && PLACEMENT_ROLES.has(userRole)) {
        navigate('/placement', { replace: true });
      } else if (userRole === 'student') {
        navigate('/student', { replace: true });
      } else {
        navigate('/onboarding/role', { replace: true });
      }
    }
  }, [identity, userRole, navigate, searchParams]);

  const handleAuthenticated = (newIdentity: UserIdentity, initialRole?: UserRole) => {
    setIdentity(newIdentity);
    if (initialRole) setUserRole(initialRole);

    const next = searchParams.get('next');
    if (next && next.startsWith('/')) {
      navigate(next, { replace: true });
      return;
    }

    if (initialRole && PLACEMENT_ROLES.has(initialRole)) {
      navigate('/placement', { replace: true });
    } else if (initialRole === 'student') {
      navigate('/student', { replace: true });
    } else {
      navigate('/onboarding/role', { replace: true });
    }
  };

  return <AuthStep onAuthenticated={handleAuthenticated} />;
}
