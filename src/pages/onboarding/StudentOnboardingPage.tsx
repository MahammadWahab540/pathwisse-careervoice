import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { AskNameStep } from '../../components/audit/AskNameStep';
import { AskCollegeStep } from '../../components/audit/AskCollegeStep';
import { AskDepartmentStep } from '../../components/audit/AskDepartmentStep';
import { AskYearStep } from '../../components/audit/AskYearStep';
import { useAuth } from '../../context/AuthContext';
import { syncProfile } from '../../api/profile';

type OnboardingStep = 'name' | 'college' | 'department' | 'year';

const STEP_ORDER: Record<OnboardingStep, number> = {
  name: 0,
  college: 1,
  department: 2,
  year: 3,
};

export function StudentOnboardingPage() {
  const navigate = useNavigate();
  const { identity } = useAuth();
  const shouldReduceMotion = useReducedMotion();

  const [step, setStep] = useState<OnboardingStep>('name');
  const [direction, setDirection] = useState<number>(1);
  const [firstName, setFirstName] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [departmentName, setDepartmentName] = useState('');

  const trackEvent = (name: string, meta?: Record<string, unknown>) => {
    console.debug('[StudentOnboarding]', name, meta);
  };

  const changeStep = (nextStep: OnboardingStep) => {
    setDirection(STEP_ORDER[nextStep] >= STEP_ORDER[step] ? 1 : -1);
    setStep(nextStep);
  };

  const handleNameComplete = (name: string) => {
    setFirstName(name);
    changeStep('college');
  };

  const handleCollegeComplete = (name: string, _id: string) => {
    setCollegeName(name);
    changeStep('department');
  };

  const handleDepartmentComplete = (streamId: string, deptName: string) => {
    setDepartmentId(streamId);
    setDepartmentName(deptName);
    changeStep('year');
  };

  const handleYearComplete = async (academicYear: string) => {
    try {
      localStorage.setItem('careervoice_student_profile', JSON.stringify({
        firstName,
        collegeName,
        departmentName,
        academicYear,
        branch: departmentName,
        careerIntent: departmentId,
        gradYear: academicYear,
      }));
    } catch {
      // quota or private mode
    }

    if (identity?.studentId) {
      try {
        await syncProfile({
          studentId: identity.studentId,
          firstName,
          collegeName,
          branch: departmentName,
          careerIntent: departmentId,
          gradYear: academicYear,
        });
      } catch {
        // Continue even if sync fails — do not block navigation
      }
    }
    navigate('/student', { replace: true });
  };

  const offset = shouldReduceMotion ? 0 : 16;
  const variants = {
    enter: (dir: number) => ({
      opacity: 0,
      transform: `translateX(${dir * offset}px)`,
    }),
    center: {
      opacity: 1,
      transform: 'translateX(0px)',
    },
    exit: (dir: number) => ({
      opacity: 0,
      transform: `translateX(${dir * -offset}px)`,
    }),
  };

  const transition = {
    duration: 0.2,
    ease: [0.23, 1, 0.32, 1], // --ease-out strong curve
  };

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[#f8fafc] text-[#0b111d]">
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={step}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className="min-h-screen"
        >
          {step === 'name' && (
            <AskNameStep onComplete={handleNameComplete} trackEvent={trackEvent} />
          )}
          {step === 'college' && (
            <AskCollegeStep
              firstName={firstName}
              onComplete={handleCollegeComplete}
              trackEvent={trackEvent}
              onBack={() => changeStep('name')}
            />
          )}
          {step === 'department' && (
            <AskDepartmentStep
              firstName={firstName}
              onComplete={handleDepartmentComplete}
              trackEvent={trackEvent}
              onBack={() => changeStep('college')}
            />
          )}
          {step === 'year' && (
            <AskYearStep
              firstName={firstName}
              onComplete={handleYearComplete}
              trackEvent={trackEvent}
              onBack={() => changeStep('department')}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
