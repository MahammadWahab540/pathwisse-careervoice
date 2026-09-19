import React, { useState } from 'react';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import {
  Building2,
  Mail,
  GraduationCap,
  Calendar,
  Save,
  Check,
  ShieldCheck,
  Bell,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function SettingsPage() {
  const { collegeContext } = useAuth();
  const [saved, setSaved] = useState(false);
  const [targetBatch, setTargetBatch] = useState(collegeContext?.targetBatch ?? '2026');
  const [department, setDepartment] = useState(collegeContext?.department ?? 'Department of Training & Placement');
  const [officerEmail, setOfficerEmail] = useState(collegeContext?.officerEmail ?? 'placements@institution.edu');
  const [officerName, setOfficerName] = useState('Chief Placement Officer');
  const [digestFrequency, setDigestFrequency] = useState('daily');
  const [allowRetakes, setAllowRetakes] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <PlacementLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#0b111d]">
                Portal Settings &amp; Configuration
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                Workspace Admin
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Manage institution credentials, officer notification channels, and diagnostic assessment parameters.
            </p>
          </div>

          <button
            onClick={handleSave}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer self-start sm:self-auto ${
              saved
                ? 'bg-emerald-600 text-white'
                : 'bg-[#ea580c] hover:bg-[#c2410c] text-white'
            }`}
          >
            {saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved Changes</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>

        {/* Section 1: Institution Profile */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e2e8f0]">
            <div className="w-8 h-8 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ea580c]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b111d]">Institution Profile</h2>
              <p className="text-xs text-slate-500">Official campus credentials visible on student assessments</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Institution Name
              </label>
              <input
                type="text"
                disabled
                value={collegeContext?.collegeName ?? 'Partner College of Engineering & Technology'}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-[#e2e8f0] rounded-lg text-sm text-slate-700 cursor-not-allowed font-medium"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Managed by CareerVoice institutional license</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Passing Out Batch
              </label>
              <input
                type="text"
                value={targetBatch}
                onChange={(e) => setTargetBatch(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] font-mono outline-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Placement Cell / Department
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Accreditation &amp; Affiliation
              </label>
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs font-semibold text-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>NAAC A++ Accredited &amp; NIRF Aligned</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Officer Contact & Communication Channels */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e2e8f0]">
            <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b111d]">Officer Contact &amp; Notifications</h2>
              <p className="text-xs text-slate-500">Routing address for student diagnostic reports and activity alerts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Head of Training &amp; Placement
              </label>
              <input
                type="text"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Placement Email Address
              </label>
              <input
                type="email"
                value={officerEmail}
                onChange={(e) => setOfficerEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none shadow-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Diagnostic Summary Frequency
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: 'daily', label: 'Daily Digest', sub: 'Every evening at 6 PM' },
                  { id: 'weekly', label: 'Weekly Summary', sub: 'Every Monday morning' },
                  { id: 'immediate', label: 'Real-time Alerts', sub: 'On high-risk students' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setDigestFrequency(f.id)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer shadow-xs ${
                      digestFrequency === f.id
                        ? 'bg-orange-50/50 border-[#ea580c] text-orange-900 ring-1 ring-[#ea580c]'
                        : 'bg-white border-[#e2e8f0] text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <p className="text-xs font-bold">{f.label}</p>
                    <p className="text-[11px] text-slate-500">{f.sub}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Diagnostic Assessment Guardrails */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-[#e2e8f0]">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#0b111d]">CareerVoice Diagnostic Guardrails</h2>
              <p className="text-xs text-slate-500">Control student assessment parameters and retake allowances</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-lg">
              <div>
                <p className="text-xs font-bold text-[#0b111d]">Allow Assessment Retakes</p>
                <p className="text-[11px] text-slate-500">Students may retake the voice interview after completing gap recommendations</p>
              </div>
              <button
                type="button"
                onClick={() => setAllowRetakes(!allowRetakes)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                  allowRetakes ? 'bg-[#ea580c]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowRetakes ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </PlacementLayout>
  );
}
