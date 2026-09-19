import React from 'react';

export const Table: React.FC<React.TableHTMLAttributes<HTMLTableElement>> = ({
  className = '',
  ...props
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#e2e8f0] bg-white">
      <table className={`w-full text-left border-collapse text-sm ${className}`} {...props} />
    </div>
  );
};

export const TableHeader: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  ...props
}) => {
  return <thead className={`border-b border-[#e2e8f0] bg-[#f8fafc] text-xs font-semibold text-[#64748b] uppercase tracking-wider ${className}`} {...props} />;
};

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  ...props
}) => {
  return <tbody className={`divide-y divide-[#f1f5f9] bg-white ${className}`} {...props} />;
};

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  ...props
}) => {
  return <tr className={`hover:bg-[#f8fafc] transition-colors ${className}`} {...props} />;
};

export const TableHead: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  ...props
}) => {
  return <th className={`px-4 py-3 font-semibold text-[#64748b] text-xs ${className}`} {...props} />;
};

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  ...props
}) => {
  return <td className={`px-4 py-3.5 text-[#334155] text-sm align-middle ${className}`} {...props} />;
};
