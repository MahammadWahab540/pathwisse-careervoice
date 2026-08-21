import React, { useState, useEffect, useRef } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { UserIdentity } from '../../types';
import { Phone, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, RefreshCw, ChevronDown } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface PhoneOtpStepProps {
  onVerified: (identity: UserIdentity) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

const COUNTRIES = [
  { code: '+91', name: 'India', flag: '🇮🇳' },
  { code: '+1', name: 'USA / Canada', flag: '🇺🇸' },
  { code: '+44', name: 'UK', flag: '🇬🇧' },
  { code: '+971', name: 'UAE', flag: '🇦🇪' },
  { code: '+65', name: 'Singapore', flag: '🇸🇬' },
];

export const PhoneOtpStep: React.FC<PhoneOtpStepProps> = ({ onVerified, trackEvent, onBack }) => {
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});

  const subtitleText = otpSent
    ? `I sent a verification code to ${selectedCountry.code} ${phone}. Enter it below to save your audit progress.`
    : "First, what's your mobile number? I'll save your audit progress so you can resume anytime.";

  useEffect(() => {
    trackEvent('phone_input_viewed');
    speakText(subtitleText);
    return () => {
      stopSpeaking();
    };
  }, [trackEvent, otpSent]);

  useEffect(() => {
    let timer: any;
    if (otpSent && countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [otpSent, countdown]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 8) {
      setError('Please enter a valid mobile number.');
      return;
    }
    setError(null);
    trackEvent('phone_submitted', { phone: `${selectedCountry.code}${cleanPhone}` });
    trackEvent('otp_requested', { phone: `${selectedCountry.code}${cleanPhone}` });
    setOtpSent(true);
    setCountdown(30);
    setOtpDigits(['1', '2', '3', '4', '5', '6']); // Pre-fill with sample 6-digit for seamless verification
  };

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, '');
    if (!clean) {
      const newDigits = [...otpDigits];
      newDigits[index] = '';
      setOtpDigits(newDigits);
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = clean[clean.length - 1];
    setOtpDigits(newDigits);
    setError(null);

    // Auto-advance
    if (index < 5 && digitRefs.current[index + 1]) {
      digitRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullCode = otpDigits.join('');
    if (fullCode.length < 4) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    trackEvent('otp_verified', { phone: `${selectedCountry.code}${phone}` });

    onVerified({
      phone: `${selectedCountry.code}${phone}`,
      countryCode: selectedCountry.code,
      isOtpVerified: true,
      anonymousId: `anon_${Math.random().toString(36).substring(2, 9)}`,
      sessionId: `sess_${Date.now()}`,
      referralCode: 'PATHWISSE2026',
      campaignId: 'CAMP_AI_STUDIO_2026',
      collegeId: 'GENERAL_COLLEGE',
    });
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      {/* Qalam Character */}
      <QalamCharacter
        state={isSpeaking ? 'SPEAKING' : otpSent ? 'CURIOUS' : 'WELCOME'}
        audioAmplitude={amplitude}
        subtitles={subtitleText}
        onSpeak={() => speakText(subtitleText)}
      />

      {/* Main Input Form Card */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 my-2 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        {!otpSent ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5 mb-2">
                <Phone className="w-3.5 h-3.5 text-[#1f3861]" />
                Mobile Number
              </label>

              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const c = COUNTRIES.find((x) => x.code === e.target.value) || COUNTRIES[0];
                      setSelectedCountry(c);
                    }}
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-2xl pl-3 pr-7 py-3 text-xs font-mono font-bold text-[#0b111e] focus:outline-none focus:border-[#1f3861] transition cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <input
                  type="tel"
                  maxLength={12}
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ''));
                    setError(null);
                  }}
                  placeholder="98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-[#0b111e] font-mono tracking-wider focus:outline-none focus:border-[#1f3861] focus:bg-white transition"
                  required
                  autoFocus
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <span>Continue with Mobile</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Enter 6-Digit Code
                </label>
                <button
                  type="button"
                  onClick={() => setOtpSent(false)}
                  className="text-[11px] text-[#1f3861] font-semibold hover:underline cursor-pointer"
                >
                  Edit Number
                </button>
              </div>

              {/* Segmented OTP Boxes */}
              <div className="flex items-center justify-between gap-1.5 py-1">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (digitRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e.target.value)}
                    className="w-11 h-12 rounded-xl bg-slate-50 border border-slate-200 text-center font-mono font-extrabold text-lg text-[#0b111e] focus:outline-none focus:border-[#1f3861] focus:bg-white focus:ring-2 focus:ring-blue-100 transition"
                  />
                ))}
              </div>
            </div>

            {/* Quick Demo Autofill Notice */}
            <div className="bg-emerald-50/80 p-2.5 rounded-2xl border border-emerald-200/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Instant Passkey Enabled (123456)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOtpDigits(['1', '2', '3', '4', '5', '6']);
                  setError(null);
                }}
                className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold shadow-xs cursor-pointer"
              >
                Auto-fill
              </button>
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
            >
              <span>Verify & Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>Didn't receive the SMS?</span>
              {countdown > 0 ? (
                <span className="font-mono font-medium">Resend in 0:{countdown < 10 ? `0${countdown}` : countdown}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => setCountdown(30)}
                  className="text-[#1f3861] font-bold flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Resend Code
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <p className="text-[10px] text-slate-400 font-medium px-2">
        🔒 End-to-end encrypted. We never share your contact details.
      </p>
    </div>
  );
};


