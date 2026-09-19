import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { App, type AuditStep } from '../../App';

export function AssessmentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  let initialStep: AuditStep = 'CAREER_DISCOVERY';
  if (mode === 'resume') {
    initialStep = 'CAREER_READINESS_AUDIT';
  } else if (mode === 'report') {
    initialStep = 'READINESS_REPORT';
  } else {
    initialStep = 'CAREER_DISCOVERY';
  }

  return (
    <App
      initialStep={initialStep}
      onExit={() => navigate('/student')}
    />
  );
}
