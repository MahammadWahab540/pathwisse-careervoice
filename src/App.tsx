import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { LandingView } from './components/audit/LandingView';
import { PhoneOtpStep } from './components/audit/PhoneOtpStep';
import { AskNameStep } from './components/audit/AskNameStep';
import { AskCollegeStep } from './components/audit/AskCollegeStep';
import { AskDepartmentStep } from './components/audit/AskDepartmentStep';
import { AskYearStep } from './components/audit/AskYearStep';
import { CareerDiscoveryStep } from './components/audit/CareerDiscoveryStep';
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
import { AdaptiveToolSurface } from './components/adaptive-ui/AdaptiveToolSurface';

import {
  type AdaptiveEvidenceSubmission,
  type QalamToolCall,
  mergeQalamToolCalls,
} from './ai/qalamTools';
import {
  UserIdentity,
  CareerRoleTarget,
  EvidenceUploads,
  CareerAuditResult,
  CareerGap,
  AuditMessage,
} from './types';
import type { CareerRoleDto, RoleRecommendationDto } from './types/career';
import { Loader2 } from 'lucide-react';
import { PathwisseFrame } from './components/ui/PathwisseUI';
import { syncProfile } from './api/profile';
import { createAuditSession, getAuditSession, uploadTextEvidence, finalizeAudit } from './api/audit';
import { getAuditReport } from './api/reports';
import { getRoadmapHandoff } from './api/roadmap';
import { trackAnalyticsEvent } from './api/analytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export type AuditStep =
  | 'WELCOME'
  | 'PHONE_OTP'
  | 'ASK_NAME'
  | 'ASK_COLLEGE'
  | 'ASK_DEPARTMENT'
  | 'ASK_YEAR'
  | 'CAREER_DISCOVERY'
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

function MainApp() {
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
  const [knownSkills, setKnownSkills] = useState<string[]>([]);
  const [discoveryProfile, setDiscoveryProfile] = useState<Record<string, unknown>>({});
  const [selectedRoleForExploration, setSelectedRoleForExploration] = useState<CareerRoleDto | null>(null);
  const [targetRole, setTargetRole] = useState<CareerRoleTarget | null>(null);
  const [restoredMessages, setRestoredMessages] = useState<AuditMessage[]>([]);
  const [evidence, setEvidence] = useState<EvidenceUploads>({});
  const [persistedEvidenceKeys, setPersistedEvidenceKeys] = useState<Record<string, boolean>>({});
  const [auditResult, setAuditResult] = useState<CareerAuditResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [flowError, setFlowError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [adaptiveToolCalls, setAdaptiveToolCalls] = useState<QalamToolCall[]>([]);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const activeJourneyStep = (() => {
    if (['WELCOME', 'PHONE_OTP', 'ASK_NAME', 'ASK_COLLEGE', 'ASK_DEPARTMENT', 'ASK_YEAR'].includes(currentStep)) return 0;
    if (currentStep === 'CAREER_DISCOVERY') return 1;
    if (currentStep === 'ROLE_DISCOVERY') return 2;
    if (['ROLE_EXPLANATION', 'LOAD_COMPETENCY_MODEL'].includes(currentStep)) return 3;
    if (['CAREER_READINESS_AUDIT', 'EVIDENCE_UPLOAD'].includes(currentStep)) return 4;
    if (currentStep === 'PROCESSING') return 5;
    return 6;
  })();

  const frameCopy = (() => {
    if (currentStep === 'WELCOME') return { title: 'Start with where you are', subtitle: 'A guided audit that turns interests, proof, and gaps into one clear next step.' };
    if (['PHONE_OTP', 'ASK_NAME', 'ASK_COLLEGE', 'ASK_DEPARTMENT', 'ASK_YEAR'].includes(currentStep)) return { title: 'Set your context', subtitle: 'Your branch, year, and campus help Qalam ask the right questions.' };
    if (currentStep === 'CAREER_DISCOVERY') return { title: 'Discover a direction', subtitle: 'Branch-aware questions help separate core, hybrid, and switch paths.' };
    if (currentStep === 'ROLE_DISCOVERY') return { title: 'Compare career directions', subtitle: 'Recommendations are ranked by your interests, skills, projects, and intent.' };
    if (['ROLE_EXPLANATION', 'LOAD_COMPETENCY_MODEL'].includes(currentStep)) return { title: 'Choose what to prove', subtitle: 'Pick one role benchmark before starting the evidence audit.' };
    if (['CAREER_READINESS_AUDIT', 'EVIDENCE_UPLOAD', 'PROCESSING'].includes(currentStep)) return { title: 'Prove what you know', subtitle: 'Qalam checks your answers and evidence against the selected role.' };
    return { title: 'Know what to improve', subtitle: 'Your report turns readiness gaps into prioritized action.' };
  })();

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

      trackAnalyticsEvent(payload);
    },
    [identity, auditId, currentStep, targetRole, selectedRoleForExploration, collegeId]
  );

  const handleToolCalls = useCallback((incomingCalls: QalamToolCall[]) => {
    setAdaptiveToolCalls((existing) => mergeQalamToolCalls(existing, incomingCalls));
  }, []);

  const handleAdaptiveEvidence = useCallback(
    async (submission: AdaptiveEvidenceSubmission) => {
      if (!auditId) return;
      try {
        const rawText = submission.url || submission.note || submission.fileName || '';
        const source = submission.url?.includes('github') ? 'github' : 'project';
        await uploadTextEvidence({
          auditId,
          evidenceType: 'adaptive_evidence',
          rawText,
          source,
          metadata: { skillName: submission.skillName },
        });
      } catch (err) {
        console.warn('Adaptive evidence upload notice:', err);
      }
    },
    [auditId]
  );

  // Resume / Restore Session on Page Refresh
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const storedAuditId = searchParams.get('auditId') || localStorage.getItem('careervoice_active_audit_id');
    const storedStudentId = localStorage.getItem('careervoice_student_id');
    const storedPhone = localStorage.getItem('careervoice_phone') || '';

    if (storedAuditId && storedStudentId) {
      setIsRestoring(true);
      setIdentity({
        studentId: storedStudentId,
        phone: storedPhone,
        countryCode: '+91',
        isOtpVerified: true,
        anonymousId: guestSessionId.current,
        sessionId: guestSessionId.current,
      });
      setAuditId(storedAuditId);

      getAuditSession(storedAuditId)
        .then(async (session) => {
          if (session.targetRole) {
            setTargetRole({
              id: session.targetRole.id,
              title: session.targetRole.title,
              category: session.targetRole.category || '',
              description: session.targetRole.description || '',
              demandLevel: (session.targetRole.demandLevel as any) || 'High',
              keySkills: session.targetRole.keySkills || [],
            });
          }

          if (session.status === 'completed' || session.status === 'finalized') {
            const report = await getAuditReport(storedAuditId);
            setAuditResult({
              auditId: report.auditId || storedAuditId,
              targetRoleId: report.targetRoleId || session.targetRoleId || 'default_role',
              targetRole: report.targetRole || session.targetRole?.title || 'Career Specialist',
              overallScore: report.overallScore,
              readinessStatus: report.readinessStatus,
              hiringBenchmark: report.hiringBenchmark,
              distanceFromBenchmark: report.distanceFromBenchmark,
              dimensionScores: report.dimensionScores,
              diagnosisSummary: report.diagnosisSummary,
              whyRoleFits: report.whyRoleFits,
              strengths: report.strengths,
              gaps: (report.gaps || []).map((g) => toCareerGap(g as unknown as ApiGap)),
              evidenceLedger: report.evidenceLedger,
              priorityRecommendations: report.priorityRecommendations,
              diagnosticConclusions: report.diagnosticConclusions,
              roadmap: [],
              recommendedPathwissePlan: {
                planName: 'Pathwisse Pro',
                highlight: 'Resolve verified gaps with industry mentors.',
                features: ['1-on-1 Code Reviews', 'Placement Drives'],
              },
            });
            setCurrentStep('READINESS_REPORT');
          } else {
            if (session.messages && session.messages.length > 0) {
              setRestoredMessages(
                session.messages.map((m) => ({
                  id: m.id,
                  sender: m.sender as 'qalam' | 'user',
                  text: m.text,
                  timestamp: m.timestamp,
                }))
              );
            }
            setCurrentStep('CAREER_READINESS_AUDIT');
          }
        })
        .catch((err) => {
          console.warn('Session restore error:', err);
          localStorage.removeItem('careervoice_active_audit_id');
        })
        .finally(() => {
          setIsRestoring(false);
        });
    }
  }, []);

  const handleSaveProfile = async (careerIntent: string, targetRoleId?: string) => {
    if (!identity?.studentId) throw new Error('Verified student identity is required.');
    await syncProfile({
      studentId: identity.studentId,
      firstName,
      collegeName,
      branch: departmentName,
      gradYear: academicYear,
      careerIntent,
      targetRoleId,
    });
  };

  const handleStartAuditSession = async (confirmedRole: CareerRoleTarget) => {
    setFlowError(null);
    if (!identity?.studentId) {
      setFlowError('Student identity could not be verified.');
      return;
    }

    try {
      const session = await createAuditSession({
        studentId: identity.studentId,
        targetRoleId: confirmedRole.id,
        context: {
          firstName,
          collegeName,
          collegeId,
          branch: departmentName,
          academicYear,
          careerIntent: userRawIntent,
        },
      });

      setAuditId(session.auditId);
      localStorage.setItem('careervoice_active_audit_id', session.auditId);
      localStorage.setItem('careervoice_student_id', identity.studentId);
      if (identity.phone) localStorage.setItem('careervoice_phone', identity.phone);

      const url = new URL(window.location.href);
      url.searchParams.set('auditId', session.auditId);
      window.history.replaceState({}, '', url.toString());

      await handleSaveProfile(userRawIntent, confirmedRole.id);
      setCurrentStep('CAREER_READINESS_AUDIT');
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Audit session could not be created.');
    }
  };

  const persistEvidencePayload = async (activeAuditId: string, currentEvidence: EvidenceUploads) => {
    const uploads: Array<{ key: string; type: string; text: string; source: 'resume' | 'project' | 'github' | 'document' }> = [];
    if (currentEvidence.resumeText && !persistedEvidenceKeys.resume) {
      uploads.push({ key: 'resume', type: 'resume_text', text: currentEvidence.resumeText, source: 'resume' });
    }
    if (currentEvidence.gitHubUrl && !persistedEvidenceKeys.github) {
      uploads.push({ key: 'github', type: 'github_profile', text: currentEvidence.gitHubUrl, source: 'github' });
    }
    if (currentEvidence.linkedInUrl && !persistedEvidenceKeys.linkedin) {
      uploads.push({ key: 'linkedin', type: 'linkedin_profile', text: currentEvidence.linkedInUrl, source: 'document' });
    }
    if (currentEvidence.portfolioUrl && !persistedEvidenceKeys.portfolio) {
      uploads.push({ key: 'portfolio', type: 'portfolio_url', text: currentEvidence.portfolioUrl, source: 'project' });
    }
    if (currentEvidence.internshipDetails && !persistedEvidenceKeys.internship) {
      uploads.push({ key: 'internship', type: 'internship_summary', text: currentEvidence.internshipDetails, source: 'document' });
    }

    if (uploads.length === 0) return;

    for (const item of uploads) {
      await uploadTextEvidence({
        auditId: activeAuditId,
        evidenceType: item.type,
        rawText: item.text,
        source: item.source,
      });
    }

    setPersistedEvidenceKeys((prev) => {
      const next = { ...prev };
      uploads.forEach((u) => { next[u.key] = true; });
      return next;
    });
  };

  const handleGenerateResults = async (evidencePayload: EvidenceUploads = evidence) => {
    if (!auditId) {
      setEvaluationError('Active audit session was not found.');
      return;
    }

    setCurrentStep('PROCESSING');
    setIsEvaluating(true);
    setEvaluationError(null);

    try {
      await persistEvidencePayload(auditId, evidencePayload);
      const data = await finalizeAudit(auditId);

      const fullResult: CareerAuditResult = {
        auditId: data.auditId || auditId,
        targetRoleId: data.targetRoleId || targetRole?.id || '',
        targetRole: data.targetRole || targetRole?.title || 'Career Specialist',
        overallScore: data.overallScore,
        readinessStatus: data.readinessStatus,
        hiringBenchmark: data.hiringBenchmark,
        distanceFromBenchmark: data.distanceFromBenchmark,
        dimensionScores: data.dimensionScores,
        diagnosisSummary: data.diagnosisSummary,
        whyRoleFits: data.whyRoleFits || [],
        strengths: data.strengths || [],
        gaps: (data.gaps || []).map((gap) => toCareerGap(gap as unknown as ApiGap)),
        evidenceLedger: data.evidenceLedger || [],
        priorityRecommendations: data.priorityRecommendations || [],
        diagnosticConclusions: data.diagnosticConclusions || [],
        roadmap: [],
        recommendedPathwissePlan: {
          planName: 'Pathwisse Pro',
          highlight: 'Fast-track your gap resolution with live mentor code reviews.',
          features: ['Targeted Skill Stages', '1-on-1 Code Reviews', 'Guaranteed Placement Drives'],
        },
      };

      setAuditResult(fullResult);
      setCurrentStep('READINESS_REPORT');
      trackEvent('career_audit_completed', {
        auditId,
        score: fullResult.overallScore,
        readinessStatus: fullResult.readinessStatus,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Career audit evaluation failed.';
      setEvaluationError(message);
      trackEvent('career_audit_evaluation_failed', { auditId, error: message });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRestartAudit = () => {
    localStorage.removeItem('careervoice_active_audit_id');
    const url = new URL(window.location.href);
    url.searchParams.delete('auditId');
    window.history.replaceState({}, '', url.toString());

    setCurrentStep('WELCOME');
    setIdentity(null);
    setAuditId(null);
    setFirstName('');
    setCollegeName('');
    setCollegeId('');
    setUserRawIntent('');
    setSelectedRoleForExploration(null);
    setTargetRole(null);
    setRestoredMessages([]);
    setEvidence({});
    setPersistedEvidenceKeys({});
    setAuditResult(null);
    setEvaluationError(null);
    setFlowError(null);
    setAdaptiveToolCalls([]);
  };

  if (isRestoring) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#0b111e] flex flex-col items-center justify-center font-sans">
        <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#1f3861]" />
          <p className="text-sm font-bold text-[#0b111e]">Resuming your CareerVoice session…</p>
        </div>
      </div>
    );
  }

  return (
    <PathwisseFrame
      title={frameCopy.title}
      subtitle={frameCopy.subtitle}
      activeStep={activeJourneyStep}
      studentName={firstName}
      onRestart={handleRestartAudit}
      auditLabel={auditId ? 'Audit in progress' : null}
      flowError={flowError || evaluationError}
    >
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
                localStorage.setItem('careervoice_student_id', ident.studentId);
                localStorage.setItem('careervoice_phone', ident.phone);
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
                setCurrentStep('CAREER_DISCOVERY');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'CAREER_DISCOVERY' && (
            <CareerDiscoveryStep
              studentId={identity?.studentId}
              firstName={firstName}
              departmentName={departmentName}
              careerStreamId={careerStreamId}
              academicYear={academicYear}
              onIntentProcessed={(intentData) => {
                setUserRawIntent(intentData.userRawIntent);
                setKnownSkills(intentData.knownSkills || []);
                setDiscoveryProfile(intentData.discoveryProfile || {});
                setCurrentStep('ROLE_DISCOVERY');
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
              studentId={identity?.studentId}
              academicYear={academicYear}
              knownSkills={knownSkills}
              discoveryProfile={discoveryProfile}
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
              departmentName={departmentName}
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
              onExploreAnotherRole={() => setCurrentStep('ROLE_DISCOVERY')}
              onSelectDifferentRole={(newRole) => setSelectedRoleForExploration(newRole)}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'LOAD_COMPETENCY_MODEL' && targetRole && (
            <LoadCompetencyModelStep
              role={targetRole}
              firstName={firstName}
              onProceedToAudit={() => {
                handleStartAuditSession(targetRole);
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'CAREER_READINESS_AUDIT' && targetRole && auditId && identity && (
            <AdaptiveInterviewStep
              auditId={auditId}
              studentId={identity.studentId}
              phone={identity.phone}
              role={targetRole}
              studentContext={{
                degree: 'B.Tech / B.E.',
                year: academicYear,
                collegeName,
                branch: departmentName,
              }}
              firstName={firstName}
              initialMessages={restoredMessages}
              onInterviewFinished={(_data) => {
                setCurrentStep('EVIDENCE_UPLOAD');
              }}
              onToolCalls={handleToolCalls}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'EVIDENCE_UPLOAD' && (
            <EvidenceUploadStep
              onComplete={(uploadedEvidence) => {
                setEvidence(uploadedEvidence);
                handleGenerateResults(uploadedEvidence);
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'PROCESSING' && (
            <ProcessingSequenceStep
              onFinished={() => {
                if (auditResult) setCurrentStep('READINESS_REPORT');
              }}
              trackEvent={trackEvent}
              error={evaluationError}
              isEvaluating={isEvaluating}
              onRetry={() => handleGenerateResults(evidence)}
            />
          )}

          {currentStep === 'READINESS_REPORT' && auditResult && targetRole && (
            <ReadinessReportView
              result={auditResult}
              role={targetRole}
              onNext={() => setCurrentStep('GAP_REPORT')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'GAP_REPORT' && auditResult && targetRole && (
            <GapReportView
              gaps={auditResult.gaps}
              role={targetRole}
              onNext={() => setCurrentStep('ROADMAP')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ROADMAP' && targetRole && auditId && identity && (
            <RoadmapView
              handoff={{
                contract: 'career-audit-roadmap-contract:v1',
                auditId,
                studentId: identity.studentId,
                targetRoleId: targetRole.id,
                readinessScore: auditResult?.overallScore || 0,
                priorityGaps: (auditResult?.gaps || []).map((g) => ({
                  gapId: g.id,
                  skillId: g.skillId || g.id,
                  skillName: g.title,
                  expectedScore: g.expectedScore ?? 70,
                  demonstratedScore: g.demonstratedScore ?? 50,
                  gapScore: g.gap ?? 20,
                  priority: g.priority || 'High',
                  mappingStatus: g.mappingStatus || 'UNMAPPED',
                  recommendedPathwisseSkillId: g.recommendedPathwisseSkillId,
                  recommendedStageIds: g.recommendedStageIds || [],
                  evidenceIds: g.evidenceIds || [],
                })),
              }}
              role={targetRole}
              onOpenShare={() => setIsShareOpen(true)}
              onOpenUpgrade={() => setIsUpgradeOpen(true)}
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
      <div className="sr-only" aria-live="polite">{currentStep}</div>

      {/* Modals */}
      {auditResult && targetRole && (
        <ShareCardModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          result={auditResult}
          role={targetRole}
          trackEvent={trackEvent}
        />
      )}

      <UpgradeModal
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        trackEvent={trackEvent}
      />
    </PathwisseFrame>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MainApp />
    </QueryClientProvider>
  );
}

export default App;
