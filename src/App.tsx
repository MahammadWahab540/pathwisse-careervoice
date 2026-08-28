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
import { getBrowserSupabase } from './lib/supabaseBrowser';
import {
  ACTIVE_AUDIT_ID_KEY,
  AUTH_ACCESS_TOKEN_KEY,
  FLOW_CHECKPOINT_KEY,
  PHONE_KEY,
  STUDENT_ID_KEY,
  clearCareerVoiceAuditId,
  logCareerVoiceEvent,
  readCareerVoiceCheckpoint,
  resolveInitialCheckpoint,
  writeCareerVoiceCheckpoint,
  type CareerVoiceStep,
} from './domain/careerVoiceFlow';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export type AuditStep = CareerVoiceStep;

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
  const [currentStep, setCurrentStep] = useState<AuditStep>('BOOTSTRAPPING');
  const guestSessionId = useRef(crypto.randomUUID());
  const flowGenerationRef = useRef(0);

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
  const [isRestoring, setIsRestoring] = useState(true);
  const [adaptiveToolCalls, setAdaptiveToolCalls] = useState<QalamToolCall[]>([]);

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const persistFlowCheckpoint = useCallback(
    (step: AuditStep, nextIdentity = identity, nextAuditId = auditId) => {
      if (step === 'BOOTSTRAPPING') return;
      writeCareerVoiceCheckpoint(localStorage, {
        authenticated: Boolean(nextIdentity?.isOtpVerified || nextIdentity?.studentId),
        identity: nextIdentity,
        onboardingCheckpoint: step,
        activeAuditId: nextAuditId,
        updatedAt: new Date().toISOString(),
        flowGeneration: flowGenerationRef.current,
      });
    },
    [auditId, identity]
  );

  const transitionToStep = useCallback(
    (to: AuditStep, reason: string, options: { nextIdentity?: UserIdentity | null; nextAuditId?: string | null; persist?: boolean } = {}) => {
      flowGenerationRef.current += 1;
      setCurrentStep((from) => {
        logCareerVoiceEvent('careervoice_step_transition', {
          from,
          to,
          reason,
          studentId: options.nextIdentity?.studentId || identity?.studentId,
          authenticated: Boolean(options.nextIdentity?.isOtpVerified || identity?.isOtpVerified),
          auditId: options.nextAuditId ?? auditId,
          flowGeneration: flowGenerationRef.current,
        });
        return to;
      });
      if (options.persist !== false) {
        persistFlowCheckpoint(to, options.nextIdentity === undefined ? identity : options.nextIdentity, options.nextAuditId === undefined ? auditId : options.nextAuditId);
      }
    },
    [auditId, identity, persistFlowCheckpoint]
  );

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
    const requestGeneration = flowGenerationRef.current;
    const searchParams = new URLSearchParams(window.location.search);
    const urlAuditId = searchParams.get('auditId');
    const checkpoint = resolveInitialCheckpoint({
      checkpoint: readCareerVoiceCheckpoint(localStorage),
      storedStudentId: localStorage.getItem(STUDENT_ID_KEY),
      storedPhone: localStorage.getItem(PHONE_KEY) || '',
      storedAuditId: localStorage.getItem(ACTIVE_AUDIT_ID_KEY),
      urlAuditId,
      guestSessionId: guestSessionId.current,
    });

    logCareerVoiceEvent('flow_restore_started', {
      studentId: checkpoint.identity?.studentId,
      auditId: checkpoint.activeAuditId,
      checkpoint: checkpoint.onboardingCheckpoint,
      flowGeneration: requestGeneration,
    });

    const supabase = getBrowserSupabase();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, data.session.access_token);
        if (data.session.user?.id) {
          setIdentity((prev) => prev ? { ...prev, accessToken: data.session?.access_token } : prev);
        }
      }
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token) {
        localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, session.access_token);
        setIdentity((prev) => (prev ? { ...prev, accessToken: session.access_token } : prev));
      } else {
        localStorage.removeItem(AUTH_ACCESS_TOKEN_KEY);
      }
    });

    if (checkpoint.identity) {
      setIdentity(checkpoint.identity);
      logCareerVoiceEvent('flow_restore_identity_found', { studentId: checkpoint.identity.studentId });
    }

    const completeRestore = (step: AuditStep, restoredAuditId: string | null = checkpoint.activeAuditId) => {
      setAuditId(restoredAuditId);
      setIsRestoring(false);
      transitionToStep(step, 'restore_completed', {
        nextIdentity: checkpoint.identity,
        nextAuditId: restoredAuditId,
      });
      logCareerVoiceEvent('flow_restore_completed', { checkpoint: step, auditId: restoredAuditId });
    };

    if (!checkpoint.authenticated || !checkpoint.identity) {
      completeRestore('WELCOME', null);
      return () => authSubscription?.subscription.unsubscribe();
    }

    logCareerVoiceEvent('flow_restore_checkpoint_found', { checkpoint: checkpoint.onboardingCheckpoint });

    if (!checkpoint.activeAuditId) {
      completeRestore(checkpoint.onboardingCheckpoint, null);
      return () => authSubscription?.subscription.unsubscribe();
    }

    setAuditId(checkpoint.activeAuditId);
    getAuditSession(checkpoint.activeAuditId)
      .then(async (session) => {
        if (flowGenerationRef.current !== requestGeneration) {
          logCareerVoiceEvent('flow_restore_stale_discarded', { requestGeneration, currentGeneration: flowGenerationRef.current });
          return;
        }

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
          const report = await getAuditReport(checkpoint.activeAuditId!);
          if (flowGenerationRef.current !== requestGeneration) return;
          setAuditResult({
            auditId: report.auditId || checkpoint.activeAuditId!,
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
          completeRestore('READINESS_REPORT', checkpoint.activeAuditId);
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
          completeRestore('CAREER_READINESS_AUDIT', checkpoint.activeAuditId);
        }
      })
      .catch((err) => {
        console.warn('Session restore error:', err);
        const nextUrl = clearCareerVoiceAuditId(localStorage, window.location.href);
        if (nextUrl) window.history.replaceState({}, '', nextUrl);
        logCareerVoiceEvent('flow_restore_audit_missing', {
          auditId: checkpoint.activeAuditId,
          error: err instanceof Error ? err.message : String(err),
        });
        completeRestore(checkpoint.onboardingCheckpoint, null);
      });
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
          phone: identity.phone,
        },
      });

      setAuditId(session.auditId);
      localStorage.setItem(ACTIVE_AUDIT_ID_KEY, session.auditId);
      localStorage.setItem(STUDENT_ID_KEY, identity.studentId);
      if (identity.phone) localStorage.setItem(PHONE_KEY, identity.phone);

      const url = new URL(window.location.href);
      url.searchParams.set('auditId', session.auditId);
      window.history.replaceState({}, '', url.toString());

      await handleSaveProfile(userRawIntent, confirmedRole.id);
      transitionToStep('CAREER_READINESS_AUDIT', 'audit_session_created', { nextAuditId: session.auditId });
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

    transitionToStep('PROCESSING', 'audit_evaluation_started');
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
      transitionToStep('READINESS_REPORT', 'audit_evaluation_completed');
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
    localStorage.removeItem(ACTIVE_AUDIT_ID_KEY);
    localStorage.removeItem(FLOW_CHECKPOINT_KEY);
    localStorage.removeItem(STUDENT_ID_KEY);
    localStorage.removeItem(PHONE_KEY);
    const url = new URL(window.location.href);
    url.searchParams.delete('auditId');
    window.history.replaceState({}, '', url.toString());

    transitionToStep('WELCOME', 'explicit_restart', { nextIdentity: null, nextAuditId: null, persist: false });
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
              onStart={() => transitionToStep('PHONE_OTP', 'welcome_start')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'PHONE_OTP' && (
            <PhoneOtpStep
              onVerified={(ident) => {
                setIdentity(ident);
                localStorage.setItem(STUDENT_ID_KEY, ident.studentId);
                localStorage.setItem(PHONE_KEY, ident.phone);
                if (ident.accessToken) localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, ident.accessToken);
                logCareerVoiceEvent('otp_identity_persisted', { studentId: ident.studentId, phone: ident.phone });
                transitionToStep('ASK_NAME', 'otp_next_step_committed', { nextIdentity: ident, nextAuditId: auditId });
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ASK_NAME' && (
            <AskNameStep
              onComplete={(fName) => {
                setFirstName(fName);
                transitionToStep('ASK_COLLEGE', 'name_completed');
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
                transitionToStep('ASK_DEPARTMENT', 'college_completed');
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
                transitionToStep('ASK_YEAR', 'department_completed');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'ASK_YEAR' && (
            <AskYearStep
              firstName={firstName}
              onComplete={(aYear) => {
                setAcademicYear(aYear);
                transitionToStep('CAREER_DISCOVERY', 'year_completed');
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'CAREER_DISCOVERY' && (
            <CareerDiscoveryStep
              studentId={identity?.studentId}
              phone={identity?.phone}
              firstName={firstName}
              departmentName={departmentName}
              careerStreamId={careerStreamId}
              academicYear={academicYear}
              onIntentProcessed={(intentData) => {
                setUserRawIntent(intentData.userRawIntent);
                setKnownSkills(intentData.knownSkills || []);
                setDiscoveryProfile(intentData.discoveryProfile || {});
                transitionToStep('ROLE_DISCOVERY', 'career_discovery_completed');
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
                transitionToStep('ROLE_EXPLANATION', 'role_selected_for_explanation');
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
                transitionToStep('LOAD_COMPETENCY_MODEL', 'target_role_confirmed');
              }}
              onExploreAnotherRole={() => transitionToStep('ROLE_DISCOVERY', 'explore_another_role')}
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
                transitionToStep('EVIDENCE_UPLOAD', 'interview_finished');
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
                if (auditResult) transitionToStep('READINESS_REPORT', 'processing_finished');
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
              onNext={() => transitionToStep('GAP_REPORT', 'readiness_report_next')}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'GAP_REPORT' && auditResult && targetRole && (
            <GapReportView
              gaps={auditResult.gaps}
              role={targetRole}
              onNext={() => transitionToStep('ROADMAP', 'gap_report_next')}
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
