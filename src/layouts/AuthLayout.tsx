import React from 'react';
import { PATHWISSE_LOGO_URL } from '../components/ui/PathwisseUI';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  maxWidth?: string;
}

export function AuthLayout({ children, title, subtitle, maxWidth = 'max-w-md' }: AuthLayoutProps) {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-[#f8fafc] text-[#0b111d]">
      <div className={`w-full ${maxWidth}`}>
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="h-11 w-11 rounded-xl bg-white border border-[#e2e8f0] shadow-xs flex items-center justify-center p-1.5 mb-3">
            <img src={PATHWISSE_LOGO_URL} alt="CareerVoice by Pathwisse" className="h-full w-full object-contain" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#0b111d]">
            CareerVoice
          </span>
          <span className="text-xs font-medium text-[#64748b]">by Pathwisse</span>
        </div>

        {/* Form Enclosure Card */}
        <div className="rounded-2xl bg-white p-6 sm:p-8 border border-[#e2e8f0] shadow-md">
          {title && (
            <h1 className="text-xl font-bold text-[#0b111d] tracking-tight mb-1 text-left">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="text-xs sm:text-sm text-[#64748b] leading-relaxed mb-6 text-left">
              {subtitle}
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}
