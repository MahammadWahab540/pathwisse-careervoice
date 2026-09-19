import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#334155]">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-[#94a3b8] pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-[#0b111d] placeholder-[#94a3b8] transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : ''
            } ${rightIcon ? 'pr-9' : ''} ${
              error
                ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#fecaca]'
                : 'border-[#e2e8f0] hover:border-[#cbd5e1] focus:border-[#1f3861] focus:ring-[#e8f0fa]'
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-[#94a3b8] flex items-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-[#dc2626] font-medium">{error}</p>}
        {!error && hint && <p className="text-xs text-[#64748b]">{hint}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
