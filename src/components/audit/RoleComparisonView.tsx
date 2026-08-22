import React from 'react';
import type { RoleRecommendationDto } from '../../types/career';
import { Scale, Check, ArrowRight, X, Sparkles, TrendingUp, Target } from 'lucide-react';

interface RoleComparisonViewProps {
  roles: RoleRecommendationDto[];
  selectedRoleId?: string;
  onSelectRole: (role: RoleRecommendationDto) => void;
  onClose: () => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export const RoleComparisonView: React.FC<RoleComparisonViewProps> = ({
  roles,
  selectedRoleId,
  onSelectRole,
  onClose,
  trackEvent,
}) => {
  if (roles.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#1f3861] flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#0b111e]">Compare Suitable Roles</h2>
              <p className="text-[10px] text-slate-500 font-medium">Side-by-side engineering track comparison</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Roles Comparison Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          <div className={`grid ${roles.length === 2 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'} gap-3`}>
            {roles.map((role) => {
              const isSelected = role.id === selectedRoleId;
              return (
                <div
                  key={role.id}
                  className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition ${
                    isSelected
                      ? 'bg-blue-50/60 border-[#1f3861] ring-2 ring-[#1f3861]/20'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100/70 text-[#1f3861] border border-blue-200">
                        {role.fitBand}
                      </span>
                      <span className="text-[9px] font-bold text-slate-500 flex items-center gap-0.5">
                        <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
                        {role.demandLevel}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[#0b111e] leading-snug">{role.title}</h3>
                    <p className="text-[10px] text-slate-600 line-clamp-3 leading-relaxed font-medium">
                      {role.description}
                    </p>

                    <div className="pt-2 border-t border-slate-200/70 space-y-1">
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">Fit Reason:</span>
                      <p className="text-[10px] text-slate-700 leading-snug">
                        {role.fitReasons[0] || 'Strong alignment with your stated interest.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70 space-y-1">
                      <span className="text-[9px] font-bold uppercase text-slate-500 block">Core Skills:</span>
                      <div className="flex flex-wrap gap-1">
                        {role.keySkills.slice(0, 3).map((sk) => (
                          <span
                            key={sk}
                            className="text-[9px] px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-mono"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      trackEvent('role_comparison_selected', { roleId: role.id, title: role.title });
                      onSelectRole(role);
                      onClose();
                    }}
                    className={`w-full py-2 px-3 rounded-full text-xs font-bold flex items-center justify-center gap-1 transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#1f3861] text-white shadow-2xs'
                        : 'bg-white border border-slate-200 hover:bg-slate-100 text-[#1f3861]'
                    }`}
                  >
                    <span>{isSelected ? 'Currently Selected' : 'Choose This Track'}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500">
          <span>Target role benchmark can be refined at any point.</span>
          <button
            type="button"
            onClick={onClose}
            className="font-bold text-[#1f3861] hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
