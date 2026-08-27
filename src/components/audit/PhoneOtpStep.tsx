import React, { useState, useEffect, useRef } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { UserIdentity } from '../../types';
import { Phone, ShieldCheck, ArrowRight, AlertCircle, RefreshCw, ChevronDown, Loader2 } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { logCareerVoiceEvent } from '../../domain/careerVoiceFlow';

interface PhoneOtpStepProps {
  onVerified: (identity: UserIdentity) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  onBack?: () => void;
}

const COUNTRIES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
];

export const PhoneOtpStep: React.FC<PhoneOtpStepProps> = ({ onVerified, trackEvent }) => {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const otpRequestGenerationRef = useRef(0);
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const fullPhone = `${selectedCountry.code}${phone.trim().replace(/\D/g, '')}`;
  const subtitleText = otpSent
    ? `I sent a verification code to ${fullPhone}. Enter it below to securely save your audit progress.`
    : "First, what's your mobile number? I'll save your audit progress so you can resume anytime.";

  useEffect(() => {
    trackEvent('phone_input_viewed');
    speakText(subtitleText);
    return () => stopSpeaking();
  }, [trackEvent, otpSent, subtitleText, speakText, stopSpeaking]);

  useEffect(() => {
    if (!otpSent || countdown <= 0) return;
    const timer = window.setInterval(() => setCountdown((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [otpSent, countdown]);

  const requestOtp = async () => {
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 8) throw new Error('Please enter a valid mobile number.');

    logCareerVoiceEvent('otp_request_started', { phone: `${selectedCountry.code}${cleanPhone}` });
    const response = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: `${selectedCountry.code}${cleanPhone}` }),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || 'Could not send the verification code.');
    logCareerVoiceEvent('otp_request_success', { phone: `${selectedCountry.code}${cleanPhone}` });
  };

  const handleSendOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await requestOtp();
      trackEvent('phone_submitted');
      trackEvent('otp_requested');
      setOtpSent(true);
      setCountdown(30);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (requestError) {
      logCareerVoiceEvent('otp_request_failed', { error: requestError instanceof Error ? requestError.message : String(requestError) });
      setError(requestError instanceof Error ? requestError.message : 'Could not send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, value: string) => {
    const clean = value.replace(/\D/g, '');
    const nextDigits = [...otpDigits];
    nextDigits[index] = clean ? clean[clean.length - 1] : '';
    setOtpDigits(nextDigits);
    setError(null);
    if (clean && index < 5) digitRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !otpDigits[index] && index > 0) digitRefs.current[index - 1]?.focus();
  };

  const handleVerifyOtp = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const token = otpDigits.join('');
    if (!/^\d{6}$/.test(token)) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    otpRequestGenerationRef.current += 1;
    const requestGeneration = otpRequestGenerationRef.current;
    try {
      logCareerVoiceEvent('otp_verify_started', { phone: fullPhone, flowGeneration: requestGeneration });
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, token }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false || !data.studentId) {
        throw new Error(data.message || 'Verification failed. Please retry.');
      }
      if (requestGeneration !== otpRequestGenerationRef.current) {
        logCareerVoiceEvent('otp_verify_stale_discarded', { phone: fullPhone, requestGeneration, currentGeneration: otpRequestGenerationRef.current });
        return;
      }

      trackEvent('otp_verified');
      logCareerVoiceEvent('otp_verify_success', { phone: data.phone || fullPhone, studentId: data.studentId });
      onVerified({
        phone: data.phone || fullPhone,
        countryCode: selectedCountry.code,
        isOtpVerified: true,
        studentId: data.studentId,
        accessToken: typeof data.accessToken === 'string' ? data.accessToken : undefined,
        anonymousId: crypto.randomUUID(),
        sessionId: crypto.randomUUID(),
      });
    } catch (verifyError) {
      logCareerVoiceEvent('otp_verify_failed', { phone: fullPhone, error: verifyError instanceof Error ? verifyError.message : String(verifyError) });
      setError(verifyError instanceof Error ? verifyError.message : 'Verification failed. Please retry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await requestOtp();
      setCountdown(30);
      trackEvent('otp_requested', { resend: true });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not resend OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : otpSent ? 'CURIOUS' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5 mb-2">
                <Phone className="w-3.5 h-3.5 text-[#1f3861]" /> Mobile Number
              </label>
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={selectedCountry.code}
                    onChange={(event) => setSelectedCountry(COUNTRIES.find((item) => item.code === event.target.value) || COUNTRIES[0])}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-3 pr-7 py-3 text-xs font-mono font-bold text-[#0b111e] focus:outline-none focus:border-[#1f3861] transition cursor-pointer"
                  >
                    {COUNTRIES.map((country) => (
                      <option key={country.code} value={country.code}>{country.flag} {country.code}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                <input
                  type="tel"
                  maxLength={12}
                  value={phone}
                  onChange={(event) => { setPhone(event.target.value.replace(/\D/g, '')); setError(null); }}
                  placeholder="98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#0b111e] font-mono tracking-wider focus:outline-none focus:border-[#1f3861] focus:bg-white transition"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{error}</span></p>}

            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>{isSubmitting ? 'Sending…' : 'Continue with Mobile'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Enter 6-Digit Code</label>
                <button type="button" onClick={() => setOtpSent(false)} className="text-[11px] text-[#1f3861] font-semibold hover:underline cursor-pointer">Edit Number</button>
              </div>
              <div className="flex items-center justify-between gap-1.5 py-1">
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { digitRefs.current[index] = element; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(event) => handleDigitChange(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    className="w-11 h-12 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono font-extrabold text-lg text-[#0b111e] focus:outline-none focus:border-[#1f3861] focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 shrink-0" /><span>{error}</span></p>}

            <button type="submit" disabled={isSubmitting} className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] disabled:opacity-60 text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              <span>{isSubmitting ? 'Verifying…' : 'Verify & Continue'}</span>
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Didn't receive the SMS?</span>
              {countdown > 0 ? (
                <span className="font-mono font-medium">Resend in 0:{countdown < 10 ? `0${countdown}` : countdown}</span>
              ) : (
                <button type="button" disabled={isSubmitting} onClick={handleResend} className="text-[#1f3861] font-bold flex items-center gap-1 hover:underline cursor-pointer"><RefreshCw className="w-3 h-3" /> Resend Code</button>
              )}
            </div>
          </form>
        )}
      </div>

      <p className="text-[10px] text-slate-400 font-medium px-2">Your phone is used only for authentication and audit continuity.</p>
    </div>
  );
};
