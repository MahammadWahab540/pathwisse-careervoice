import React from 'react';
import { CareerDiscoveryStep } from './CareerDiscoveryStep';

interface CareerIntentStepProps {
  firstName: string;
  departmentName: string;
  careerStreamId: string;
  onIntentProcessed: (intentData: {
    stateType: 'KNOWS_ROLE' | 'KNOWS_DIRECTION' | 'DOESNT_KNOW';
    userRawIntent: string;
    detectedDirection?: string;
  }) => void;
  trackEvent: (eventName: string, metadata?: any) => void;
  onBack?: () => void;
}

export const CareerIntentStep: React.FC<CareerIntentStepProps> = ({
  firstName,
  departmentName,
  careerStreamId,
  onIntentProcessed,
  trackEvent,
}) => {
  return (
    <CareerDiscoveryStep
      firstName={firstName}
      departmentName={departmentName}
      careerStreamId={careerStreamId}
      onIntentProcessed={(intentData) => {
        const intent = intentData.userRawIntent || '';
        onIntentProcessed({
          stateType: intent ? 'KNOWS_DIRECTION' : 'DOESNT_KNOW',
          userRawIntent: intent,
          detectedDirection: intent,
        });
      }}
      trackEvent={trackEvent}
    />
  );
};

