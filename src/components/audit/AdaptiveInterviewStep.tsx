import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { VoiceWaveform } from '../voice/VoiceWaveform';
import { CaptionsDisplay } from '../voice/CaptionsDisplay';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { QalamState, CareerRoleTarget, AuditMessage, SkillEvidence, StudentContext } from '../../types';
import { Mic, MicOff, Send, SkipForward, RefreshCw, AlertTriangle } from 'lucide-react';

interface AdaptiveInterviewStepProps {
  auditId: string;
  studentId: string;
  phone?: string;
  role: CareerRoleTarget;
  studentContext: StudentContext;
  firstName?: string;
  onInterviewFinished: (data: {
    messages: AuditMessage[];
    skillsExtracted: SkillEvidence[];
    communicationSample: string;
  }) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

type InputMethod = 'voice' | 'type' | 'tap';
interface RetryTurn {
  answerText: string;
  inputMethod: InputMethod;
  clientMessageId: string;
}

export const AdaptiveInterviewStep: React.FC<AdaptiveInterviewStepProps> = ({
  auditId,
  studentId,
  phone,
  role,
  studentContext,
  firstName,
  onInterviewFinished,
  trackEvent,
}) => {
  const [messages, setMessages] = useState<AuditMessage[]>([]);
  const [qalamState, setQalamState] = useState<QalamState>('SPEAKING');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<SkillEvidence[]>([]);
  const [communicationSample, setCommunicationSample] = useState('');
  const [isFollowUpActive, setIsFollowUpActive] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [retryTurn, setRetryTurn] = useState<RetryTurn | null>(null);

  const PROBE_QUESTIONS = [
    {
      id: 'q_clarity',
      qalamPrompt: `Great! Now I want to understand how close you already are to becoming an ${role.title}. First, why does this role interest you, and what do you think someone in this position actually does day-to-day?`,
    },
    {
      id: 'q_evidence_build',
      qalamPrompt: `Tell me about the most complex tool, project, or task you've built using ${role.keySkills[0] || 'your core technical skills'}. What part did you personally implement?`,
    },
    {
      id: 'q_libraries_stack',
      qalamPrompt: 'Which specific libraries, frameworks, or databases did you use in that build? What was the hardest bug or challenge you ran into?',
    },
    {
      id: 'q_communication_60s',
      qalamPrompt: `Imagine I am a technical hiring manager evaluating candidates for a ${role.title} role. Give me a 60-second professional introduction summarizing who you are and what you've built so far.`,
    },
    {
      id: 'q_execution_readiness',
      qalamPrompt: 'How many hours per week can you realistically dedicate to working on your career roadmap, and what usually gets in the way of staying consistent?',
    },
  ];

  const handleSpeechResult = (text: string) => {
    if (text.trim()) void submitAnswer(text.trim(), 'voice');
  };

  const handleBargeIn = () => {
    stopSpeaking();
    setQalamState('LISTENING');
    trackEvent('user_interrupted_qalam', { auditId });
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
  } = useVoiceInteraction({ onSpeechResult: handleSpeechResult, onBargeIn: handleBargeIn });

  useEffect(() => {
    const initialPrompt = PROBE_QUESTIONS[0].qalamPrompt;
    const initialMessage: AuditMessage = {
      id: `initial_${auditId}`,
      sender: 'qalam',
      text: initialPrompt,
      timestamp: Date.now(),
      qalamState: 'WELCOME',
    };
    setMessages([initialMessage]);
    setQalamState('SPEAKING');
    speakText(initialPrompt, () => setQalamState('LISTENING'));
    trackEvent('career_audit_started', { auditId, questionIndex: 0, role: role.id });
    return () => stopSpeaking();
  }, [auditId, role.id]);

  const submitAnswer = async (
    answerText: string,
    inputMethod: InputMethod,
    existingClientMessageId?: string
  ) => {
    if (isAiLoading) return;
    stopListening();
    stopSpeaking();
    setTurnError(null);
    setIsAiLoading(true);
    setQalamState('THINKING');

    const clientMessageId = existingClientMessageId || crypto.randomUUID();
    const isRetry = Boolean(existingClientMessageId);
    const userMessage: AuditMessage = {
      id: clientMessageId,
      sender: 'user',
      text: answerText,
      timestamp: Date.now(),
    };

    if (!isRetry) setMessages((previous) => [...previous, userMessage]);
    setTextInput('');
    setTranscript('');

    if (currentQuestionIndex === 3) setCommunicationSample(answerText);
    trackEvent('user_finished_speaking', {
      auditId,
      questionIndex: currentQuestionIndex,
      inputMethod,
      textLength: answerText.length,
    });

    try {
      const nextQuestion = currentQuestionIndex < PROBE_QUESTIONS.length - 1
        ? PROBE_QUESTIONS[currentQuestionIndex + 1].qalamPrompt
        : `Excellent work, ${firstName || 'there'}. I have enough evidence to calculate your readiness against the published benchmark.`;

      const response = await fetch('/api/qalam/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auditId,
          userText: answerText,
          inputMethod,
          clientMessageId,
          studentContext,
          targetRoleId: role.id,
          targetRole: role.title,
          currentStage: PROBE_QUESTIONS[currentQuestionIndex].id,
          nextQuestion,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) {
        const providerError = data.code === 'AI_UNAVAILABLE'
          ? 'Career audit AI is temporarily unavailable. Your answer is saved. Retry this turn when the service is available.'
          : data.message || 'Qalam could not process this answer.';
        throw new Error(providerError);
      }

      const persistedSkills: SkillEvidence[] = await Promise.all(
        (data.extractedSkills || []).map(async (skill: {
          skillName: string;
          extractedLevel: string;
          confidenceScore: number;
          evidenceStrength: 'Strong' | 'Moderate' | 'Weak' | 'None';
        }) => {
          const signalResponse = await fetch('/api/audit/evidence/signal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              auditId,
              studentId,
              phone,
              skillName: skill.skillName,
              extractedLevel: skill.extractedLevel,
              confidenceScore: skill.confidenceScore,
              evidenceStrength: skill.evidenceStrength,
              rawAnswerSnippet: answerText,
              source: inputMethod === 'voice' ? 'voice_probe' : 'typed_probe',
              sourceMessageId: data.sourceMessageId,
              idempotencyKey: `${data.sourceMessageId}:${skill.skillName.toLowerCase()}`,
            }),
          });
          const signalData = await signalResponse.json();
          if (!signalResponse.ok || signalData.success === false) {
            throw new Error(signalData.message || `Evidence for ${skill.skillName} could not be persisted.`);
          }
          return {
            skillName: skill.skillName,
            extractedLevel: skill.extractedLevel,
            confidenceScore: skill.confidenceScore,
            confidenceLevel: skill.confidenceScore >= 80 ? 'High' : skill.confidenceScore >= 55 ? 'Medium' : 'Low',
            evidenceStrength: skill.evidenceStrength,
            rawAnswerSnippet: answerText,
            source: inputMethod === 'voice' ? 'voice_probe' : 'typed_probe',
            signalId: signalData.signalId,
            evidenceId: signalData.evidenceId,
          } as SkillEvidence;
        })
      );

      const nextSkills = [...extractedSkills, ...persistedSkills];
      setExtractedSkills(nextSkills);
      const qalamMessage: AuditMessage = {
        id: data.qalamMessageId || crypto.randomUUID(),
        sender: 'qalam',
        text: data.qalamText,
        timestamp: Date.now(),
        qalamState: (data.qalamState as QalamState) || 'CURIOUS',
      };
      const nextMessages = [...messages, ...(isRetry ? [] : [userMessage]), qalamMessage];
      setMessages(nextMessages);
      setRetryTurn(null);

      if (data.needsFollowUp) {
        setIsFollowUpActive(true);
        setQalamState('SPEAKING');
        speakText(data.qalamText, () => setQalamState('LISTENING'));
        return;
      }

      setIsFollowUpActive(false);
      if (currentQuestionIndex < PROBE_QUESTIONS.length - 1) {
        const nextIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIndex);
        setQalamState('SPEAKING');
        speakText(data.qalamText, () => setQalamState('LISTENING'));
        trackEvent(`audit_progress_${nextIndex * 20}`, { auditId });
      } else {
        setQalamState('CELEBRATING');
        speakText(data.qalamText, () => {
          onInterviewFinished({
            messages: nextMessages,
            skillsExtracted: nextSkills,
            communicationSample: communicationSample || answerText,
          });
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'This audit turn could not be completed.';
      console.error('career_audit_turn_failed', { auditId, currentQuestionIndex, message });
      setTurnError(message);
      setRetryTurn({ answerText, inputMethod, clientMessageId });
      setQalamState('ENCOURAGING');
      trackEvent('career_audit_turn_failed', { auditId, questionIndex: currentQuestionIndex, message });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualTextSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (textInput.trim()) void submitAnswer(textInput.trim(), 'type');
  };

  const handleSkipQuestion = () => {
    trackEvent('voice_question_skipped', { auditId, questionIndex: currentQuestionIndex });
    void submitAnswer('I do not have evidence for this yet.', 'tap');
  };

  const lastQalamMessage = [...messages].reverse().find((message) => message.sender === 'qalam')?.text;
  const lastUserMessage = [...messages].reverse().find((message) => message.sender === 'user')?.text || transcript;

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      <div className="w-full flex items-center justify-between text-xs mb-2 px-1">
        <div className="flex items-center gap-1.5 font-bold text-[#0b111e]"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span>Target:</span><span className="text-[#1f3861]">{role.title}</span></div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">{PROBE_QUESTIONS.map((_, index) => <div key={index} className={`h-1.5 rounded-full transition-all duration-300 ${index < currentQuestionIndex ? 'w-4 bg-emerald-500' : index === currentQuestionIndex ? 'w-6 bg-[#1f3861]' : 'w-2 bg-slate-200'}`} />)}</div>
          <span className="text-[#1f3861] font-mono text-[10px] font-bold ml-1">{currentQuestionIndex + 1}/{PROBE_QUESTIONS.length}</span>
        </div>
      </div>

      <div className="my-1">
        <QalamCharacter
          state={isAiLoading ? 'THINKING' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : qalamState}
          audioAmplitude={amplitude}
          onSpeak={() => { if (lastQalamMessage) speakText(lastQalamMessage, () => setQalamState('LISTENING')); }}
        />
      </div>

      <VoiceWaveform amplitude={amplitude} isListening={isListening} isSpeaking={isSpeaking} />

      <div className="w-full my-2">
        <AnimatePresence>
          {isFollowUpActive && (
            <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8 }} className="mx-auto mb-2 w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-800 shadow-sm">Qalam found a deeper signal · clarifying</motion.div>
          )}
        </AnimatePresence>
        <CaptionsDisplay lastQalamText={lastQalamMessage} lastUserText={lastUserMessage} onEditTranscript={(newText) => void submitAnswer(newText, 'type')} isListening={isListening} isSpeaking={isSpeaking} />
      </div>

      {turnError && retryTurn && (
        <div className="w-full mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left">
          <div className="flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /><p className="text-[11px] leading-relaxed text-rose-800 font-medium">{turnError}</p></div>
          <button type="button" disabled={isAiLoading} onClick={() => void submitAnswer(retryTurn.answerText, retryTurn.inputMethod, retryTurn.clientMessageId)} className="mt-2 ml-6 text-[11px] font-bold text-[#1f3861] flex items-center gap-1"><RefreshCw className="w-3 h-3" />Retry saved answer</button>
        </div>
      )}

      <div className="w-full space-y-3 mt-1">
        <div className="flex items-center justify-center">
          <button type="button" disabled={isAiLoading || Boolean(turnError)} onClick={() => { if (isListening) stopListening(); else startListening(); }} className={`p-5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40 ${isListening ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 ring-8 ring-rose-100 animate-pulse' : 'bg-[#1f3861] hover:bg-[#182c4d] text-white shadow-blue-100 hover:shadow-blue-200'}`}>
            {isListening ? <MicOff className="w-7 h-7 animate-pulse" /> : <Mic className="w-7 h-7" />}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-medium">{isAiLoading ? 'Verifying and persisting evidence…' : isListening ? 'Listening... Tap when done' : isSpeaking ? 'Qalam speaking... (tap mic to answer)' : 'Tap mic to respond by voice'}</p>

        <form onSubmit={handleManualTextSubmit} className="flex gap-2">
          <input type="text" value={textInput} onChange={(event) => setTextInput(event.target.value)} disabled={isAiLoading || Boolean(turnError)} placeholder="Type your response instead..." className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-[#0b111e] font-medium focus:outline-none focus:border-[#1f3861] focus:bg-white transition disabled:opacity-50" />
          <button type="submit" disabled={!textInput.trim() || isAiLoading || Boolean(turnError)} className="px-4 py-2.5 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs transition disabled:opacity-40 flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"><Send className="w-3.5 h-3.5" /></button>
        </form>

        <div className="flex items-center justify-center pt-0.5">
          <button type="button" disabled={isAiLoading || Boolean(turnError)} onClick={handleSkipQuestion} className="text-[11px] text-slate-400 hover:text-[#1f3861] disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"><SkipForward className="w-3 h-3" />Skip this question</button>
        </div>
      </div>
    </div>
  );
};
