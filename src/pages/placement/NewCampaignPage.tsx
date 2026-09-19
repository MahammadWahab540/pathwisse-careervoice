import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Megaphone,
  Copy,
  Check,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Building2,
  GraduationCap,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface CampaignResult {
  id: string;
  name: string;
  inviteUrl: string;
}

export function NewCampaignPage() {
  const navigate = useNavigate();
  const { collegeContext } = useAuth();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [department, setDepartment] = useState('All Departments');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CampaignResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          institution: collegeContext?.collegeName || 'CareerVoice Partner Institution',
          collegeName: collegeContext?.collegeName,
          collegeId: collegeContext?.collegeId,
          department: department || 'All Departments',
          batch: collegeContext?.targetBatch || '2026',
          targetBatch: collegeContext?.targetBatch,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.message || body?.error || `Server returned ${res.status}`);
      }
      const data = await res.json();
      setResult({
        id: data.campaignId ?? data.id,
        name: data.name ?? name,
        inviteUrl: data.inviteUrl ?? `${window.location.origin}/invite/${data.token ?? data.campaignId}`,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard denied
    }
  };

  return (
    <PlacementLayout>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div>
          <button
            onClick={() => navigate('/placement/campaigns')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-3"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Campaigns
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-[#0b111d]">
            Create Placement Campaign
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Generate an authenticated CareerVoice invite link to distribute to your target student batch.
          </p>
        </div>

        {/* Institution Context Pill */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium text-slate-800">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <span>{collegeContext?.collegeName ?? 'Partner Institution'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
            <span>{collegeContext?.department ?? 'Training & Placement'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono">{collegeContext?.targetBatch ?? '2026'} Passing Out</span>
          </div>
        </div>

        {/* Form or Success State */}
        <AnimatePresence mode="wait">
          {result ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-xs space-y-6"
            >
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0b111d]">Campaign Created Successfully</h2>
                  <p className="text-sm text-slate-600 mt-0.5">
                    Your invite link for <span className="font-semibold text-slate-900">{result.name}</span> is ready to share with students.
                  </p>
                </div>
              </div>

              {/* Monospace Link Display */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Student Invite Link
                </label>
                <div className="font-mono text-sm text-[#0b111d] break-all select-all font-medium">
                  {result.inviteUrl}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <button
                  onClick={handleCopy}
                  className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold shadow-xs transition-all cursor-pointer ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#ea580c] hover:bg-[#c2410c] text-white'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Invite Link</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => navigate('/placement/campaigns')}
                  className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#e2e8f0] shadow-xs transition-colors"
                >
                  View All Campaigns
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              onSubmit={handleSubmit}
              className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-xs space-y-5"
            >
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Campaign Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder="e.g. 2026 Batch — Core & Tech Placement Diagnostic Drive"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none placeholder:text-slate-400 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Department / Target Group
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none transition-colors shadow-xs"
                >
                  <option value="All Departments">All Departments (College-wide)</option>
                  <option value="Computer Science & Engineering">Computer Science &amp; Engineering</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Electronics & Communication">Electronics &amp; Communication</option>
                  <option value="Mechanical Engineering">Mechanical Engineering</option>
                  <option value="Civil Engineering">Civil Engineering</option>
                  <option value="Electrical & Electronics">Electrical &amp; Electronics</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Description / Instructions (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add guidance or context for students taking this assessment…"
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none placeholder:text-slate-400 resize-none transition-colors shadow-xs"
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700 font-medium">
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#ea580c] hover:bg-[#c2410c] disabled:opacity-60 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Megaphone className="w-4 h-4" />
                  {submitting ? 'Creating Campaign…' : 'Create Campaign'}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/placement/campaigns')}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </PlacementLayout>
  );
}
