import React, { useState, useCallback } from 'react';
<<<<<<< HEAD
import { doc, setDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
=======
>>>>>>> fd3138c (Remove Firebase dependencies and migrate to Supabase)

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
import { ReAuditModal } from './components/audit/ReAuditModal';
import { SupabaseConfigModal } from './components/audit/SupabaseConfigModal';
import { AdaptiveToolSurface } from './components/adaptive-ui/AdaptiveToolSurface';

import { CareerRole, CONSUMER_CAREER_ROLES } from './data/careerTaxonomy';
import { PATHWISSE_ROLES, generateDefaultRoadmap } from './data/knowledgeGraph';
import {
  type AdaptiveEvidenceSubmission,
  type QalamToolCall,
  mergeQalamToolCalls,
} from './ai/qalamTools';
import {
  UserIdentity,
  StudentContext,
  CareerRoleTarget,
  AuditMessage,
  SkillEvidence,
  EvidenceUploads,
  CareerAuditResult,
} from './types';
import { RotateCcw, Database } from 'lucide-react';

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

export function App() {
  const [currentStep, setCurrentStep] = useState<AuditStep>('WELCOME');

  // Core Journey State
  const [identity, setIdentity] = useState<UserIdentity | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [collegeName, setCollegeName] = useState<string>('');
  const [collegeId, setCollegeId] = useState<string>('');
  const [careerStreamId, setCareerStreamId] = useState<string>('cs_eng');
  const [departmentName, setDepartmentName] = useState<string>('Computer Science Engineering');
  const [academicYear, setAcademicYear] = useState<string>('3rd Year');
  const [userRawIntent, setUserRawIntent] = useState<string>('');

  const [selectedRoleForExploration, setSelectedRoleForExploration] = useState<CareerRole | null>(null);
  const [targetRole, setTargetRole] = useState<CareerRoleTarget>(PATHWISSE_ROLES[0]);

  const [interviewMessages, setInterviewMessages] = useState<AuditMessage[]>([]);
  const [skillsExtracted, setSkillsExtracted] = useState<SkillEvidence[]>([]);
  const [communicationSample, setCommunicationSample] = useState('');
  const [evidence, setEvidence] = useState<EvidenceUploads>({});
  const [auditResult, setAuditResult] = useState<CareerAuditResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [adaptiveToolCalls, setAdaptiveToolCalls] = useState<QalamToolCall[]>([]);

  // Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);
  const [isReAuditOpen, setIsReAuditOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  const handleToolCalls = useCallback((calls: QalamToolCall[]) => {
    if (!calls.length) return;
    setAdaptiveToolCalls((existing) => mergeQalamToolCalls(existing, calls));
  }, []);

  // Strict Analytics Event Tracker
  const trackEvent = useCallback(
    (eventName: string, metadata: Record<string, any> = {}) => {
      const payload = {
        eventName,
        anonymousId: identity?.anonymousId || 'anon_guest',
        sessionId: identity?.sessionId || `sess_${Date.now()}`,
        auditId: `audit_${Date.now()}`,
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
      }).catch((e) => console.warn('Analytics tracking error:', e));

    },
    [identity, currentStep, targetRole, selectedRoleForExploration, collegeId]
  );

  const handleAdaptiveEvidence = useCallback((submission: AdaptiveEvidenceSubmission) => {
    setEvidence((current) => ({
      ...current,
      adaptiveEvidence: [...(current.adaptiveEvidence || []), submission],
    }));
    trackEvent('adaptive_evidence_attached', {
      skillName: submission.skillName,
      hasFile: Boolean(submission.fileName),
      hasUrl: Boolean(submission.url),
    });
  }, [trackEvent]);

  // Handle Evaluation & Audit Score Generation
  const handleGenerateResults = async (evidenceOverride?: EvidenceUploads) => {
    setCurrentStep('PROCESSING');
    setIsEvaluating(true);
    setEvaluationError(null);

    const studentCtx: StudentContext = {
      degree: 'B.Tech / B.E.',
      year: academicYear,
      collegeName,
      branch: departmentName,
    };
    const evidenceForEvaluation = evidenceOverride || evidence;

    try {
      const res = await fetch('/api/qalam/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentContext: studentCtx,
          targetRole: targetRole.title,
          targetRoleId: targetRole.id,
          conversationHistory: interviewMessages,
          communicationSample,
          evidenceData: evidenceForEvaluation,
          phone: identity?.phone || '',
        }),
      });

      const data = await res.json();

      if (!res.ok || data.success === false) {
        throw new Error(data.error || 'Evaluation engine failed to score audit answers.');
      }

      if (Array.isArray(data.toolCalls) && data.toolCalls.length > 0) {
        handleToolCalls(data.toolCalls as QalamToolCall[]);
      }

      const fullResult: CareerAuditResult = {
        overallScore: data.overallScore,
        dimensionScores: data.dimensionScores,
        diagnosisSummary: data.diagnosisSummary,
        diagnosticConclusions: data.diagnosticConclusions,
        gaps: data.gaps,
        roadmap: data.roadmap || generateDefaultRoadmap(targetRole.id, targetRole.title),
        recommendedPathwissePlan: data.recommendedPathwissePlan || {
          planName: 'Pathwisse Pro',
          highlight: 'Fast-track your gap resolution in 6 weeks with live mentor code reviews.',
          features: ['6-Week Course Modules', '1-on-1 Mentor Code Reviews', 'Guaranteed Placement Drives'],
        },
      };

      setAuditResult(fullResult);
      setIsEvaluating(false);

      // Sync Audit Record to Supabase BaaS
      fetch('/api/supabase/audit/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: identity?.phone || 'anonymous',
          targetRole: targetRole.title,
          auditResult: fullResult,
          evidenceData: evidenceForEvaluation,
        }),
      }).catch((e) => console.warn('Supabase audit sync notice:', e));

    } catch (err: any) {
      console.error('Failed to generate results:', err);
      setIsEvaluating(false);
      setEvaluationError(err.message || 'Audit evaluation failed. Please retry.');
    }
  };

  const handleRestartAudit = () => {
    setCurrentStep('WELCOME');
    setIdentity(null);
    setFirstName('');
    setInterviewMessages([]);
    setEvidence({});
    setAuditResult(null);
    setAdaptiveToolCalls([]);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0b111e] flex flex-col font-sans selection:bg-[#1f3861] selection:text-white">
      {/* Clean Header Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/95 border-b border-[#e1e7ef] backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2.5 cursor-pointer" onClick={handleRestartAudit}>
          <div className="w-8 h-8 rounded-full bg-[#1f3861] flex items-center justify-center font-bold text-white text-xs shadow-xs">
            P
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-[#0b111e] leading-tight tracking-tight">
              Pathwisse <span className="text-[#1f3861]">Qalam</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSupabaseOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition shadow-2xs cursor-pointer"
            title="Supabase BaaS Status & Schema"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Supabase</span> BaaS
          </button>

          <button
            onClick={handleRestartAudit}
            className="p-2 rounded-full bg-white border border-[#e1e7ef] text-[#344256] hover:text-[#0b111e] hover:bg-[#f8fafc] transition shadow-xs cursor-pointer"
            title="Restart Audit"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile-first Product Frame Container */}
      <main className="flex-1 flex items-center justify-center p-2 sm:p-4 my-auto">
        <div className="w-full max-w-[390px] min-h-[780px] border border-[#e1e7ef] rounded-[28px] bg-white shadow-xl shadow-slate-200/50 overflow-hidden relative flex flex-col justify-between">
          {currentStep === 'WELCOME' && (
            <LandingView
              onStart={() => setCurrentStep('PHONE_OTP')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'PHONE_OTP' && (
            <PhoneOtpStep
              onVerified={(ident) => {
                setIdentity(ident);
                setCurrentStep('ASK_NAME');

              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ASK_NAME' && (
            <AskNameStep
              onComplete={(fName) => {
                setFirstName(fName);
                setCurrentStep('ASK_COLLEGE');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ASK_COLLEGE' && (
            <AskCollegeStep
              firstName={firstName}
              onComplete={(cName, cId) => {
                setCollegeName(cName);
                setCollegeId(cId);
                setCurrentStep('ASK_DEPARTMENT');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ASK_DEPARTMENT' && (
            <AskDepartmentStep
              firstName={firstName}
              onComplete={(streamId, dName) => {
                setCareerStreamId(streamId);
                setDepartmentName(dName);
                setCurrentStep('ASK_YEAR');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ASK_YEAR' && (
            <AskYearStep
              firstName={firstName}
              onComplete={(aYear) => {
                setAcademicYear(aYear);
                setCurrentStep('CAREER_INTENT');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'CAREER_INTENT' && (
            <CareerIntentStep
              firstName={firstName}
              departmentName={departmentName}
              careerStreamId={careerStreamId}
              onIntentProcessed={(intentData) => {
                setUserRawIntent(intentData.userRawIntent);
                setCurrentStep('ROLE_DISCOVERY');

                // Sync Student Profile to Supabase BaaS
                fetch('/api/supabase/profile/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    phone: identity?.phone || 'anonymous',
                    firstName: firstName,
                    collegeTier: 'Tier-2/3',
                    collegeName: collegeName,
                    branch: departmentName,
                    gradYear: academicYear,
                    careerIntent: intentData.userRawIntent,
                  }),
                }).catch((e) => console.warn('Supabase profile sync notice:', e));
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ROLE_DISCOVERY' && (
            <RoleDiscoveryStep
              firstName={firstName}
              careerStreamId={careerStreamId}
              userRawIntent={userRawIntent}
              onSelectRoleForExplanation={(role) => {
                setSelectedRoleForExploration(role);
                setCurrentStep('ROLE_EXPLANATION');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ROLE_EXPLANATION' && selectedRoleForExploration && (
            <RoleExplanationStep
              role={selectedRoleForExploration}
              firstName={firstName}
              allRoles={CONSUMER_CAREER_ROLES.slice(0, 5)}
              onConfirmTargetRole={(confirmedRole) => {
                const target: CareerRoleTarget = {
                  id: confirmedRole.id,
                  title: confirmedRole.title,
                  category: confirmedRole.category,
                  description: confirmedRole.description,
                  demandLevel: confirmedRole.demandLevel,
                  keySkills: confirmedRole.keySkills,
                };
                setTargetRole(target);
                setCurrentStep('LOAD_COMPETENCY_MODEL');
              }}
              onSelectDifferentRole={(newRole) => {
                setSelectedRoleForExploration(newRole);
              }}
              onExploreAnotherRole={() => setCurrentStep('ROLE_DISCOVERY')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'LOAD_COMPETENCY_MODEL' && (
            <LoadCompetencyModelStep
              role={targetRole}
              firstName={firstName}
              onProceedToAudit={() => setCurrentStep('CAREER_READINESS_AUDIT')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'CAREER_READINESS_AUDIT' && (
            <AdaptiveInterviewStep
              role={targetRole}
              studentContext={{
                degree: 'B.Tech / B.E.',
                year: academicYear,
                collegeName,
                branch: departmentName,
              }}
              firstName={firstName}
              onToolCalls={handleToolCalls}
              onInterviewFinished={(data) => {
                setInterviewMessages(data.messages);
                setSkillsExtracted(data.skillsExtracted);
                setCommunicationSample(data.communicationSample);
                setCurrentStep('EVIDENCE_UPLOAD');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'EVIDENCE_UPLOAD' && (
            <EvidenceUploadStep
              onComplete={(ev) => {
                const evidenceWithAdaptiveProof: EvidenceUploads = {
                  ...evidence,
                  ...ev,
                  adaptiveEvidence: evidence.adaptiveEvidence,
                };
                setEvidence(evidenceWithAdaptiveProof);
                handleGenerateResults(evidenceWithAdaptiveProof);
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'PROCESSING' && (
            <ProcessingSequenceStep
              isEvaluating={isEvaluating}
              error={evaluationError}
              onRetry={() => handleGenerateResults()}
              onFinished={() => setCurrentStep('READINESS_REPORT')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'READINESS_REPORT' && auditResult && (
            <ReadinessReportView
              result={auditResult}
              role={targetRole}
              onNext={() => setCurrentStep('GAP_REPORT')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'GAP_REPORT' && auditResult && (
            <GapReportView
              gaps={auditResult.gaps}
              role={targetRole}
              onNext={() => setCurrentStep('ROADMAP')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ROADMAP' && auditResult && (
            <RoadmapView
              roadmap={auditResult.roadmap}
              role={targetRole}
              onOpenShare={() => setIsShareOpen(true)}
              onOpenUpgrade={() => setIsUpgradeOpen(true)}
              onOpenReAudit={() => setIsReAuditOpen(true)}
              trackEvent={trackEvent}
            />
          )}

          <AdaptiveToolSurface
            calls={adaptiveToolCalls}
            onSubmitEvidence={handleAdaptiveEvidence}
            onDismiss={(callId) => {
              setAdaptiveToolCalls((calls) => calls.filter((call) => call.id !== callId));
            }}
          />
        </div>
      </main>

      {/* Share, Upgrade, & Re-Audit Modals */}
      {auditResult && (
        <>
          <ShareCardModal
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            result={auditResult}
            role={targetRole}
            trackEvent={trackEvent}
          />

          <ReAuditModal
            isOpen={isReAuditOpen}
            onClose={() => setIsReAuditOpen(false)}
            role={targetRole}
            roadmap={auditResult.roadmap}
            previousResult={auditResult}
            onReAuditComplete={(updatedRes) => {
              setAuditResult(updatedRes);
              setCurrentStep('READINESS_REPORT');
            }}
            trackEvent={trackEvent}
          />
        </>
      )}

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        trackEvent={trackEvent}
      />

      <SupabaseConfigModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </div>
  );
}

export default App;