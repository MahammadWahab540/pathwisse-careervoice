import React, { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options?: SelectOption[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, options, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold text-[#334155]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full appearance-none rounded-lg border bg-white px-3.5 py-2.5 pr-10 text-sm text-[#0b111d] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:bg-[#f8fafc] disabled:text-[#94a3b8] disabled:cursor-not-allowed ${
              error
                ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-[#fecaca]'
                : 'border-[#e2e8f0] hover:border-[#cbd5e1] focus:border-[#1f3861] focus:ring-[#e8f0fa]'
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <p className="text-xs text-[#dc2626] font-medium">{error}</p>}
        {!error && hint && <p className="text-xs text-[#64748b]">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
