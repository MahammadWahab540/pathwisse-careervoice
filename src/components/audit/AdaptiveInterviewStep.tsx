import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { VoiceWaveform } from '../voice/VoiceWaveform';
import { CaptionsDisplay } from '../voice/CaptionsDisplay';
import { EvidenceCoverageList } from './EvidenceCoverageList';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { useRoleCompetencies } from '../../hooks/useCareerRoles';
import { sendQalamChat, submitSkillSignal } from '../../api/audit';
import type {
  QalamState,
  CareerRoleTarget,
  AuditMessage,
  SkillEvidence,
  StudentContext,
} from '../../types';
import type { EvidenceCoverageItemDto, EvidenceStrength, EvidenceStatus } from '../../types/audit';
import {
  Mic,
  MicOff,
  Send,
  SkipForward,
  RefreshCw,
  AlertTriangle,
  Layers,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AdaptiveInterviewStepProps {
  auditId: string;
  studentId: string;
  phone?: string;
  role: CareerRoleTarget;
  studentContext: StudentContext;
  firstName?: string;
  initialMessages?: AuditMessage[];
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
  initialMessages = [],
  onInterviewFinished,
  trackEvent,
}) => {
  const [messages, setMessages] = useState<AuditMessage[]>(initialMessages);
  const [qalamState, setQalamState] = useState<QalamState>('SPEAKING');
  const [currentTurn, setCurrentTurn] = useState(0);
  const [textInput, setTextInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState<SkillEvidence[]>([]);
  const [communicationSample, setCommunicationSample] = useState('');
  const [isFollowUpActive, setIsFollowUpActive] = useState(false);
  const [turnError, setTurnError] = useState<string | null>(null);
  const [retryTurn, setRetryTurn] = useState<RetryTurn | null>(null);
  const [showCoverageMap, setShowCoverageMap] = useState(false);

  const { data: competencyModel } = useRoleCompetencies(role.id);

  const PROBE_STAGES = [
    {
      id: 'clarity_stage',
      prompt: `Great! Now I want to understand how close you already are to becoming an ${role.title}. First, why does this role interest you, and what do you think someone in this position actually does day-to-day?`,
    },
    {
      id: 'technical_core_stage',
      prompt: `Tell me about the most complex tool, project, or system you've built using ${role.keySkills[0] || 'your core technical skills'}. What part did you personally implement?`,
    },
    {
      id: 'architecture_stack_stage',
      prompt: `Which specific libraries, databases, or frameworks did you use in that build? What was the hardest bug or bottleneck you personally resolved?`,
    },
    {
      id: 'communication_defense_stage',
      prompt: `Imagine I am a technical hiring manager evaluating candidates for ${role.title}. Give me a concise 60-second professional summary of who you are, what you've built, and why you're ready for this track.`,
    },
    {
      id: 'execution_commitment_stage',
      prompt: `How many hours per week can you realistically dedicate to working on your career roadmap, and what usually gets in the way of staying consistent?`,
    },
  ];

  // Derive dynamic evidence coverage from live extracted skills + competency model
  const evidenceCoverageItems: EvidenceCoverageItemDto[] = (competencyModel?.coreCompetencies || role.keySkills.map((k, idx) => ({
    skillId: `comp_${idx}`,
    skillName: k,
    category: 'Applied Engineering',
    expectedScore: 70,
    importanceWeight: 20,
    dependencyWeight: 10,
    employabilityWeight: 20,
    description: k,
  }))).map((comp) => {
    const verified = extractedSkills.filter(
      (s) => s.skillName.toLowerCase() === comp.skillName.toLowerCase()
    );
    const latest = verified[verified.length - 1];
    const strength: EvidenceStrength = latest?.evidenceStrength || 'None';
    let status: EvidenceStatus = 'Insufficient Evidence';
    if (strength === 'Strong') status = 'Strong Evidence';
    else if (strength === 'Moderate') status = 'Moderate Evidence';
    else if (strength === 'Weak') status = 'Weak Evidence';

    return {
      skillId: comp.skillId,
      skillName: comp.skillName,
      category: comp.category,
      expectedScore: comp.expectedScore,
      demonstratedScore: latest ? latest.confidenceScore : undefined,
      evidenceStrength: strength,
      evidenceStatus: status,
      confidenceScore: latest ? latest.confidenceScore : 0,
      observationsCount: verified.length,
    };
  });

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
    if (messages.length === 0) {
      const initialPrompt = PROBE_STAGES[0].prompt;
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
      trackEvent('career_audit_started', { auditId, role: role.id });
    }
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

    if (!isRetry) setMessages((prev) => [...prev, userMessage]);
    setTextInput('');
    setTranscript('');

    if (currentTurn === 3) setCommunicationSample(answerText);
    trackEvent('audit_answer_submitted', {
      auditId,
      turn: currentTurn,
      inputMethod,
      textLength: answerText.length,
    });

    try {
      const nextStageIndex = currentTurn < PROBE_STAGES.length - 1 ? currentTurn + 1 : currentTurn;
      const nextQuestion =
        currentTurn < PROBE_STAGES.length - 1
          ? PROBE_STAGES[nextStageIndex].prompt
          : `Great job, ${firstName || 'there'}. I have collected verifiable evidence against this benchmark.`;

      const data = await sendQalamChat({
        auditId,
        userText: answerText,
        inputMethod,
        clientMessageId,
        studentContext: studentContext as unknown as Record<string, unknown>,
        targetRoleId: role.id,
        targetRole: role.title,
        currentStage: PROBE_STAGES[currentTurn].id,
        nextQuestion,
      });

      const persistedSkills: SkillEvidence[] = await Promise.all(
        (data.extractedSkills || []).map(async (skill) => {
          const signalData = await submitSkillSignal({
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
          });

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
      if (currentTurn < PROBE_STAGES.length - 1) {
        const nextIndex = currentTurn + 1;
        setCurrentTurn(nextIndex);
        setQalamState('SPEAKING');
        speakText(data.qalamText, () => setQalamState('LISTENING'));
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
      console.error('career_audit_turn_failed', { auditId, turn: currentTurn, message });
      setTurnError(message);
      setRetryTurn({ answerText, inputMethod, clientMessageId });
      setQalamState('ENCOURAGING');
      trackEvent('career_audit_turn_failed', { auditId, turn: currentTurn, message });
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) void submitAnswer(textInput.trim(), 'type');
  };

  const handleSkip = () => {
    trackEvent('voice_question_skipped', { auditId, turn: currentTurn });
    void submitAnswer('I have not built this yet.', 'tap');
  };

  const lastQalamMessage = [...messages].reverse().find((m) => m.sender === 'qalam')?.text;
  const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user')?.text || transcript;

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      {/* Evidence Coverage Status Header (Replaces fixed 1/5 question counter) */}
      <div className="w-full flex items-center justify-between text-xs mb-2 px-1">
        <div className="flex items-center gap-1.5 font-bold text-[#0b111e]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Auditing:</span>
          <span className="text-[#1f3861]">{role.title}</span>
        </div>

        <button
          type="button"
          onClick={() => setShowCoverageMap(!showCoverageMap)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-[10px] font-bold text-[#1f3861] hover:bg-blue-100 transition cursor-pointer"
        >
          <Shield className="w-3 h-3" />
          <span>
            {evidenceCoverageItems.filter((i) => i.evidenceStrength !== 'None').length} /{' '}
            {evidenceCoverageItems.length} Covered
          </span>
          {showCoverageMap ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expandable Live Evidence Coverage Map */}
      <AnimatePresence>
        {showCoverageMap && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mb-2 overflow-hidden"
          >
            <EvidenceCoverageList items={evidenceCoverageItems} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="my-1">
        <QalamCharacter
          state={isAiLoading ? 'THINKING' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : qalamState}
          audioAmplitude={amplitude}
          onSpeak={() => {
            if (lastQalamMessage) speakText(lastQalamMessage, () => setQalamState('LISTENING'));
          }}
        />
      </div>

      <VoiceWaveform amplitude={amplitude} isListening={isListening} isSpeaking={isSpeaking} />

      <div className="w-full my-2">
        <AnimatePresence>
          {isFollowUpActive && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              className="mx-auto mb-2 w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-bold text-amber-800 shadow-sm"
            >
              Probing technical evidence · clarifying
            </motion.div>
          )}
        </AnimatePresence>
        <CaptionsDisplay
          lastQalamText={lastQalamMessage}
          lastUserText={lastUserMessage}
          onEditTranscript={(newText) => void submitAnswer(newText, 'type')}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />
      </div>

      {turnError && retryTurn && (
        <div className="w-full mb-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-left space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed text-rose-800 font-medium">{turnError}</p>
          </div>
          <button
            type="button"
            disabled={isAiLoading}
            onClick={() => void submitAnswer(retryTurn.answerText, retryTurn.inputMethod, retryTurn.clientMessageId)}
            className="ml-6 text-[11px] font-bold text-[#1f3861] flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Retry saved answer
          </button>
        </div>
      )}

      {/* Input Controls */}
      <div className="w-full space-y-3 mt-1">
        <div className="flex items-center justify-center">
          <button
            type="button"
            disabled={isAiLoading || Boolean(turnError)}
            onClick={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            className={`p-5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 disabled:opacity-40 ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white ring-8 ring-rose-100 animate-pulse'
                : 'bg-[#1f3861] hover:bg-[#182c4d] text-white shadow-blue-100'
            }`}
          >
            {isListening ? <MicOff className="w-7 h-7 animate-pulse" /> : <Mic className="w-7 h-7" />}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-medium">
          {isAiLoading
            ? 'Extracting and verifying evidence…'
            : isListening
            ? 'Listening... Tap mic when done speaking'
            : isSpeaking
            ? 'Qalam speaking... (tap mic to respond)'
            : 'Tap mic to answer by voice'}
        </p>

        <form onSubmit={handleManualTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isAiLoading || Boolean(turnError)}
            placeholder="Type your answer instead..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-[#0b111e] font-medium focus:outline-none focus:border-[#1f3861] focus:bg-white transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isAiLoading || Boolean(turnError)}
            className="px-4 py-2.5 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs transition disabled:opacity-40 flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="flex items-center justify-center pt-0.5">
          <button
            type="button"
            disabled={isAiLoading || Boolean(turnError)}
            onClick={handleSkip}
            className="text-[11px] text-slate-400 hover:text-[#1f3861] disabled:opacity-40 transition flex items-center gap-1 font-semibold cursor-pointer"
          >
            <SkipForward className="w-3 h-3" /> Skip / No direct experience
          </button>
        </div>
      </div>
    </div>
  );
};
