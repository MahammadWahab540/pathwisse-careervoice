import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertTriangle } from 'lucide-react';
import { PATHWISSE_LOGO_URL } from '../components/ui/PathwisseUI';

export function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setErrorMsg('Invalid invite link — no token found.');
      setStatus('error');
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      try {
        const res = await fetch(`/api/invite/${token}`);
        if (!res.ok) throw new Error('Invite link not found or expired.');
        const data = await res.json();
        if (!cancelled) {
          if (data?.campaignId) {
            sessionStorage.setItem('careervoice_campaign_id', data.campaignId);
          }
          if (data?.collegeId) {
            sessionStorage.setItem('careervoice_invite_college_id', data.collegeId);
          }
          navigate('/login?next=/student', { replace: true });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'This invite link is invalid or has expired.';
          setErrorMsg(message);
          setStatus('error');
        }
      }
    };

    resolve();
    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-[#f8fafc] text-[#0b111d] selection:bg-[#ea580c] selection:text-white">
      <div className="h-12 w-12 rounded-xl bg-white border border-[#e2e8f0] flex items-center justify-center shadow-xs overflow-hidden mb-3">
        <img src={PATHWISSE_LOGO_URL} alt="CareerVoice" className="h-9 w-9 object-contain" />
      </div>
      <p className="font-extrabold text-lg text-[#0b111d] tracking-tight mb-1">CareerVoice</p>
      <span className="text-xs text-[#64748b]">Campus Employability Assessment</span>

      {status === 'loading' && (
        <div className="flex flex-col items-center gap-3 mt-8">
          <Loader2 className="w-7 h-7 animate-spin text-[#ea580c]" />
          <p className="text-xs font-semibold text-[#64748b]">Verifying your invite link…</p>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-8 rounded-xl p-6 flex flex-col items-center gap-3 text-center max-w-sm bg-white border border-[#e2e8f0] shadow-xs">
          <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-[#ea580c]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="font-bold text-sm text-[#0b111d]">Invalid Invite</p>
          <p className="text-xs text-[#64748b] leading-relaxed">{errorMsg}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs transition active:scale-[0.98] cursor-pointer"
          >
            Go to Login
          </button>
        </div>
      )}
    </div>
  );
}
