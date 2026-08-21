import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Mic, MicOff, RefreshCw, Send, ShieldCheck } from 'lucide-react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { VoiceWaveform } from '../voice/VoiceWaveform';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import type { CareerRoleTarget, EvidenceCoverageItem, QalamState } from '../../types';

type InputMethod = 'voice' | 'type' | 'tap';

interface AdaptiveInterviewStepProps {
  auditId: string;
  role: CareerRoleTarget;
  firstName?: string;
  onInterviewFinished: () => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

interface RetryTurn {
  answerText: string;
  inputMethod: InputMethod;
  clientMessageId: string;
}

interface AdaptiveTurnResponse {
  success: true;
  sourceMessageId: string;
  evidenceId: string;
  qalamMessageId: string;
  qalamText: string;
  coverage: EvidenceCoverageItem[];
  interviewComplete: boolean;
  nextCompetency: { skillId?: string; skillName?: string } | null;
  bareClaimGuardApplied: boolean;
}

function coverageClasses(label: EvidenceCoverageItem['coverage']) {
  if (label === 'Strong') return 'bg-emerald-50 border-emerald-200 text-emerald-900';
  if (label === 'Moderate') return 'bg-blue-50 border-blue-200 text-blue-900';
  if (label === 'Weak Evidence') return 'bg-amber-50 border-amber-200 text-amber-900';
  return 'bg-slate-50 border-slate-200 text-slate-600';
}

export const AdaptiveInterviewStep: React.FC<AdaptiveInterviewStepProps> = ({
  auditId,
  role,
  firstName,
  onInterviewFinished,
  trackEvent,
}) => {
  const [coverage, setCoverage] = useState<EvidenceCoverageItem[]>([]);
  const [qalamText, setQalamText] = useState('');
  const [currentCompetency, setCurrentCompetency] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [qalamState, setQalamState] = useState<QalamState>('THINKING');
  const [isAiLoading, setIsAiLoading] = useState(true);
  const [interviewComplete, setInterviewComplete] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [retryTurn, setRetryTurn] = useState<RetryTurn | null>(null);
  const [lastUserText, setLastUserText] = useState('');

  const handleSpeechResult = (text: string) => {
    if (text.trim()) void submitAnswer(text.trim(), 'voice');
  };

  const {
    isListening,
    isSpeaking,
    amplitude,
    transcript,
    setTranscript,
    startListening,
    stopListening,
    speakText,
    stopSpeaking,
  } = useVoiceInteraction({
    onSpeechResult: handleSpeechResult,
    onBargeIn: () => {
      stopSpeaking();
      setQalamState('LISTENING');
      trackEvent('user_interrupted_qalam', { auditId });
    },
  });

  useEffect(() => {
    let active = true;
    setIsAiLoading(true);
    setTurnError(null);
    fetch(`/api/audit/${encodeURIComponent(auditId)}/next-probe`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || data.success === false) throw new Error(data.message || 'The next evidence probe could not be loaded.');
        return data;
      })
      .then((data) => {
        if (!active) return;
        setCoverage(data.coverage || []);
        setInterviewComplete(Boolean(data.complete));
        setCurrentCompetency(data.nextCompetency?.skillName || null);
        const nextText = data.qalamText || 'Your configured role competencies have sufficient evidence. Review the evidence before scoring.';
        setQalamText(nextText);
        setQalamState(data.complete ? 'CELEBRATING' : 'SPEAKING');
        if (!data.complete && data.qalamText) speakText(data.qalamText, () => setQalamState('LISTENING'));
        trackEvent('adaptive_audit_resumed', {
          auditId,
          roleId: role.id,
          complete: Boolean(data.complete),
          nextCompetency: data.nextCompetency?.skillName,
        });
      })
      .catch((requestError) => {
        if (!active) return;
        setTurnError(requestError instanceof Error ? requestError.message : 'Adaptive audit could not be resumed.');
        setQalamState('ENCOURAGING');
      })
      .finally(() => {
        if (active) setIsAiLoading(false);
      });

    return () => {
      active = false;
      stopSpeaking();
      stopListening();
    };
  }, [auditId, role.id]);

  const submitAnswer = async (
    answerText: string,
    inputMethod: InputMethod,
    existingClientMessageId?: string
  ) => {
    if (isAiLoading || interviewComplete) return;
    stopListening();
    stopSpeaking();
    setTurnError(null);
    setIsAiLoading(true);
    setQalamState('THINKING');
    const clientMessageId = existingClientMessageId || crypto.randomUUID();
    setLastUserText(answerText);
    setTextInput('');
    setTranscript('');

    try {
      const response = await fetch('/api/qalam/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          userText: answerText,
          inputMethod,
          clientMessageId,
        }),
      });
      const data = (await response.json()) as AdaptiveTurnResponse & { success?: boolean; code?: string; message?: string };
      if (!response.ok || data.success === false) {
        throw new Error(
          data.code === 'AI_UNAVAILABLE'
            ? 'CareerVoice AI is temporarily unavailable. Your answer was preserved. Retry this turn when the service is available.'
            : data.message || 'Qalam could not process this answer.'
        );
      }

      setCoverage(data.coverage || []);
      setQalamText(data.qalamText);
      setInterviewComplete(Boolean(data.interviewComplete));
      setCurrentCompetency(data.nextCompetency?.skillName || null);
      setRetryTurn(null);
      setQalamState(data.interviewComplete ? 'CELEBRATING' : 'SPEAKING');
      trackEvent('adaptive_evidence_turn_completed', {
        auditId,
        roleId: role.id,
        evidenceId: data.evidenceId,
        nextCompetency: data.nextCompetency?.skillName,
        interviewComplete: data.interviewComplete,
        bareClaimGuardApplied: data.bareClaimGuardApplied,
      });
      speakText(data.qalamText, () => {
        if (!data.interviewComplete) setQalamState('LISTENING');
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'This audit turn could not be completed.';
      setTurnError(message);
      setRetryTurn({ answerText, inputMethod, clientMessageId });
      setQalamState('ENCOURAGING');
      trackEvent('career_audit_turn_failed', { auditId, message });
    } finally {
      setIsAiLoading(false);
    }
  };

  const strongCount = useMemo(() => coverage.filter((item) => item.coverage === 'Strong').length, [coverage]);
  const moderateCount = useMemo(() => coverage.filter((item) => item.coverage === 'Moderate').length, [coverage]);

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center space-y-3">
      <div className="w-full flex items-center justify-between text-xs px-1">
        <div className="font-bold text-[#0b111e]">Target: <span className="text-[#1f3861]">{role.title}</span></div>
        <div className="text-[10px] text-slate-500">{strongCount} strong · {moderateCount} moderate</div>
      </div>

      <QalamCharacter
        state={isAiLoading ? 'THINKING' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : qalamState}
        audioAmplitude={amplitude}
        subtitles={qalamText || 'Loading the next evidence probe…'}
        onSpeak={() => qalamText && speakText(qalamText, () => !interviewComplete && setQalamState('LISTENING'))}
      />

      <VoiceWaveform amplitude={amplitude} isListening={isListening} isSpeaking={isSpeaking} />

      <div className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><ShieldCheck className="w-3.5 h-3.5 text-[#1f3861]" />Evidence Coverage</div>
          {currentCompetency && !interviewComplete && <span className="text-[10px] rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 font-bold text-[#1f3861]">Investigating {currentCompetency}</span>}
        </div>

        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto pr-1">
          {coverage.map((item) => (
            <div key={item.skillId} className={`rounded-xl border px-3 py-2 flex items-center justify-between gap-2 ${coverageClasses(item.coverage)}`}>
              <div>
                <p className="text-[11px] font-bold">{item.skillName}</p>
                <p className="text-[9px] opacity-70">Required {item.requiredLevel || 'configured level'}</p>
              </div>
              <span className="text-[10px] font-bold whitespace-nowrap">{item.coverage}</span>
            </div>
          ))}
        </div>

        {qalamText && !interviewComplete && (
          <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1">Qalam’s next probe</p>
            <p className="text-xs text-slate-700 leading-relaxed">{qalamText}</p>
          </div>
        )}

        {lastUserText && <p className="text-[10px] text-slate-400 line-clamp-2">Last answer: {lastUserText}</p>}
        {transcript && <p className="text-[10px] text-slate-500">Listening: {transcript}</p>}

        {turnError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left">
            <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /><p className="text-[11px] leading-relaxed text-rose-800 font-medium">{turnError}</p></div>
            {retryTurn && <button type="button" disabled={isAiLoading} onClick={() => void submitAnswer(retryTurn.answerText, retryTurn.inputMethod, retryTurn.clientMessageId)} className="mt-2 ml-6 text-[11px] font-bold text-[#1f3861] flex items-center gap-1"><RefreshCw className="w-3 h-3" />Retry saved answer</button>}
          </div>
        )}

        {!interviewComplete ? (
          <div className="space-y-3">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (textInput.trim()) void submitAnswer(textInput.trim(), 'type');
              }}
              className="flex items-center gap-2"
            >
              <input value={textInput} onChange={(event) => setTextInput(event.target.value)} placeholder="Give a concrete example…" className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs outline-none focus:border-[#1f3861]" />
              <button type="submit" disabled={isAiLoading || !textInput.trim() || Boolean(retryTurn)} className="rounded-full bg-[#1f3861] p-2.5 text-white disabled:opacity-40"><Send className="w-4 h-4" /></button>
            </form>

            <div className="flex items-center justify-center gap-3">
              <button type="button" disabled={isAiLoading || Boolean(retryTurn)} onClick={() => (isListening ? stopListening() : startListening())} className={`p-4 rounded-full text-white transition disabled:opacity-40 ${isListening ? 'bg-rose-500' : 'bg-[#1f3861]'}`}>
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              <button type="button" disabled={isAiLoading || Boolean(retryTurn)} onClick={() => void submitAnswer('I do not have evidence for this yet.', 'tap')} className="text-[10px] font-bold text-slate-500 underline">I don’t have evidence yet</button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 space-y-2">
            <p className="text-xs font-bold text-emerald-900">Evidence threshold reached</p>
            <p className="text-[11px] text-emerald-800">Every configured target-role competency now has enough persisted evidence to enter scoring. No question count was used.</p>
            <button type="button" onClick={onInterviewFinished} className="w-full rounded-full bg-[#1f3861] py-3 text-xs font-bold text-white flex items-center justify-center gap-2">Review Evidence <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <p className="text-[10px] text-slate-400">No score is produced for weak or insufficient evidence. Qalam keeps probing the highest-impact missing competency instead.</p>
    </div>
  );
};
