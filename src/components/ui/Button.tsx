import React, { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all select-none disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98]';

    const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
      primary:
        'bg-[#ea580c] hover:bg-[#c2410c] active:bg-[#9a3412] text-white shadow-xs focus-visible:outline-[#ea580c]',
      secondary:
        'bg-[#1f3861] hover:bg-[#152642] active:bg-[#0b111d] text-white shadow-xs focus-visible:outline-[#1f3861]',
      outline:
        'border border-[#e2e8f0] bg-white hover:bg-[#f8fafc] text-[#0b111d] hover:border-[#cbd5e1] shadow-xs focus-visible:outline-[#1f3861]',
      ghost:
        'bg-transparent hover:bg-[#f1f5f9] text-[#334155] hover:text-[#0b111d] focus-visible:outline-[#1f3861]',
      destructive:
        'bg-[#dc2626] hover:bg-[#b91c1c] active:bg-[#991b1b] text-white shadow-xs focus-visible:outline-[#dc2626]',
    };

    const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
      icon: 'h-10 w-10 p-0',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';
