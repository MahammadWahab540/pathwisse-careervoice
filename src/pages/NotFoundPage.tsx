import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Button } from '../components/ui';
import { FileQuestion, ArrowRight } from 'lucide-react';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <AuthLayout
      title="Page Not Found"
      subtitle="The page you requested could not be located or has moved."
    >
      <div className="space-y-6">
        <div className="p-5 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-xs">
            <FileQuestion className="w-6 h-6 text-[#64748b]" />
          </div>
          <p className="text-xs text-[#64748b] leading-relaxed max-w-xs">
            Check the link address or return to the main dashboard to continue your CareerVoice assessment or placement management.
          </p>
        </div>

        <Button
          variant="primary"
          size="lg"
          isFullWidth
          onClick={() => navigate('/')}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          Return to CareerVoice Home
        </Button>
      </div>
    </AuthLayout>
  );
}
