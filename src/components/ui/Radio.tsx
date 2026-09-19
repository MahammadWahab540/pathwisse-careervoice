import React, { forwardRef } from 'react';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, description, className = '', id, checked, onChange, ...props }, ref) => {
    const radioId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label htmlFor={radioId} className="flex items-start gap-3 cursor-pointer select-none text-left">
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div className="h-4 w-4 rounded-full border border-[#cbd5e1] bg-white transition-all peer-checked:border-[#ea580c] peer-focus-visible:ring-2 peer-focus-visible:ring-[#fed7aa]" />
          <div className="pointer-events-none absolute h-2 w-2 rounded-full bg-[#ea580c] opacity-0 transition-opacity peer-checked:opacity-100" />
        </div>
        {(label || description) && (
          <div className="flex flex-col text-xs">
            {label && <span className="font-semibold text-[#0b111d]">{label}</span>}
            {description && <span className="text-[#64748b] mt-0.5">{description}</span>}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
