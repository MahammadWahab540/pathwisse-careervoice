import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = '', id, checked, onChange, ...props }, ref) => {
    const checkId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <label htmlFor={checkId} className="flex items-start gap-3 cursor-pointer select-none text-left">
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            id={checkId}
            checked={checked}
            onChange={onChange}
            className="peer sr-only"
            {...props}
          />
          <div className="h-4 w-4 rounded-xs border border-[#cbd5e1] bg-white transition-all peer-checked:border-[#ea580c] peer-checked:bg-[#ea580c] peer-focus-visible:ring-2 peer-focus-visible:ring-[#fed7aa]" />
          <Check className="pointer-events-none absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100 stroke-[3]" />
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

Checkbox.displayName = 'Checkbox';
