import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-xl border border-dashed border-[#cbd5e1] bg-white ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] flex items-center justify-center text-[#64748b] mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[#0b111d] tracking-tight">{title}</h3>
      <p className="mt-1 text-xs sm:text-sm text-[#64748b] max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
