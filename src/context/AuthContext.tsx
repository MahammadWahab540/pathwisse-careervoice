import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { UserIdentity } from '../types';
import {
  type UserRole,
  type CollegeContext,
  FLOW_CHECKPOINT_KEY,
  STUDENT_ID_KEY,
  PHONE_KEY,
  AUTH_ACCESS_TOKEN_KEY,
  ACTIVE_AUDIT_ID_KEY,
  USER_ROLE_KEY,
  COLLEGE_CONTEXT_KEY,
} from '../domain/careerVoiceFlow';
import { logoutUser } from '../api/auth';

export interface AuthState {
  identity: UserIdentity | null;
  userRole: UserRole | null;
  collegeContext: CollegeContext | null;
  isBootstrapping: boolean;
  setIdentity: (identity: UserIdentity | null) => void;
  setUserRole: (role: UserRole | null) => void;
  setCollegeContext: (ctx: CollegeContext | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentityState] = useState<UserIdentity | null>(null);
  const [userRole, setUserRoleState] = useState<UserRole | null>(null);
  const [collegeContext, setCollegeContextState] = useState<CollegeContext | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    try {
      const raw = localStorage.getItem(FLOW_CHECKPOINT_KEY);
      if (raw) {
        const checkpoint = JSON.parse(raw);
        if (checkpoint?.identity?.studentId) setIdentityState(checkpoint.identity);
        if (checkpoint?.role) setUserRoleState(checkpoint.role);
        if (checkpoint?.collegeContext) setCollegeContextState(checkpoint.collegeContext);
      } else {
        const studentId = localStorage.getItem(STUDENT_ID_KEY);
        const phone = localStorage.getItem(PHONE_KEY);
        const role = localStorage.getItem(USER_ROLE_KEY) as UserRole | null;
        const accessToken = localStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
        const rawCtx = localStorage.getItem(COLLEGE_CONTEXT_KEY);
        if (studentId) {
          setIdentityState({ studentId, phone: phone || '', countryCode: '+91', isOtpVerified: true, accessToken: accessToken || undefined, anonymousId: crypto.randomUUID(), sessionId: crypto.randomUUID() });
        }
        if (role) setUserRoleState(role);
        if (rawCtx) { try { setCollegeContextState(JSON.parse(rawCtx)); } catch { /* ignore */ } }
      }
    } catch { /* ignore */ } finally { setIsBootstrapping(false); }
  }, []);

  const setIdentity = useCallback((id: UserIdentity | null) => {
    setIdentityState(id);
    if (id?.studentId) {
      localStorage.setItem(STUDENT_ID_KEY, id.studentId);
      if (id.phone) localStorage.setItem(PHONE_KEY, id.phone);
      if (id.accessToken) localStorage.setItem(AUTH_ACCESS_TOKEN_KEY, id.accessToken);
    }
  }, []);

  const setUserRole = useCallback((role: UserRole | null) => {
    setUserRoleState(role);
    if (role) localStorage.setItem(USER_ROLE_KEY, role); else localStorage.removeItem(USER_ROLE_KEY);
  }, []);

  const setCollegeContext = useCallback((ctx: CollegeContext | null) => {
    setCollegeContextState(ctx);
    if (ctx) localStorage.setItem(COLLEGE_CONTEXT_KEY, JSON.stringify(ctx)); else localStorage.removeItem(COLLEGE_CONTEXT_KEY);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    [FLOW_CHECKPOINT_KEY, STUDENT_ID_KEY, PHONE_KEY, AUTH_ACCESS_TOKEN_KEY, ACTIVE_AUDIT_ID_KEY, USER_ROLE_KEY, COLLEGE_CONTEXT_KEY, 'careervoice_supabase_access_token', 'careervoice_supabase_refresh_token'].forEach((k) => localStorage.removeItem(k));
    setIdentityState(null); setUserRoleState(null); setCollegeContextState(null);
  }, []);

  return (
    <AuthContext.Provider value={{ identity, userRole, collegeContext, isBootstrapping, setIdentity, setUserRole, setCollegeContext, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
