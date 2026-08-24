import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerRoleTarget, RoleCompetencyModel } from '../../types';
import { ShieldCheck, ArrowRight, Layers, Cpu, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

interface LoadCompetencyModelStepProps {
  role: CareerRoleTarget;
  firstName: string;
  onProceedToAudit: (model: RoleCompetencyModel) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

export const LoadCompetencyModelStep: React.FC<LoadCompetencyModelStepProps> = ({
  role,
  firstName,
  onProceedToAudit,
  trackEvent,
}) => {
  const [model, setModel] = useState<RoleCompetencyModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadModel = useCallback(async () => {
    setLoading(true);
    setError(null);
    setModel(null);
    try {
      const response = await fetch(`/api/catalog/competency/${encodeURIComponent(role.id)}`);
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || 'Competency benchmark is not configured.');
      if (!Array.isArray(data.coreCompetencies) || data.coreCompetencies.length === 0) throw new Error('Competency benchmark is empty.');

      const nextModel: RoleCompetencyModel = {
        roleId: data.roleId,
        roleTitle: role.title,
        minimumReadinessBenchmark: data.minimumReadinessBenchmark,
        evaluationCriteria: data.evaluationCriteria,
        coreCompetencies: data.coreCompetencies,
        description: `Published CareerVoice benchmark for ${role.title}`,
      };
      setModel(nextModel);
      trackEvent('competency_model_loaded', {
        roleId: role.id,
        roleTitle: role.title,
        competencyCount: nextModel.coreCompetencies.length,
        minimumReadinessBenchmark: nextModel.minimumReadinessBenchmark,
      });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Competency benchmark could not be loaded.';
      setError(message);
      trackEvent('competency_model_load_failed', { roleId: role.id, message });
    } finally {
      setLoading(false);
    }
  }, [role.id, role.title, trackEvent]);

  useEffect(() => { loadModel(); }, [loadModel]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      <QalamCharacter
        state={error ? 'ENCOURAGING' : 'CURIOUS'}
        subtitles={error
          ? `I cannot audit ${role.title} until its readiness benchmark is available.`
          : `I am loading the readiness benchmark for ${role.title}, ${firstName || 'friend'}. Your audit will use this role standard.`}
      />

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        {loading ? (
            <div className="py-14 flex flex-col items-center justify-center gap-3 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-[#1f3861]" />
            <div><p className="text-sm font-bold text-[#0b111e]">Loading your role benchmark</p><p className="text-xs text-slate-500 mt-1">Qalam is preparing the skills this role expects.</p></div>
          </div>
        ) : error || !model ? (
          <div className="py-8 space-y-4 text-center">
            <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
            <div><p className="text-sm font-bold text-[#0b111e]">Benchmark unavailable</p><p className="text-xs text-slate-600 mt-1">{error || 'This role is missing its competency configuration.'}</p></div>
            <button type="button" onClick={loadModel} className="mx-auto py-2.5 px-4 rounded-full border border-[#1f3861] text-[#1f3861] font-bold text-xs flex items-center justify-center gap-2"><RefreshCw className="w-3.5 h-3.5" />Retry benchmark</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold flex items-center gap-1"><Cpu className="w-3 h-3" />Role readiness benchmark</span>
                <h2 className="text-base font-bold text-[#0b111e] mt-0.5">{role.title}</h2>
              </div>
              <div className="text-right"><span className="text-[9px] font-bold text-slate-500 uppercase block">Hiring Bar</span><span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">{model.minimumReadinessBenchmark}+ / 100</span></div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-xs font-bold text-[#0b111e] uppercase tracking-wider flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-[#1f3861]" />Role Competencies</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {model.coreCompetencies.map((competency, index) => (
                  <motion.div key={competency.skillId} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }} className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-[#1f3861] text-white text-[9px] flex items-center justify-center font-mono font-bold">{index + 1}</span>{competency.skillName}</span>
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-[#1f3861] border border-slate-200">Expected {competency.expectedScore}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium pl-5">{competency.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-2.5 text-left"><ShieldCheck className="w-4 h-4 text-[#1f3861] shrink-0 mt-0.5" /><p className="text-[11px] text-slate-700 leading-snug font-medium"><strong className="text-[#1f3861]">Audit rule:</strong> every score must point to something you said, built, or uploaded.</p></div>

            <button type="button" onClick={() => { trackEvent('start_audit_from_model_clicked', { roleId: role.id }); onProceedToAudit(model); }} className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md cursor-pointer"><span>Begin 1-on-1 Career Audit</span><ArrowRight className="w-4 h-4" /></button>
          </>
        )}
      </motion.div>

      <p className="text-[11px] text-slate-400 font-medium">Microphone is optional. Typed answers use the same evidence pipeline.</p>
    </div>
  );
};
