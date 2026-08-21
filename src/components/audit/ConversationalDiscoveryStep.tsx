import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Keyboard, Loader2, Mic, MicOff, RefreshCw, Sparkles } from 'lucide-react';
import { QalamCharacter } from '../qalam/QalamCharacter';
import { useVoiceInteraction } from '../../hooks/useVoiceInteraction';
import type { StudentCareerProfile } from '../../types';

interface DiscoveryMessage {
  id: string;
  actor: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: Record<string, unknown>;
}

interface ConversationalDiscoveryStepProps {
  auditId: string;
  firstName: string;
  onComplete: (profile: StudentCareerProfile) => void;
  trackEvent: (eventName: string, metadata?: Record<string, unknown>) => void;
}

const START_PROMPT = 'Before I suggest a career direction, tell me about what you are studying, the kind of work or problems you enjoy, and anything you have built, tried, or worked on so far.';

export const ConversationalDiscoveryStep: React.FC<ConversationalDiscoveryStepProps> = ({
  auditId,
  firstName,
  onComplete,
  trackEvent,
}) => {
  const [profile, setProfile] = useState<StudentCareerProfile | null>(null);
  const [messages, setMessages] = useState<DiscoveryMessage[]>([]);
  const [missingDimensions, setMissingDimensions] = useState<string[]>([]);
  const [complete, setComplete] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<{ text: string; method: 'voice' | 'text'; clientMessageId: string } | null>(null);

  const lastQalamText = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.actor === 'assistant');
    return lastAssistant?.content || START_PROMPT;
  }, [messages]);

  const { isListening, isSpeaking, amplitude, startListening, stopListening, speakText, stopSpeaking } = useVoiceInteraction({
    onSpeechResult: (text) => {
      if (text.trim()) void submit(text.trim(), 'voice');
    },
    onBargeIn: () => stopSpeaking(),
  });

  const loadState = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/discovery/${encodeURIComponent(auditId)}/state`);
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || 'Career discovery could not be resumed.');
      setProfile(data.profile || null);
      setMessages(data.messages || []);
      setMissingDimensions(data.missingDimensions || []);
      setComplete(Boolean(data.complete));
      if ((data.messages || []).length === 0) speakText(START_PROMPT);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Career discovery could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadState();
    return () => stopSpeaking();
  }, [auditId]);

  const submit = async (answerText: string, method: 'voice' | 'text', existingClientMessageId?: string) => {
    if (submitting || !answerText.trim()) return;
    stopListening();
    stopSpeaking();
    setSubmitting(true);
    setError(null);
    const clientMessageId = existingClientMessageId || crypto.randomUUID();
    setRetry(null);
    try {
      const response = await fetch(`/api/discovery/${encodeURIComponent(auditId)}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userText: answerText,
          inputMethod: method,
          clientMessageId,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || 'Qalam could not process this discovery answer.');
      setProfile(data.profile);
      setMissingDimensions(data.missingDimensions || []);
      setComplete(Boolean(data.complete));
      setMessages((previous) => [
        ...previous,
        { id: data.sourceMessageId, actor: 'user', content: answerText },
        { id: data.qalamMessageId, actor: 'assistant', content: data.qalamText },
      ]);
      setTextInput('');
      trackEvent('career_discovery_turn_completed', {
        auditId,
        missingDimensions: data.missingDimensions || [],
        complete: Boolean(data.complete),
      });
      speakText(data.qalamText);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Career discovery failed.';
      setError(message);
      setRetry({ text: answerText, method, clientMessageId });
      trackEvent('career_discovery_turn_failed', { auditId, message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center gap-3 px-5 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#1f3861]" />
        <p className="text-xs text-slate-500">Resuming your CareerVoice discovery…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-80px)] px-4 py-4 max-w-md mx-auto text-center space-y-3">
      <QalamCharacter
        state={submitting ? 'THINKING' : isSpeaking ? 'SPEAKING' : isListening ? 'LISTENING' : complete ? 'CELEBRATING' : 'CURIOUS'}
        audioAmplitude={amplitude}
        subtitles={lastQalamText}
        onSpeak={() => speakText(lastQalamText)}
      />

      <div className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b111e]"><Sparkles className="w-3.5 h-3.5 text-[#1f3861]" />Student Career Profile</div>
          <span className="rounded-full border border-blue-100 bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-[#1f3861]">Conversation, not a form</span>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-xs text-slate-700 leading-relaxed">{lastQalamText}</p>
        </div>

        {!complete && missingDimensions.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mb-1.5">Still learning about</p>
            <div className="flex flex-wrap gap-1">
              {missingDimensions.slice(0, 6).map((dimension) => (
                <span key={dimension} className="text-[10px] rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-slate-600">{dimension.replace(/([A-Z])/g, ' $1')}</span>
              ))}
              {missingDimensions.length > 6 && <span className="text-[10px] text-slate-400">+{missingDimensions.length - 6} more</span>}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[11px] text-rose-800">
            {error}
            {retry && (
              <button type="button" onClick={() => void submit(retry.text, retry.method, retry.clientMessageId)} className="mt-2 flex items-center gap-1 font-bold text-[#1f3861]"><RefreshCw className="w-3 h-3" />Retry saved answer</button>
            )}
          </div>
        )}

        {!complete ? (
          <>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (textInput.trim()) void submit(textInput.trim(), 'text');
              }}
              className="flex items-end gap-2"
            >
              <div className="flex-1 relative">
                <Keyboard className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <textarea
                  value={textInput}
                  onChange={(event) => setTextInput(event.target.value)}
                  placeholder={`Tell Qalam more, ${firstName || 'here'}…`}
                  className="w-full min-h-20 resize-none rounded-2xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-xs text-[#0b111e] outline-none focus:border-[#1f3861]"
                />
              </div>
              <button type="submit" disabled={submitting || !textInput.trim()} className="rounded-full bg-[#1f3861] p-3 text-white disabled:opacity-40"><ArrowRight className="w-4 h-4" /></button>
            </form>

            <div className="flex justify-center">
              <button
                type="button"
                disabled={submitting || Boolean(retry)}
                onClick={() => (isListening ? stopListening() : startListening())}
                className={`rounded-full p-4 text-white transition disabled:opacity-40 ${isListening ? 'bg-rose-500' : 'bg-[#1f3861]'}`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3">
              <p className="text-xs font-bold text-emerald-900">Discovery complete</p>
              <p className="text-[11px] text-emerald-800 mt-1">Qalam now has enough stated context to compare career directions without pretending this is readiness evidence.</p>
              {profile?.technicalSkills?.length ? <p className="text-[10px] text-emerald-900 mt-2">Reported technical exposure: {profile.technicalSkills.join(', ')}</p> : null}
            </div>
            <button type="button" onClick={() => profile && onComplete(profile)} disabled={!profile} className="w-full rounded-full bg-[#1f3861] py-3.5 text-xs font-bold text-white flex items-center justify-center gap-2">See My Career Directions <ArrowRight className="w-4 h-4" /></button>
          </div>
        )}
      </div>
    </div>
  );
};
