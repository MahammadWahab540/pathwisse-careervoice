import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex border-b border-[#e2e8f0] gap-4 ${className}`}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`relative pb-3 text-xs sm:text-sm font-semibold transition-colors flex items-center gap-2 cursor-pointer ${
              isActive
                ? 'text-[#ea580c]'
                : 'text-[#64748b] hover:text-[#0b111d]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                  isActive
                    ? 'bg-[#fff7ed] text-[#c2410c]'
                    : 'bg-[#f1f5f9] text-[#64748b]'
                }`}
              >
                {tab.count}
              </span>
            )}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ea580c] rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};
