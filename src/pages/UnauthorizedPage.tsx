import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const { userRole, logout } = useAuth();

  const handleReturnHome = () => {
    if (userRole === 'student') {
      navigate('/student');
    } else if (userRole && ['placement_team', 'college', 'college_management'].includes(userRole)) {
      navigate('/placement');
    } else {
      navigate('/');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <AuthLayout
      title="Access Restricted"
      subtitle="Your current account does not have permission to view this resource."
    >
      <div className="space-y-6">
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            You are signed in as <strong className="capitalize">{userRole?.replace('_', ' ') || 'User'}</strong>. If you believe this is an error, please contact your institutional administrator or switch accounts.
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <Button
            variant="primary"
            size="lg"
            isFullWidth
            onClick={handleReturnHome}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Return to Authorized Dashboard
          </Button>

          <Button
            variant="outline"
            size="md"
            isFullWidth
            onClick={handleLogout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out & Switch Account
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
