import React, { useState, useCallback } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './lib/firebase';

import { LandingView } from './components/audit/LandingView';
import { PhoneOtpStep } from './components/audit/PhoneOtpStep';
import { AskNameStep } from './components/audit/AskNameStep';
import { AskCollegeStep } from './components/audit/AskCollegeStep';
import { AskDepartmentStep } from './components/audit/AskDepartmentStep';
import { AskYearStep } from './components/audit/AskYearStep';
import { CareerIntentStep } from './components/audit/CareerIntentStep';
import { RoleDiscoveryStep } from './components/audit/RoleDiscoveryStep';
import { RoleExplanationStep } from './components/audit/RoleExplanationStep';
import { AdaptiveInterviewStep } from './components/audit/AdaptiveInterviewStep';
import { EvidenceUploadStep } from './components/audit/EvidenceUploadStep';
import { ProcessingSequenceStep } from './components/audit/ProcessingSequenceStep';
import { ReadinessReportView } from './components/audit/ReadinessReportView';
import { GapReportView } from './components/audit/GapReportView';
import { RoadmapView } from './components/audit/RoadmapView';
import { ShareCardModal } from './components/audit/ShareCardModal';
import { UpgradeModal } from './components/audit/UpgradeModal';

import { CareerRole, CONSUMER_CAREER_ROLES } from './data/careerTaxonomy';
import { PATHWISSE_ROLES, generateDefaultRoadmap } from './data/knowledgeGraph';
import {
  UserIdentity,
  StudentContext,
  CareerRoleTarget,
  AuditMessage,
  SkillEvidence,
  EvidenceUploads,
  CareerAuditResult,
} from './types';
import { RotateCcw } from 'lucide-react';

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

  // Modals
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

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

      // Persist event to Firestore
      try {
        const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setDoc(doc(db, 'analyticsEvents', eventId), {
          id: eventId,
          eventName: payload.eventName,
          anonymousId: payload.anonymousId,
          sessionId: payload.sessionId,
          auditId: payload.auditId,
          screenName: payload.screenName,
          careerRole: payload.careerRole || '',
          collegeId: payload.collegeId || '',
          campaignId: payload.campaignId || '',
          referralCode: payload.referralCode || '',
          timestamp: new Date().toISOString(),
        }).catch((err) => {
          console.warn('Analytics event Firestore sync notice:', err?.message || err);
        });
      } catch (err) {
        console.warn('Firestore analytics event error:', err);
      }
    },
    [identity, currentStep, targetRole, selectedRoleForExploration, collegeId]
  );

  // Handle Evaluation & Audit Score Generation
  const handleGenerateResults = async () => {
    setCurrentStep('PROCESSING');

    const studentCtx: StudentContext = {
      degree: 'B.Tech / B.E.',
      year: academicYear,
      collegeName,
      branch: departmentName,
    };

    try {
      const res = await fetch('/api/qalam/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentContext: studentCtx,
          targetRole: targetRole.title,
          conversationHistory: interviewMessages,
          communicationSample,
          evidenceData: evidence,
        }),
      });

      const data = await res.json();

      const fullResult: CareerAuditResult = {
        overallScore: data.overallScore || 45,
        dimensionScores: data.dimensionScores || {
          careerClarity: 72,
          technicalReadiness: 44,
          projectReadiness: 32,
          communication: 60,
          placementReadiness: 40,
          executionReadiness: 55,
        },
        diagnosisSummary:
          data.diagnosisSummary ||
          `You demonstrate a strong baseline in engineering fundamentals for ${targetRole.title}. Your main growth area is proving practical implementation through live deployed projects.`,
        gaps: data.gaps || [
          {
            id: 'gap_1',
            title: 'No Deployed Production Endpoints',
            severity: 'RED',
            description: 'Lacks a live accessible endpoint or web API showing end-to-end deployment.',
            recommendedAction: 'Deploy your top capstone project to a cloud container runtime.',
          },
          {
            id: 'gap_2',
            title: 'Applied Math & Analytical Foundations',
            severity: 'RED',
            description: 'Requires higher mathematical and algorithmic rigor.',
            recommendedAction: 'Complete Pathwisse Module 1 on Applied Foundations.',
          },
          {
            id: 'gap_3',
            title: 'GitHub Portfolio Architecture',
            severity: 'ORANGE',
            description: 'Repositories need clean documentation, tests, and architecture diagrams.',
            recommendedAction: 'Restructure top 2 repositories according to Pathwisse specs.',
          },
        ],
        roadmap: generateDefaultRoadmap(targetRole.id, targetRole.title),
        recommendedPathwissePlan: {
          planName: 'Pathwisse Pro',
          highlight: 'Fast-track your gap resolution in 6 weeks with live mentor code reviews.',
          features: ['6-Week Course Modules', '1-on-1 Mentor Code Reviews', 'Guaranteed Placement Drives'],
        },
      };

      setAuditResult(fullResult);

      // Save Audit Session to Firestore
      try {
        const sessId = identity?.sessionId || `sess_${Date.now()}`;
        const nowStr = new Date().toISOString();
        setDoc(doc(db, 'auditSessions', sessId), {
          id: sessId,
          anonymousId: identity?.anonymousId || 'anon_guest',
          sessionId: sessId,
          targetRole: targetRole.title,
          overallScore: fullResult.overallScore,
          diagnosisSummary: fullResult.diagnosisSummary.substring(0, 1990),
          createdAt: nowStr,
          updatedAt: nowStr,
        }).catch((err) => {
          console.warn('Audit session Firestore sync notice:', err?.message || err);
        });
      } catch (err) {
        console.warn('Audit session Firestore save error:', err);
      }
    } catch (err) {
      console.error('Failed to generate results:', err);
      // Fallback result
      setAuditResult({
        overallScore: 45,
        dimensionScores: {
          careerClarity: 72,
          technicalReadiness: 44,
          projectReadiness: 32,
          communication: 60,
          placementReadiness: 40,
          executionReadiness: 55,
        },
        diagnosisSummary: `You have clear interest in ${targetRole.title}. Work on building and deploying live portfolio projects to boost placement readiness.`,
        gaps: [
          {
            id: 'gap_1',
            title: 'Missing Live Deployment Links',
            severity: 'RED',
            description: 'Recruiters require live working URLs on resumes.',
            recommendedAction: 'Deploy capstone project.',
          },
        ],
        roadmap: generateDefaultRoadmap(targetRole.id, targetRole.title),
        recommendedPathwissePlan: {
          planName: 'Pathwisse Pro',
          highlight: 'Fast-track your gap resolution in 6 weeks.',
          features: ['6-Week Modules', 'Mentor Code Reviews'],
        },
      });
    }
  };

  const handleRestartAudit = () => {
    setCurrentStep('WELCOME');
    setIdentity(null);
    setFirstName('');
    setInterviewMessages([]);
    setAuditResult(null);
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

        <button
          onClick={handleRestartAudit}
          className="p-2 rounded-full bg-white border border-[#e1e7ef] text-[#344256] hover:text-[#0b111e] hover:bg-[#f8fafc] transition shadow-xs"
          title="Restart Audit"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
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

                try {
                  const sanitizedPhone = ident.phone ? ident.phone.replace(/\D/g, '') : '';
                  const uId = sanitizedPhone ? `usr_${sanitizedPhone}` : `anon_${ident.anonymousId}`;
                  const nowStr = new Date().toISOString();
                  setDoc(doc(db, 'users', uId), {
                    id: uId,
                    phone: ident.phone || '',
                    countryCode: ident.countryCode || '+91',
                    isOtpVerified: ident.isOtpVerified || false,
                    anonymousId: ident.anonymousId,
                    sessionId: ident.sessionId,
                    referralCode: ident.referralCode || '',
                    campaignId: ident.campaignId || '',
                    collegeId: ident.collegeId || '',
                    createdAt: nowStr,
                    updatedAt: nowStr,
                  }).catch((err) => {
                    console.warn('User profile Firestore sync notice:', err?.message || err);
                  });
                } catch (err) {
                  console.warn('User profile save error:', err);
                }
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
                setCurrentStep('CAREER_READINESS_AUDIT');
              }}
              onExploreAnotherRole={() => setCurrentStep('ROLE_DISCOVERY')}
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
                setEvidence(ev);
                handleGenerateResults();
              }}
              trackEvent={trackEvent}
            />
          )}

          {currentStep === 'PROCESSING' && (
            <ProcessingSequenceStep
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
              trackEvent={trackEvent}
            />
          )}
        </div>
      </main>

      {/* Share & Upgrade Modals */}
      {auditResult && (
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
    </div>
  );
}

export default App;
