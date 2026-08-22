import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { CareerRoleTarget, RoleCompetencyModel } from '../../types';
import { getRoleCompetencyModel } from '../../data/knowledgeGraph';
import { Target, CheckCircle2, ShieldCheck, ArrowRight, Layers, Award, Sparkles, Cpu, Loader2 } from 'lucide-react';

interface LoadCompetencyModelStepProps {
  role: CareerRoleTarget;
  firstName: string;
  onProceedToAudit: () => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const LoadCompetencyModelStep: React.FC<LoadCompetencyModelStepProps> = ({
  role,
  firstName,
  onProceedToAudit,
  trackEvent,
}) => {
  const [model, setModel] = useState<RoleCompetencyModel>(() => getRoleCompetencyModel(role.id, role.title));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/catalog/competency/${encodeURIComponent(role.id)}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data && data.coreCompetencies) {
          setModel({
            roleId: data.roleId || role.id,
            roleTitle: role.title,
            minimumReadinessBenchmark: data.minimumReadinessBenchmark || 75,
            evaluationCriteria: data.evaluationCriteria || {
              clarityWeight: 0.1,
              technicalWeight: 0.35,
              projectWeight: 0.25,
              communicationWeight: 0.15,
              executionWeight: 0.15,
            },
            coreCompetencies: data.coreCompetencies || [],
            description: `Official Pathwisse & Supabase Competency Model for ${role.title}`,
          });
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Notice: Loading fallback competency model:', err);
        if (isMounted) setLoading(false);
      });

    trackEvent('competency_model_loaded', { roleId: role.id, roleTitle: role.title });

    return () => {
      isMounted = false;
    };
  }, [role, trackEvent]);

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center selection:bg-[#1f3861] selection:text-white space-y-4">
      {/* Qalam Mascot */}
      <QalamCharacter
        state="ENCOURAGING"
        subtitles={`I have loaded the verified industry competency model for ${role.title} from Supabase. Here is the exact benchmark I will audit you against, ${firstName || 'friend'}.`}
      />

      {/* Main Competency Benchmark Box */}
      <div className="w-full bg-white border border-slate-200/80 rounded-3xl p-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#1f3861] font-bold flex items-center gap-1">
              <Cpu className="w-3 h-3 text-[#1f3861]" />
              Supabase Competency Benchmark
            </span>
            <h2 className="text-base font-bold text-[#0b111e] mt-0.5">{role.title}</h2>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-500 uppercase block">Hiring Bar</span>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {model.minimumReadinessBenchmark}+ / 100
            </span>
          </div>
        </div>

        {/* 5 Core Competency Vectors Tested */}
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold text-[#0b111e] uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#1f3861]" />
            Evaluation Dimensions & Weightings
          </h3>

          <div className="space-y-2">
            {model.coreCompetencies.map((comp, idx) => (
              <motion.div
                key={comp.skillName}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-[#1f3861] text-white text-[9px] flex items-center justify-center font-mono font-bold">
                      {idx + 1}
                    </span>
                    {comp.skillName}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-white text-[#1f3861] border border-slate-200">
                    {comp.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium pl-5">
                  {comp.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Auditor Notice */}
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/70 flex items-start gap-2.5 text-left">
          <ShieldCheck className="w-4 h-4 text-[#1f3861] shrink-0 mt-0.5" />
          <p className="text-[11px] text-slate-700 leading-snug font-medium">
            <strong className="text-[#1f3861]">Auditor Protocol:</strong> Qalam will probe your claimed skills and project evidence. Be authentic and detailed in your answers!
          </p>
        </div>

        {/* Start Voice Audit Button */}
        <button
          type="button"
          onClick={() => {
            trackEvent('start_audit_from_model_clicked', { roleId: role.id });
            onProceedToAudit();
          }}
          className="w-full py-3.5 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-[0.98] shadow-md cursor-pointer"
        >
          <span>Begin 1-on-1 Career Audit</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400 font-medium">
        Microphone permission will be requested. You can also type anytime.
      </p>
    </div>
  );
};
