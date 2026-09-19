import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface DropdownMenuItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
}

export interface DropdownProps {
  trigger: React.ReactElement<{
    onClick?: React.MouseEventHandler;
    'aria-haspopup'?: boolean | 'dialog' | 'menu' | 'listbox' | 'tree' | 'grid';
    'aria-expanded'?: boolean;
    ref?: React.Ref<HTMLElement>;
  }>;
  items: (DropdownMenuItem | 'separator')[];
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  align = 'end',
  side = 'bottom',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const actionableItems = items.filter((item): item is DropdownMenuItem => item !== 'separator' && !item.disabled);

  const toggle = () => {
    setIsOpen((prev) => !prev);
    setFocusedIndex(-1);
  };

  const close = useCallback(() => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1 < actionableItems.length ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : actionableItems.length - 1));
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        actionableItems[focusedIndex]?.onClick?.();
        close();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close, actionableItems, focusedIndex]);

  const alignClass = align === 'end' ? 'right-0' : 'left-0';
  const sideClass = side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5';

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      {React.cloneElement(trigger, {
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          toggle();
        },
        'aria-haspopup': 'menu',
        'aria-expanded': isOpen,
      })}

      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          aria-orientation="vertical"
          className={`absolute ${alignClass} ${sideClass} z-50 min-w-[180px] p-1 bg-white rounded-xl border border-[#e2e8f0] shadow-lg focus:outline-none animate-in fade-in zoom-in-95 duration-100 ${className}`}
        >
          {items.map((item, index) => {
            if (item === 'separator') {
              return <div key={`sep-${index}`} className="h-px my-1 bg-[#e2e8f0]" role="separator" />;
            }

            const isActionable = !item.disabled;
            const itemIndex = isActionable ? actionableItems.findIndex((a) => a.id === item.id) : -1;
            const isFocused = itemIndex === focusedIndex;

            return (
              <button
                key={item.id}
                role="menuitem"
                disabled={item.disabled}
                tabIndex={-1}
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick?.();
                  close();
                }}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 text-xs font-medium rounded-lg transition-colors text-left select-none ${
                  item.disabled
                    ? 'text-[#94a3b8] cursor-not-allowed opacity-60'
                    : item.destructive
                    ? isFocused
                      ? 'bg-rose-50 text-rose-700'
                      : 'text-rose-600 hover:bg-rose-50 hover:text-rose-700'
                    : isFocused
                    ? 'bg-[#f1f5f9] text-[#0b111d]'
                    : 'text-[#334155] hover:bg-[#f1f5f9] hover:text-[#0b111d]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {item.icon && <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>}
                  <span>{item.label}</span>
                </div>
                {item.shortcut && (
                  <span className="text-[10px] text-[#94a3b8] font-mono tracking-tight">{item.shortcut}</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
