import React, { useState, useEffect } from 'react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { VoiceWaveform } from '../voice/VoiceWaveform';
import { CaptionsDisplay } from '../voice/CaptionsDisplay';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import { QalamState, CareerRoleTarget, AuditMessage, SkillEvidence } from '../../types';
import { Mic, MicOff, Send, SkipForward, Sparkles } from 'lucide-react';

interface AdaptiveInterviewStepProps {
  role: CareerRoleTarget;
  studentContext: any;
  firstName?: string;
  onInterviewFinished: (data: {
    messages: AuditMessage[];
    skillsExtracted: SkillEvidence[];
    communicationSample: string;
  }) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
}

export const AdaptiveInterviewStep: React.FC<AdaptiveInterviewStepProps> = ({
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

  // Fixed 5-Stage Career Readiness Probe
  const PROBE_QUESTIONS = [
    {
      id: 'q_clarity',
      qalamPrompt: `Great! Now I want to understand how close you already are to becoming an ${role.title}. First, why does this role interest you, and what do you think someone in this position actually does day-to-day?`,
      state: 'CURIOUS' as QalamState,
    },
    {
      id: 'q_evidence_build',
      qalamPrompt: `Tell me about the most complex tool, project, or task you've built using ${role.keySkills[0] || 'your core technical skills'}. What part did you personally implement?`,
      state: 'CURIOUS' as QalamState,
    },
    {
      id: 'q_libraries_stack',
      qalamPrompt: `Which specific libraries, frameworks, or databases did you use in that build? What was the hardest bug or challenge you ran into?`,
      state: 'CURIOUS' as QalamState,
    },
    {
      id: 'q_communication_60s',
      qalamPrompt: `Imagine I am a technical hiring manager evaluating candidates for an ${role.title} role. Give me a 60-second professional introduction summarizing who you are and what you've built so far.`,
      state: 'SPEAKING' as QalamState,
    },
    {
      id: 'q_execution_readiness',
      qalamPrompt: `How many hours per week can you realistically dedicate to working on your career roadmap, and what usually gets in the way of staying consistent?`,
      state: 'CURIOUS' as QalamState,
    },
  ];

  const handleSpeechResult = (text: string) => {
    if (!text.trim()) return;
    submitAnswer(text, 'voice');
  };

  const handleBargeIn = () => {
    stopSpeaking();
    setQalamState('LISTENING');
    trackEvent('user_interrupted_qalam');
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
    onBargeIn: handleBargeIn,
  });

  // Initial Question Setup
  useEffect(() => {
    const initialPrompt = PROBE_QUESTIONS[0].qalamPrompt;
    const initialMsg: AuditMessage = {
      id: `msg_${Date.now()}`,
      sender: 'qalam',
      text: initialPrompt,
      timestamp: Date.now(),
      qalamState: 'WELCOME',
    };

    setMessages([initialMsg]);
    setQalamState('SPEAKING');
    speakText(initialPrompt, () => setQalamState('LISTENING'));

    trackEvent('career_audit_started', { questionIndex: 0, role: role.id });
  }, [role]);

  const submitAnswer = async (answerText: string, inputMethod: 'voice' | 'type' | 'tap') => {
    stopListening();
    stopSpeaking();

    const userMsg: AuditMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: answerText,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setTextInput('');
    setTranscript('');
    setIsAiLoading(true);
    setQalamState('THINKING');

    if (currentQuestionIndex === 3) {
      setCommunicationSample(answerText);
    }

    trackEvent('user_finished_speaking', {
      questionIndex: currentQuestionIndex,
      inputMethod,
      textLength: answerText.length,
    });

    try {
      const res = await fetch('/api/qalam/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: answerText,
          history: messages,
          studentContext,
          targetRole: role.title,
          currentStage: PROBE_QUESTIONS[currentQuestionIndex].id,
        }),
      });

      const data = await res.json();
      setIsAiLoading(false);

      if (data.extractedSkills && data.extractedSkills.length > 0) {
        setExtractedSkills((prev) => [
          ...prev,
          ...data.extractedSkills.map((s: any) => ({
            skillName: s.skill,
            claimedLevel: 'Intermediate',
            evidenceLevel: s.level || 'Intermediate',
            confidenceScore: s.confidence || (data.evidenceStrength === 'Strong' ? 90 : data.evidenceStrength === 'Weak' ? 45 : 75),
            confidenceLevel: (data.evidenceStrength === 'Strong' ? 'High' : data.evidenceStrength === 'Weak' ? 'Low' : 'Medium') as 'High' | 'Medium' | 'Low',
            mappedEvidence: answerText.slice(0, 100),
          })),
        ]);
      }

      // If weak evidence detected and not already probing follow-up for this question
      const hasFollowUp = (data.needsFollowUp || data.evidenceStrength === 'Weak') && data.followUpQuestion && !isFollowUpActive;

      if (hasFollowUp) {
        setIsFollowUpActive(true);
        const followUpText = `${data.qalamText} ${data.followUpQuestion}`;
        const newState = 'CURIOUS';

        const newQalamMsg: AuditMessage = {
          id: `qlm_${Date.now()}`,
          sender: 'qalam',
          text: followUpText,
          timestamp: Date.now(),
          qalamState: newState,
        };

        setMessages((prev) => [...prev, newQalamMsg]);
        setQalamState('SPEAKING');

        speakText(followUpText, () => {
          setQalamState('LISTENING');
        });
        return;
      }

      // Reset follow-up flag if it was active
      if (isFollowUpActive) {
        setIsFollowUpActive(false);
      }

      if (currentQuestionIndex < PROBE_QUESTIONS.length - 1) {
        const nextIdx = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIdx);

        const nextQalamText = `${data.qalamText} ${PROBE_QUESTIONS[nextIdx].qalamPrompt}`;
        const newState = (data.qalamState as QalamState) || 'CURIOUS';

        const newQalamMsg: AuditMessage = {
          id: `qlm_${Date.now()}`,
          sender: 'qalam',
          text: nextQalamText,
          timestamp: Date.now(),
          qalamState: newState,
        };

        setMessages((prev) => [...prev, newQalamMsg]);
        setQalamState('SPEAKING');

        speakText(nextQalamText, () => {
          setQalamState('LISTENING');
        });

        trackEvent(`audit_progress_${nextIdx * 20}`);
      } else {
        const finalQalamText = `${data.qalamText} Excellent work, ${firstName || 'friend'}! I have mapped your skill signals and baseline confidence. Let's inspect your project evidence next.`;
        setQalamState('CELEBRATING');

        speakText(finalQalamText, () => {
          onInterviewFinished({
            messages,
            skillsExtracted: extractedSkills,
            communicationSample: communicationSample || answerText,
          });
        });
      }
    } catch (err) {
      console.error('Qalam Chat Error:', err);
      setIsAiLoading(false);
      setQalamState('ENCOURAGING');

      if (currentQuestionIndex < PROBE_QUESTIONS.length - 1) {
        const nextIdx = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIdx);
        const fallbackText = PROBE_QUESTIONS[nextIdx].qalamPrompt;
        speakText(fallbackText, () => setQalamState('LISTENING'));
      } else {
        onInterviewFinished({
          messages,
          skillsExtracted: extractedSkills,
          communicationSample: communicationSample || answerText,
        });
      }
    }
  };

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    submitAnswer(textInput.trim(), 'type');
  };

  const handleSkipQuestion = () => {
    trackEvent('voice_question_skipped', { questionIndex: currentQuestionIndex });
    submitAnswer("I'm not completely sure about this yet. Let's move to the next question.", 'tap');
  };

  const lastQalamMessage = [...messages].reverse().find((m) => m.sender === 'qalam')?.text;
  const lastUserMessage = [...messages].reverse().find((m) => m.sender === 'user')?.text || transcript;

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-4 max-w-sm mx-auto text-center selection:bg-[#1f3861] selection:text-white">
      {/* Audit Header Stage Progress */}
      <div className="w-full flex items-center justify-between text-xs mb-2 px-1">
        <div className="flex items-center gap-1.5 font-bold text-[#0b111e]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span>Target:</span>
          <span className="text-[#1f3861]">{role.title}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex gap-1">
            {PROBE_QUESTIONS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i < currentQuestionIndex
                    ? 'w-4 bg-emerald-500'
                    : i === currentQuestionIndex
                    ? 'w-6 bg-[#1f3861]'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>
          <span className="text-[#1f3861] font-mono text-[10px] font-bold ml-1">
            {currentQuestionIndex + 1}/{PROBE_QUESTIONS.length}
          </span>
        </div>
      </div>

      {/* Main Living Qalam Character */}
      <div className="my-1">
        <QalamCharacter
          state={isAiLoading ? 'THINKING' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : qalamState}
          audioAmplitude={amplitude}
          onSpeak={() => {
            if (lastQalamMessage) {
              speakText(lastQalamMessage, () => setQalamState('LISTENING'));
            }
          }}
        />
      </div>

      {/* Audio Reactive Waveform Indicator */}
      <VoiceWaveform amplitude={amplitude} isListening={isListening} isSpeaking={isSpeaking} />

      {/* Live Captions Display */}
      <div className="w-full my-2">
        <CaptionsDisplay
          lastQalamText={lastQalamMessage}
          lastUserText={lastUserMessage}
          onEditTranscript={(newText) => submitAnswer(newText, 'type')}
          isListening={isListening}
          isSpeaking={isSpeaking}
        />
      </div>

      {/* Interaction Control Area */}
      <div className="w-full space-y-3 mt-1">
        {/* Microphone Button */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={() => {
              if (isListening) {
                stopListening();
              } else {
                startListening();
              }
            }}
            className={`p-5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 flex items-center justify-center cursor-pointer active:scale-95 ${
              isListening
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-200 ring-8 ring-rose-100 animate-pulse'
                : 'bg-[#1f3861] hover:bg-[#182c4d] text-white shadow-blue-100 hover:shadow-blue-200'
            }`}
          >
            {isListening ? (
              <MicOff className="w-7 h-7 animate-pulse" />
            ) : (
              <Mic className="w-7 h-7" />
            )}
          </button>
        </div>

        <p className="text-[11px] text-slate-500 font-medium">
          {isListening ? 'Listening... Tap when done' : isSpeaking ? 'Qalam speaking... (tap mic to answer)' : 'Tap mic to respond by voice'}
        </p>

        {/* Text Input Fallback */}
        <form onSubmit={handleManualTextSubmit} className="flex gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your response instead..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2.5 text-xs text-[#0b111e] font-medium focus:outline-none focus:border-[#1f3861] focus:bg-white transition"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || isAiLoading}
            className="px-4 py-2.5 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs transition disabled:opacity-40 flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Skip Question */}
        <div className="flex items-center justify-center pt-0.5">
          <button
            type="button"
            onClick={handleSkipQuestion}
            className="text-[11px] text-slate-400 hover:text-[#1f3861] transition flex items-center gap-1 font-semibold cursor-pointer"
          >
            <SkipForward className="w-3 h-3" />
            Skip this question
          </button>
        </div>
      </div>
    </div>
  );
};

