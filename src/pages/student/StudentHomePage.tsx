import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { StudentLayout } from '../../layouts/StudentLayout';
import { StudentDashboardView } from '../../components/student/StudentDashboardView';
import { useAuth } from '../../context/AuthContext';

const STUDENT_PROFILE_KEY = 'careervoice_student_profile';
const AUDIT_RESULT_KEY = 'careervoice_audit_result';
const TARGET_ROLE_KEY = 'careervoice_target_role';
const ACTIVE_AUDIT_ID_KEY = 'careervoice_active_audit_id';

function getProfileData() {
  try {
    const raw = localStorage.getItem(STUDENT_PROFILE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getAuditResult() {
  try {
    const raw = localStorage.getItem(AUDIT_RESULT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getTargetRole() {
  try {
    const raw = localStorage.getItem(TARGET_ROLE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function StudentHomePage() {
  const navigate = useNavigate();
  const { identity, logout } = useAuth();

  const profile = getProfileData();
  const auditResult = getAuditResult();
  const targetRole = getTargetRole();
  const inProgressAuditId = localStorage.getItem(ACTIVE_AUDIT_ID_KEY) || null;

  const handleLogout = useCallback(async () => {
    await logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const handleStartNewAudit = useCallback(() => {
    localStorage.removeItem(ACTIVE_AUDIT_ID_KEY);
    localStorage.removeItem(AUDIT_RESULT_KEY);
    navigate('/student/assessment?mode=new');
  }, [navigate]);

  const handleResumeAudit = useCallback(() => {
    navigate('/student/assessment?mode=resume');
  }, [navigate]);

  const handleViewReadinessReport = useCallback(() => {
    navigate('/student/assessment?mode=report');
  }, [navigate]);

  const handleViewGapReport = useCallback(() => {
    navigate('/student/assessment?mode=report');
  }, [navigate]);

  const handleViewRoadmap = useCallback(() => {
    navigate('/student/assessment?mode=report');
  }, [navigate]);

  const trackEvent = (name: string, meta?: Record<string, unknown>) => {
    console.debug('[StudentHome]', name, meta);
  };

  return (
    <StudentLayout
      studentName={profile.firstName || identity?.studentId?.slice(0, 8)}
      onLogout={handleLogout}
    >
      <StudentDashboardView
        identity={identity}
        firstName={profile.firstName || ''}
        collegeName={profile.collegeName || ''}
        departmentName={profile.departmentName || profile.branch || ''}
        academicYear={profile.academicYear || profile.gradYear || ''}
        auditResult={auditResult}
        targetRole={targetRole}
        inProgressAuditId={inProgressAuditId}
        onStartNewAudit={handleStartNewAudit}
        onResumeAudit={handleResumeAudit}
        onViewReadinessReport={handleViewReadinessReport}
        onViewGapReport={handleViewGapReport}
        onViewRoadmap={handleViewRoadmap}
        onLogout={handleLogout}
        trackEvent={trackEvent}
      />
    </StudentLayout>
  );
}
