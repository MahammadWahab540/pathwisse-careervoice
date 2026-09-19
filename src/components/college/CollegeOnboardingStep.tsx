import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, ArrowRight, Check, Search, Sparkles, User, Mail, Calendar, Users, Loader2, AlertCircle, ChevronDown, Plus } from 'lucide-react';
import type { CollegeContext, UserRole } from '../../domain/careerVoiceFlow';
import { COLLEGE_CONTEXT_KEY } from '../../domain/careerVoiceFlow';
import { saveWorkspace } from '../../api/auth';

interface CollegeOption {
  id: string;
  name: string;
}

interface CollegeOnboardingStepProps {
  initialCollegeId?: string;
  roleType?: UserRole;
  onComplete: (context: CollegeContext) => void;
  trackEvent?: (name: string, meta?: Record<string, unknown>) => void;
}

const DEFAULT_COLLEGES: CollegeOption[] = [
  { id: 'bits_pilani', name: 'BITS Pilani (Pilani, Goa & Hyderabad Campuses)' },
  { id: 'iit_madras', name: 'IIT Madras (Indian Institute of Technology)' },
  { id: 'nit_trichy', name: 'NIT Tiruchirappalli (National Institute of Technology)' },
  { id: 'vit_vellore', name: 'VIT Vellore (Vellore Institute of Technology)' },
  { id: 'rvce_bangalore', name: 'RV College of Engineering, Bengaluru' },
  { id: 'dtu_delhi', name: 'Delhi Technological University (DTU)' },
  { id: 'coep_pune', name: 'College of Engineering Pune (COEP)' },
  { id: 'psg_tech', name: 'PSG College of Technology, Coimbatore' },
  { id: 'jadavpur_univ', name: 'Jadavpur University, Kolkata' },
  { id: 'thapar_patiala', name: 'Thapar Institute of Engineering and Technology' },
];

export const CollegeOnboardingStep: React.FC<CollegeOnboardingStepProps> = ({
  initialCollegeId,
  roleType = 'placement_team',
  onComplete,
  trackEvent,
}) => {
  const [colleges, setColleges] = useState<CollegeOption[]>(DEFAULT_COLLEGES);

  // Restore existing context from localStorage if available
  const savedContext = (() => {
    try {
      const raw = localStorage.getItem(COLLEGE_CONTEXT_KEY);
      if (raw) return JSON.parse(raw) as Partial<CollegeContext>;
    } catch {}
    return null;
  })();

  const [selectedCollegeId, setSelectedCollegeId] = useState(
    savedContext?.collegeId || initialCollegeId || 'bits_pilani'
  );
  const [institutionQuery, setInstitutionQuery] = useState(
    savedContext?.collegeName || 'BITS Pilani (Pilani, Goa & Hyderabad Campuses)'
  );
  const [isCustomInstitution, setIsCustomInstitution] = useState(
    savedContext?.collegeId === 'custom_college'
  );
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [officerName, setOfficerName] = useState(savedContext?.officerName || '');
  const [officerEmail, setOfficerEmail] = useState(savedContext?.officerEmail || '');
  const [department, setDepartment] = useState(savedContext?.department || 'Training & Placement Cell');
  const [targetBatch, setTargetBatch] = useState(savedContext?.targetBatch || '2026');
  const [studentCount, setStudentCount] = useState<string>(
    savedContext?.studentCount ? String(savedContext.studentCount) : ''
  );

  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const comboboxRef = useRef<HTMLDivElement>(null);

  // Fetch live colleges from API
  useEffect(() => {
    fetch('/api/colleges')
      .then((res) => {
        const ct = res.headers?.get('content-type') || '';
        if (!res.ok || !ct.includes('application/json')) throw new Error('Non-JSON response');
        return res.json();
      })
      .then((data) => {
        if (Array.isArray(data?.colleges) && data.colleges.length > 0) {
          const list: CollegeOption[] = data.colleges.map((c: any) => ({
            id: c.id || c.slug,
            name: c.name,
          }));
          setColleges(list);
          // If we had a selected college ID, sync the display name
          if (selectedCollegeId && !isCustomInstitution) {
            const found = list.find((item) => item.id === selectedCollegeId);
            if (found) setInstitutionQuery(found.name);
          }
        }
      })
      .catch(() => {
        // Fallback to default list
      });
  }, [selectedCollegeId, isCustomInstitution]);

  // Click outside to close combobox dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredColleges = colleges.filter((c) =>
    c.name.toLowerCase().includes(institutionQuery.toLowerCase())
  );

  const handleSelectInstitution = (college: CollegeOption) => {
    setSelectedCollegeId(college.id);
    setInstitutionQuery(college.name);
    setIsCustomInstitution(false);
    setIsDropdownOpen(false);
    setFormError(null);
  };

  const handleAddManualInstitution = () => {
    setSelectedCollegeId('custom_college');
    setIsCustomInstitution(true);
    setIsDropdownOpen(false);
    setFormError(null);
  };

  const validateEmail = (val: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val.trim());
  };

  const handleEmailBlur = () => {
    if (officerEmail.trim() && !validateEmail(officerEmail)) {
      setEmailError('Please enter a valid official email address (e.g. name@college.edu.in)');
    } else {
      setEmailError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    const cleanCollegeName = institutionQuery.trim();
    if (!cleanCollegeName) {
      setFormError('Please select or enter your institution name.');
      return;
    }
    if (!officerName.trim()) {
      setFormError('Placement officer name is required.');
      return;
    }
    if (!officerEmail.trim()) {
      setFormError('Official work email is required.');
      return;
    }
    if (!validateEmail(officerEmail)) {
      setEmailError('Please enter a valid email address.');
      setFormError('Please provide a valid official email address.');
      return;
    }
    if (!department.trim()) {
      setFormError('Department or Placement Cell name is required.');
      return;
    }

    setIsSubmitting(true);

    const parsedStudentCount = studentCount ? parseInt(studentCount, 10) : undefined;

    const collegeContext: CollegeContext = {
      collegeId: isCustomInstitution ? 'custom_college' : selectedCollegeId,
      collegeName: cleanCollegeName,
      department: department.trim(),
      officerName: officerName.trim(),
      officerEmail: officerEmail.trim().toLowerCase(),
      targetBatch,
      studentCount: Number.isNaN(parsedStudentCount) ? undefined : parsedStudentCount,
      roleType: 'placement_team',
    };

    try {
      await saveWorkspace({
        ...collegeContext,
        roleType: 'placement_team',
      });
    } catch (err) {
      console.warn('[Workspace] Saved locally, server sync failed:', err);
    }

    // Persist locally for session recovery
    try {
      localStorage.setItem(COLLEGE_CONTEXT_KEY, JSON.stringify(collegeContext));
    } catch {}

    trackEvent?.('college_onboarding_completed', {
      collegeId: collegeContext.collegeId,
      roleType: collegeContext.roleType,
    });

    setIsSubmitting(false);
    onComplete(collegeContext);
  };

  return (
    <div className="w-full max-w-[860px] mx-auto text-left">
      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-xl border border-[#e2e8f0] shadow-xs p-6 sm:p-8 md:p-10"
      >
        {/* Header Block */}
        <div className="mb-6 sm:mb-8 pb-5 border-b border-[#e2e8f0]">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs font-semibold text-[#ea580c] mb-3">
            <Sparkles className="w-3.5 h-3.5 text-[#ea580c]" />
            <span>Step 2 of 2 · Workspace Setup</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0b111d]">
            Set up your placement workspace
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#64748b] leading-relaxed max-w-2xl">
            Configure your institutional parameters so CareerVoice can calibrate campaigns and track student participation.
          </p>
        </div>

        {/* Global Error Banner */}
        {formError && (
          <div className="mb-6 p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Row 1: Searchable Institution Combobox (Full Width) */}
          <div className="relative" ref={comboboxRef}>
            <label className="text-xs font-bold text-[#0b111d] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Institution / University *</span>
              </span>
              {isCustomInstitution && (
                <span className="text-[11px] font-semibold text-[#ea580c] lowercase">
                  (custom entry)
                </span>
              )}
            </label>

            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
              <input
                type="text"
                placeholder="Search college or university..."
                value={institutionQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setInstitutionQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (isCustomInstitution) {
                    setSelectedCollegeId('custom_college');
                  }
                }}
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#0b111d] placeholder:text-[#94a3b8] outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#0b111d] p-1 cursor-pointer"
                aria-label="Toggle institutions dropdown"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Combobox Dropdown */}
            <AnimatePresence>
              {isDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, transform: 'scale(0.98) translateY(-4px)' }}
                  animate={{ opacity: 1, transform: 'scale(1) translateY(0px)' }}
                  exit={{ opacity: 0, transform: 'scale(0.98) translateY(-4px)' }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  style={{ transformOrigin: 'top' }}
                  className="absolute z-30 left-0 right-0 mt-1.5 max-h-60 overflow-y-auto bg-white border border-[#e2e8f0] rounded-xl shadow-md p-1.5 divide-y divide-slate-100"
                >
                  <div className="space-y-0.5 pb-1">
                    {filteredColleges.length > 0 ? (
                      filteredColleges.map((c) => {
                        const isSelected = selectedCollegeId === c.id;
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => handleSelectInstitution(c)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-orange-50 text-[#ea580c] font-bold'
                                : 'hover:bg-[#f8fafc] text-[#0b111d]'
                            }`}
                          >
                            <span className="truncate pr-2">{c.name}</span>
                            {isSelected && <Check className="w-4 h-4 text-[#ea580c] shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="px-3 py-2 text-xs text-[#64748b] italic">
                        No matching institutions found in catalog.
                      </div>
                    )}
                  </div>

                  {/* Add Institution Manually */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleAddManualInstitution}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs font-semibold text-[#ea580c] hover:bg-orange-50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Add &ldquo;{institutionQuery || 'my institution'}&rdquo; manually</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Row 2: Placement Officer Name & Official Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="text-xs font-bold text-[#0b111d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Placement Officer Name *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Dr. R. Sharma"
                value={officerName}
                onChange={(e) => {
                  setOfficerName(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#0b111d] placeholder:text-[#94a3b8] outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0b111d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Official / Work Email *</span>
              </label>
              <input
                type="email"
                placeholder="e.g. placements@college.edu.in"
                value={officerEmail}
                onBlur={handleEmailBlur}
                onChange={(e) => {
                  setOfficerEmail(e.target.value);
                  if (emailError) setEmailError(null);
                  setFormError(null);
                }}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm font-medium text-[#0b111d] placeholder:text-[#94a3b8] outline-none transition-all ${
                  emailError
                    ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-[#e2e8f0] focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20'
                }`}
              />
              {emailError && (
                <p className="mt-1 text-xs text-red-600 font-medium">{emailError}</p>
              )}
            </div>
          </div>

          {/* Row 3: Department / Cell & Target Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
            <div>
              <label className="text-xs font-bold text-[#0b111d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Department / Placement Cell *</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Training & Placement Cell"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setFormError(null);
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#0b111d] placeholder:text-[#94a3b8] outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#0b111d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#ea580c]" />
                <span>Target Graduation Batch *</span>
              </label>
              <div className="relative">
                <select
                  value={targetBatch}
                  onChange={(e) => setTargetBatch(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#0b111d] outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer appearance-none"
                >
                  <option value="2026">2026 Passing Out Batch (Final Year)</option>
                  <option value="2027">2027 Passing Out Batch (Pre-Final Year)</option>
                  <option value="2025">2025 Passing Out Batch (Immediate Placement)</option>
                  <option value="2028">2028 Passing Out Batch (Sophomore)</option>
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94a3b8] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Row 4: Approximate Student Count (Optional) + Helper Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 items-start">
            <div>
              <label className="text-xs font-bold text-[#0b111d] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#64748b]" />
                <span>Approximate Student Count <span className="text-[#94a3b8] font-normal lowercase">(optional)</span></span>
              </label>
              <input
                type="number"
                min={1}
                max={50000}
                placeholder="e.g. 500"
                value={studentCount}
                onChange={(e) => setStudentCount(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-sm font-medium text-[#0b111d] placeholder:text-[#94a3b8] outline-none focus:border-[#ea580c] focus:ring-2 focus:ring-orange-500/20 transition-all"
              />
            </div>

            <div className="text-xs text-[#64748b] bg-[#f8fafc] border border-[#e2e8f0] rounded-lg p-3.5 leading-relaxed">
              <span className="font-semibold text-[#0b111d] block mb-0.5">Campaign Ready</span>
              CareerVoice will generate secure invitation links for your batch so you can view student and cohort CareerVoice results in real time.
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-5 border-t border-[#e2e8f0] flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-[#64748b] order-2 sm:order-1 text-center sm:text-left">
              You can modify these institutional settings anytime in your portal.
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto min-w-[220px] py-3 px-8 rounded-xl text-white font-bold text-sm flex items-center justify-center gap-2 bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed order-1 sm:order-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving workspace...</span>
                </>
              ) : (
                <>
                  <span>Continue to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

