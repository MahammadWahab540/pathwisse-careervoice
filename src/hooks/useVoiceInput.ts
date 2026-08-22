import { useState, useCallback } from 'react';
import { useVoiceInteraction, type UseVoiceInteractionProps } from './useVoiceInteraction';

export interface UseVoiceInputOptions extends UseVoiceInteractionProps {
  onAutoSubmit?: (transcript: string) => void;
}

export function useVoiceInput({
  onSpeechResult,
  onBargeIn,
  onAutoSubmit,
}: UseVoiceInputOptions = {}) {
  const [draftTranscript, setDraftTranscript] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);

  const handleSpeechResult = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      setDraftTranscript(trimmed);
      onSpeechResult?.(trimmed);
      if (onAutoSubmit && trimmed) {
        onAutoSubmit(trimmed);
      }
    },
    [onSpeechResult, onAutoSubmit]
  );

  const voice = useVoiceInteraction({
    onSpeechResult: handleSpeechResult,
    onBargeIn,
  });

  const clearTranscript = useCallback(() => {
    setDraftTranscript('');
    voice.setTranscript('');
    setIsEditingTranscript(false);
  }, [voice]);

  const updateDraft = useCallback((text: string) => {
    setDraftTranscript(text);
    setIsEditingTranscript(true);
  }, []);

  return {
    ...voice,
    draftTranscript: draftTranscript || voice.transcript,
    isEditingTranscript,
    updateDraft,
    clearTranscript,
  };
}
