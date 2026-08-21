import React, { useCallback, useRef, useState } from 'react';

import { LandingView } from './components/audit/LandingView';
import { PhoneOtpStep } from './components/audit/PhoneOtpStep';
import { AskNameStep } from './components/audit/AskNameStep';
import { AskCollegeStep } from './components/audit/AskCollegeStep';
import { AskDepartmentStep } from './components/audit/AskDepartmentStep';
import { AskYearStep } from './components/audit/AskYearStep';
import { CareerIntentStep } from './components/audit/CareerIntentStep';
import { RoleDiscoveryStep } from './components/audit/RoleDiscoveryStep';
import { RoleExplanationStep } from './components/audit/RoleExplanationStep';
import { LoadCompetencyModelStep } from './components/audit/LoadCompetencyModelStep';
import { AdaptiveInterviewStep } from './components/audit/AdaptiveInterviewStep';
import { EvidenceUploadStep } from './components/audit/EvidenceUploadStep';
import { ProcessingSequenceStep } from './components/audit/ProcessingSequenceStep';
import { ReadinessReportView } from './components/audit/ReadinessReportView';
import { GapReportView } from './components/audit/GapReportView';
import { RoadmapView } from './components/audit/RoadmapView';
import { ShareCardModal } from './components/audit/ShareCardModal';
import { UpgradeModal } from './components/audit/UpgradeModal';

import { CareerRole } from './data/careerTaxonomy';
import {
  UserIdentity,
  CareerRoleTarget,
  EvidenceUploads,
  CareerAuditResult,
  CareerGap,
} from './types';

type AuditStep =
  | 'WELCOME'
  | 'PHONE_OTP'
  | 'ASK_NAME'
  | 'ASK_COLLEGE'
  | 'ASK_DEPARTMENT'
  | 'ASK_YEAR'
  | 'CAREER_INTENT'
  | 'ROLE_DISCOVERY'
  | 'ROLE_EXPLANATION'
  | 'LOAD_COMPETENCY_MODEL'
  | 'CAREER_READINESS_AUDIT'
  | 'EVIDENCE_UPLOAD'
  | 'PROCESSING'
  | 'READINESS_REPORT'
  | 'GAP_REPORT'
  | 'ROADMAP';

interface ApiGap {
  gapId: string;
  skillId: string;
  skillName: string;
  expectedScore: number;
  demonstratedScore: number;
  gap: number;
  priorityWeight: number;
  weightedGap: number;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  evidenceIds: string[];
  signalIds: string[];
  evidenceBasis: string;
  recommendedAction: string;
  mappingStatus: 'MAPPED' | 'UNMAPPED';
  recommendedPathwisseSkillId?: string;
  recommendedStageIds: string[];
}

function severityFromPriority(priority: ApiGap['priority']): 'RED' | 'ORANGE' | 'GREEN' {
  if (priority === 'Critical' || priority === 'High') return 'RED';
  if (priority === 'Medium') return 'ORANGE';
  return 'GREEN';
}

function toCareerGap(gap: ApiGap): CareerGap {
  return {
    id: gap.gapId,
    gapId: gap.gapId,
    skillId: gap.skillId,
    title: gap.skillName,
    skillName: gap.skillName,
    severity: severityFromPriority(gap.priority),
    priority: gap.priority,
    description: `Expected ${gap.expectedScore}; demonstrated ${gap.demonstratedScore}; gap ${gap.gap}.`,
    expectedScore: gap.expectedScore,
    demonstratedScore: gap.demonstratedScore,
    gap: gap.gap,
    priorityWeight: gap.priorityWeight,
    weightedGap: gap.weightedGap,
    recommendedAction: gap.recommendedAction,
    recommendedPathwisseSkillId: gap.recommendedPathwisseSkillId,
    recommendedStageIds: gap.recommendedStageIds,
    mappingStatus: gap.mappingStatus,
    evidenceBasis: gap.evidenceBasis,
    evidenceIds: gap.evidenceIds,
    signalIds: gap.signalIds,
  };
}

export function App() {
  const [currentStep, setCurrentStep] = useState<AuditStep>('WELCOME');
  const guestSessionId = useRef(crypto.randomUUID());

  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [auditId, setAuditId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [careerStreamId, setCareerStreamId] = useState('cs_eng');
  const [departmentName, setDepartmentName] = useState('Computer Science Engineering');
  const [academicYear, setAcademicYear] = useState('3rd Year');
  const [userRawIntent, setUserRawIntent] = useState('');
  const [selectedRoleForExploration, setSelectedRoleForExploration] = useState<CareerRole | null>(null);
  const [targetRole, setTargetRole] = useState<CareerRoleTarget | null>(null);
  const [evidence, setEvidence] = useState<EvidenceUploads>({});
  const [persistedEvidenceKeys, setPersistedEvidenceKeys] = useState<Record<string, boolean>>({});
  const [auditResult, setAuditResult] = useState<CareerAuditResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const trackEvent = useCallback(
    (eventName: string, metadata: Record<string, unknown> = {}) => {
      const payload = {
        eventName,
        studentId: identity?.studentId,
        anonymousId: identity?.anonymousId || guestSessionId.current,
        sessionId: identity?.sessionId || guestSessionId.current,
        auditId: auditId || undefined,
        screenName: currentStep,
        careerRole: targetRole?.id || selectedRoleForExploration?.id,
        collegeId: collegeId || identity?.collegeId,
        campaignId: identity?.campaignId,
        referralCode: identity?.referralCode,
        metadata,
      };

      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((error) => console.warn('analytics_tracking_failed', error));
    },
    [identity, auditId, currentStep, targetRole, selectedRoleForExploration, collegeId]
  );

  const syncProfile = async (careerIntent: string, targetRoleId?: string) => {
    if (!identity?.studentId) throw new Error('Verified student identity is required before saving the profile.');
    const response = await fetch('/api/profile/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: identity.studentId,
        phone: identity.phone,
        firstName,
        collegeName,
        branch: departmentName,
        gradYear: academicYear,
        careerIntent,
        targetRoleId,
      }),
    });
    const data = await response.json();
    if (!response.ok || data.success === false) throw new Error(data.message || 'Student profile could not be saved.');
    return data;
  };

  const createAuditSession = async (role: CareerRole) => {
    if (!identity?.studentId) throw new Error('Verified student identity is required before creating an audit.');
    const response = await fetch('/api/audit/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: identity.studentId,
        targetRoleId: role.id,
        idempotencyKey: `${identity.sessionId}:${role.id}`,
        context: {
          firstName,
          collegeName,
          collegeId,
          departmentName,
          academicYear,
          careerIntent: userRawIntent,
        },
      }),
    });
    const data = await response.json();
    if (!response.ok || data.success === false || !data.auditId) throw new Error(data.message || 'Career audit session could not be created.');
    return data.auditId as string;
  };

  const handleRoleConfirmation = async (confirmedRole: CareerRole) => {
    setFlowError(null);
    try {
      const target: CareerRoleTarget = {
        id: confirmedRole.id,
        title: confirmedRole.title,
        category: confirmedRole.category,
        description: confirmedRole.description,
        demandLevel: confirmedRole.demandLevel,
        keySkills: confirmedRole.keySkills,
      };
      await syncProfile(userRawIntent, confirmedRole.id);
      const canonicalAuditId = await createAuditSession(confirmedRole);
      setTargetRole(target);
      setAuditId(canonicalAuditId);
      setPersistedEvidenceKeys({});
      setCurrentStep('LOAD_COMPETENCY_MODEL');
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Could not start the career audit.');
    }
  };

  const evidenceEntries = (uploads: EvidenceUploads) => [
    uploads.resumeText ? { key: 'resumeText', evidenceType: 'resume_text', rawText: uploads.resumeText, source: 'resume', metadata: { fileName: uploads.resumeFileName } } : null,
    uploads.linkedInUrl ? { key: 'linkedInUrl', evidenceType: 'linkedin_profile', rawText: uploads.linkedInUrl, source: 'document', metadata: {} } : null,
    uploads.gitHubUrl ? { key: 'gitHubUrl', evidenceType: 'github_profile', rawText: uploads.gitHubUrl, source: 'github', metadata: {} } : null,
    uploads.portfolioUrl ? { key: 'portfolioUrl', evidenceType: 'portfolio', rawText: uploads.portfolioUrl, source: 'project', metadata: {} } : null,
    uploads.internshipDetails ? { key: 'internshipDetails', evidenceType: 'internship', rawText: uploads.internshipDetails, source: 'project', metadata: {} } : null,
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const handleGenerateResults = async (uploads: EvidenceUploads = evidence) => {
    if (!auditId || !targetRole) {
      setEvaluationError('A canonical audit session is required before evaluation.');
      setCurrentStep('PROCESSING');
      return;
    }

    setCurrentStep('PROCESSING');
    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      const successfulKeys = { ...persistedEvidenceKeys };
      for (const item of evidenceEntries(uploads)) {
        if (successfulKeys[item.key]) continue;
        const evidenceResponse = await fetch(`/api/audit/${encodeURIComponent(auditId)}/evidence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
        const evidenceData = await evidenceResponse.json();
        if (!evidenceResponse.ok || evidenceData.success === false) {
          throw new Error(evidenceData.message || `Could not persist ${item.evidenceType} evidence.`);
        }
        successfulKeys[item.key] = true;
        setPersistedEvidenceKeys({ ...successfulKeys });
      }

      const response = await fetch(`/api/audit/${encodeURIComponent(auditId)}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contract: 'career-audit:v1' }),
      });
      const data = await response.json();
      if (!response.ok || data.success === false) throw new Error(data.message || 'Career audit finalization failed.');

      const handoffResponse = await fetch(`/api/audit/${encodeURIComponent(auditId)}/roadmap-handoff`);
      const handoffData = await handoffResponse.json();
      if (!handoffResponse.ok || handoffData.success === false) throw new Error(handoffData.message || 'Roadmap handoff could not be loaded.');

      const fullResult: CareerAuditResult = {
        auditId: data.auditId,
        targetRoleId: data.targetRoleId,
        targetRole: data.targetRole,
        overallScore: data.overallScore,
        readinessStatus: data.readinessStatus,
        hiringBenchmark: data.hiringBenchmark,
        distanceFromBenchmark: data.distanceFromBenchmark,
        dimensionScores: data.dimensionScores,
        diagnosisSummary: data.diagnosisSummary,
        whyRoleFits: data.whyRoleFits || [],
        strengths: data.strengths || [],
        gaps: (data.gaps || []).map((gap: ApiGap) => toCareerGap(gap)),
        evidenceLedger: data.evidenceLedger || [],
        priorityRecommendations: data.priorityRecommendations || [],
        diagnosticConclusions: data.diagnosticConclusions || [],
        roadmapHandoff: {
          contract: handoffData.contract,
          auditId: handoffData.auditId,
          studentId: handoffData.studentId,
          targetRoleId: handoffData.targetRoleId,
          readinessScore: handoffData.readinessScore,
          priorityGaps: handoffData.priorityGaps,
        },
      };
      setAuditResult(fullResult);
      setIsEvaluating(false);
    } catch (error) {
      console.error('career_audit_finalization_failed', error);
      setIsEvaluating(false);
      setEvaluationError(error instanceof Error ? error.message : 'Audit evaluation failed. Please retry.');
    }
  };

  const handleRestartAudit = () => {
    setCurrentStep('WELCOME');
    setIdentity(null);
    setAuditId(null);
    setFirstName('');
    setCollegeName('');
    setCollegeId('');
    setUserRawIntent('');
    setTargetRole(null);
    setSelectedRoleForExploration(null);
    setEvidence({});
    setPersistedEvidenceKeys({});
    setAuditResult(null);
    setFlowError(null);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0b111e] flex flex-col font-sans selection:bg-[#1f3861] selection:text-white">
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 my-auto">
        <div className="w-full max-w-[390px] min-h-[780px] border border-[#e1e7ef] rounded-[28px] bg-white shadow-xl shadow-slate-200/50 overflow-hidden relative flex flex-col justify-between">
          {flowError && (
            <div className="absolute top-3 left-3 right-3 z-50 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-medium text-rose-800 shadow-sm">
              {flowError}
              <button type="button" onClick={() => setFlowError(null)} className="ml-2 font-bold underline">Dismiss</button>
            </div>
          )}

          {currentStep === 'WELCOME' && <LandingView onStart={() => setCurrentStep('PHONE_OTP')} trackEvent={trackEvent} />}

          {currentStep === 'PHONE_OTP' && (
            <PhoneOtpStep onVerified={(verifiedIdentity) => { setIdentity(verifiedIdentity); setCurrentStep('ASK_NAME'); }} trackEvent={trackEvent} />
          )}

          {currentStep === 'ASK_NAME' && <AskNameStep onComplete={(value) => { setFirstName(value); setCurrentStep('ASK_COLLEGE'); }} trackEvent={trackEvent} />}

          {currentStep === 'ASK_COLLEGE' && (
            <AskCollegeStep firstName={firstName} onComplete={(name, id) => { setCollegeName(name); setCollegeId(id); setCurrentStep('ASK_DEPARTMENT'); }} trackEvent={trackEvent} />
          )}

          {currentStep === 'ASK_DEPARTMENT' && (
            <AskDepartmentStep firstName={firstName} onComplete={(streamId, name) => { setCareerStreamId(streamId); setDepartmentName(name); setCurrentStep('ASK_YEAR'); }} trackEvent={trackEvent} />
          )}

          {currentStep === 'ASK_YEAR' && <AskYearStep firstName={firstName} onComplete={(value) => { setAcademicYear(value); setCurrentStep('CAREER_INTENT'); }} trackEvent={trackEvent} />}

          {currentStep === 'CAREER_INTENT' && (
            <CareerIntentStep
              firstName={firstName}
              departmentName={departmentName}
              careerStreamId={careerStreamId}
              onIntentProcessed={(intentData) => {
                setFlowError(null);
                setUserRawIntent(intentData.userRawIntent);
                void syncProfile(intentData.userRawIntent)
                  .then(() => setCurrentStep('ROLE_DISCOVERY'))
                  .catch((error) => setFlowError(error instanceof Error ? error.message : 'Profile could not be persisted.'));
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ROLE_DISCOVERY' && (
            <RoleDiscoveryStep
              firstName={firstName}
              careerStreamId={careerStreamId}
              departmentName={departmentName}
              userRawIntent={userRawIntent}
              onSelectRoleForExplanation={(role) => { setSelectedRoleForExploration(role); setCurrentStep('ROLE_EXPLANATION'); }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ROLE_EXPLANATION' && selectedRoleForExploration && (
            <RoleExplanationStep
              role={selectedRoleForExploration}
              firstName={firstName}
              allRoles={[selectedRoleForExploration]}
              onConfirmTargetRole={(role) => void handleRoleConfirmation(role)}
              onSelectDifferentRole={(role) => setSelectedRoleForExploration(role)}
              onExploreAnotherRole={() => setCurrentStep('ROLE_DISCOVERY')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'LOAD_COMPETENCY_MODEL' && targetRole && auditId && (
            <LoadCompetencyModelStep role={targetRole} firstName={firstName} onProceedToAudit={() => setCurrentStep('CAREER_READINESS_AUDIT')} trackEvent={trackEvent} />
          )}

          {currentStep === 'CAREER_READINESS_AUDIT' && targetRole && auditId && identity && (
            <AdaptiveInterviewStep
              auditId={auditId}
              studentId={identity.studentId}
              phone={identity.phone}
              role={targetRole}
              studentContext={{ degree: 'B.Tech / B.E.', year: academicYear, collegeName, branch: departmentName }}
              firstName={firstName}
              onInterviewFinished={() => setCurrentStep('EVIDENCE_UPLOAD')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'EVIDENCE_UPLOAD' && (
            <EvidenceUploadStep onComplete={(uploads) => { setEvidence(uploads); void handleGenerateResults(uploads); }} trackEvent={trackEvent} />
          )}

          {currentStep === 'PROCESSING' && (
            <ProcessingSequenceStep isEvaluating={isEvaluating} error={evaluationError} onRetry={() => void handleGenerateResults()} onFinished={() => setCurrentStep('READINESS_REPORT')} trackEvent={trackEvent} />
          )}

          {currentStep === 'READINESS_REPORT' && auditResult && targetRole && (
            <ReadinessReportView result={auditResult} role={targetRole} onNext={() => setCurrentStep('GAP_REPORT')} trackEvent={trackEvent} />
          )}

          {currentStep === 'GAP_REPORT' && auditResult && targetRole && (
            <GapReportView gaps={auditResult.gaps} role={targetRole} onNext={() => setCurrentStep('ROADMAP')} trackEvent={trackEvent} />
          )}

          {currentStep === 'ROADMAP' && auditResult?.roadmapHandoff && targetRole && (
            <RoadmapView handoff={auditResult.roadmapHandoff} role={targetRole} onOpenShare={() => setIsShareOpen(true)} onOpenUpgrade={() => setIsUpgradeOpen(true)} trackEvent={trackEvent} />
          )}
        </div>
      </main>

      {auditResult && targetRole && (
        <ShareCardModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} result={auditResult} role={targetRole} trackEvent={trackEvent} />
      )}

      <UpgradeModal isOpen={isUpgradeOpen} onClose={() => setIsUpgradeOpen(false)} trackEvent={trackEvent} />

      {auditResult && (
        <button type="button" onClick={handleRestartAudit} className="fixed bottom-3 right-3 text-[10px] text-slate-400 hover:text-slate-700">Start a new audit</button>
      )}
    </div>
  );
}

export default App;
