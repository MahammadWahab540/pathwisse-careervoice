import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'brand' | 'accent' | 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center font-medium rounded-full tracking-wide';

  const variantStyles: Record<NonNullable<BadgeProps['variant']>, string> = {
    neutral: 'bg-[#f1f5f9] text-[#334155] border border-[#e2e8f0]',
    brand: 'bg-[#e8f0fa] text-[#1f3861] border border-[#bfdbfe]',
    accent: 'bg-[#fff7ed] text-[#c2410c] border border-[#fed7aa]',
    success: 'bg-[#f0fdf4] text-[#15803d] border border-[#bbf7d0]',
    warning: 'bg-[#fffbeb] text-[#b45309] border border-[#fde68a]',
    danger: 'bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]',
    info: 'bg-[#eff6ff] text-[#1d4ed8] border border-[#bfdbfe]',
  };

  const sizeStyles: Record<NonNullable<BadgeProps['size']>, string> = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`} {...props}>
      {children}
    </span>
  );
};
