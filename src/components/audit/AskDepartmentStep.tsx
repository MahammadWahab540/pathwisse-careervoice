import React, { useCallback, useEffect, useState } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { BookOpen, ArrowRight, Check, Code, Cpu, LineChart, Wrench, Shield, Layers, Loader2, RefreshCw } from 'lucide-react';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';

interface CareerStreamOption {
  id: string;
  databaseId: string;
  title: string;
  description: string;
  iconName: string;
}

interface AskDepartmentStepProps {
  firstName: string;
  onComplete: (careerStreamId: string, departmentName: string) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
  onBack?: () => void;
}

const STREAM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Code,
  Cpu,
  Wrench,
  Layers,
  LineChart,
  Shield,
};

export const AskDepartmentStep: React.FC<AskDepartmentStepProps> = ({ firstName, onComplete, trackEvent }) => {
  const [streams, setStreams] = useState<CareerStreamOption[]>([]);
  const [selectedStream, setSelectedStream] = useState<CareerStreamOption | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isSpeaking, amplitude, speakText, stopSpeaking } = useVoiceInteraction({});
  const subtitleText = `And what's your department or branch, ${firstName || 'there'}?`;

  const loadStreams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/streams');
      const data = await response.json();
      if (!response.ok || data.success === false || !Array.isArray(data)) {
        throw new Error(data.message || 'Career streams could not be loaded.');
      }
      const nextStreams = data as CareerStreamOption[];
      setStreams(nextStreams);
      setSelectedStream((current) => current || nextStreams[0] || null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Career streams could not be loaded.');
      setStreams([]);
      setSelectedStream(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    trackEvent('department_viewed');
    speakText(subtitleText);
    void loadStreams();
    return () => stopSpeaking();
  }, [trackEvent, firstName, subtitleText, speakText, stopSpeaking, loadStreams]);

  const handleNext = () => {
    if (!selectedStream) return;
    trackEvent('department_selected', {
      careerStreamId: selectedStream.id,
      departmentName: selectedStream.title,
    });
    onComplete(selectedStream.id, selectedStream.title);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-5 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <QalamCharacter state={isSpeaking ? 'SPEAKING' : 'WELCOME'} audioAmplitude={amplitude} subtitles={subtitleText} onSpeak={() => speakText(subtitleText)} />

      <div className="w-full bg-white border border-[#e2e8f0] rounded-xl p-5 my-2 shadow-xs text-left space-y-3.5">
        <label className="text-xs font-bold text-[#0b111d] flex items-center gap-1.5"><BookOpen className="w-3.5 h-3.5 text-[#ea580c]" />Select Department / Stream</label>

        {loading ? (
          <div className="py-10 flex flex-col items-center gap-2 text-[#64748b]"><Loader2 className="w-5 h-5 animate-spin text-[#ea580c]" /><span className="text-xs font-medium">Loading published career streams…</span></div>
        ) : error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-center space-y-3"><p className="text-xs font-medium text-rose-800">{error}</p><button type="button" onClick={() => void loadStreams()} className="mx-auto text-xs font-bold text-[#ea580c] flex items-center gap-1"><RefreshCw className="w-3.5 h-3.5" />Retry</button></div>
        ) : streams.length === 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs font-medium text-amber-900">No published career streams are configured.</div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {streams.map((stream) => {
              const isSelected = selectedStream?.id === stream.id;
              const IconComp = STREAM_ICONS[stream.iconName] || Code;
              return (
                <button key={stream.databaseId || stream.id} type="button" onClick={() => setSelectedStream(stream)} className={`w-full p-3 rounded-lg border text-left transition flex items-start justify-between gap-3 cursor-pointer ${isSelected ? 'bg-orange-50/70 border-[#ea580c] shadow-xs' : 'bg-[#f8fafc] border-[#e2e8f0] hover:border-slate-300'}`}>
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-[#ea580c] text-white' : 'bg-slate-200/80 text-slate-700'}`}><IconComp className="w-4 h-4" /></div>
                    <div className="min-w-0"><div className={`text-xs font-bold ${isSelected ? 'text-[#0b111d]' : 'text-[#0b111d]'}`}>{stream.title}</div><p className="text-[10px] text-[#64748b] line-clamp-1 mt-0.5 font-medium">{stream.description}</p></div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-[#ea580c] shrink-0 mt-1" />}
                </button>
              );
            })}
          </div>
        )}

        <button onClick={handleNext} disabled={!selectedStream || loading} className="w-full py-3 px-4 rounded-xl bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-40 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"><span>Continue</span><ArrowRight className="w-4 h-4" /></button>
      </div>

      <p className="text-[11px] text-[#94a3b8] font-medium">Only published CareerVoice streams are shown.</p>
    </div>
  );
};
