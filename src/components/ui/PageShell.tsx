import React from 'react';

export interface PageShellProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '7xl' | 'full';
  className?: string;
}

export const PageShell: React.FC<PageShellProps> = ({
  children,
  maxWidth = '7xl',
  className = '',
}) => {
  const maxWidthMap = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    '5xl': 'max-w-5xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };

  return (
    <div className={`mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 ${maxWidthMap[maxWidth]} ${className}`}>
      {children}
    </div>
  );
};
