import React, { useState } from 'react';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import {
  Send,
  CheckCircle2,
  MessageSquare,
  Mail,
  Users,
  Clock,
  Check,
  AlertCircle,
  Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

type AudienceType = 'invited' | 'started' | 'all';
type ChannelType = 'whatsapp' | 'email';

export function MessagesPage() {
  const { collegeContext } = useAuth();
  const [audience, setAudience] = useState<AudienceType>('invited');
  const [channel, setChannel] = useState<ChannelType>('whatsapp');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState(
    'Hi {student_name}! Your CareerVoice diagnostic assessment is pending. Completing this takes 10 minutes and helps the placement cell align recruiters with your verified career direction. Click your personalized link to complete it today: {assessment_url}'
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => setSent(false), 4000);
    }, 1000);
  };

  return (
    <PlacementLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0b111d]">
              Student Communication &amp; Reminders
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
              Nudge Broadcast
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Dispatch automated WhatsApp and Email nudges to students who haven&apos;t started or completed their assessment.
          </p>
        </div>

        {/* Dispatch Form Card */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* Target Campaign */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Broadcast Campaign
            </label>
            <select className="w-full px-3.5 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none shadow-xs">
              <option>
                All Active Campaigns — {collegeContext?.targetBatch ?? '2026'} Passing Out Cohort ({collegeContext?.collegeName ?? 'Campus-wide'})
              </option>
            </select>
          </div>

          {/* Delivery Channel */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Dispatch Channel
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`p-3.5 rounded-lg border text-left flex items-center gap-3 transition-all cursor-pointer shadow-xs ${
                  channel === 'whatsapp'
                    ? 'bg-emerald-50/60 border-emerald-500 text-emerald-900 ring-1 ring-emerald-500'
                    : 'bg-white border-[#e2e8f0] text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-emerald-100 flex items-center justify-center text-emerald-700 flex-shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">WhatsApp Direct</p>
                  <p className="text-[11px] text-slate-500">98% open rate in 5 mins</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`p-3.5 rounded-lg border text-left flex items-center gap-3 transition-all cursor-pointer shadow-xs ${
                  channel === 'email'
                    ? 'bg-orange-50/60 border-orange-500 text-orange-900 ring-1 ring-orange-500'
                    : 'bg-white border-[#e2e8f0] text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="w-8 h-8 rounded-md bg-orange-100 flex items-center justify-center text-orange-700 flex-shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Institutional Email</p>
                  <p className="text-[11px] text-slate-500">Formal assessment dispatch</p>
                </div>
              </button>
            </div>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Select Audience Segment
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'invited' as AudienceType,
                  title: 'Invited (Not Started)',
                  sub: 'High priority nudge',
                  count: '18 students',
                },
                {
                  id: 'started' as AudienceType,
                  title: 'In Progress (Incomplete)',
                  sub: 'Completion reminder',
                  count: '9 students',
                },
                {
                  id: 'all' as AudienceType,
                  title: 'Entire Active Cohort',
                  sub: 'General announcement',
                  count: 'Campus-wide',
                },
              ].map((item) => (
                <div
                  key={item.id}
                  onClick={() => setAudience(item.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all shadow-xs ${
                    audience === item.id
                      ? 'border-[#ea580c] bg-orange-50/40 ring-1 ring-[#ea580c]'
                      : 'border-[#e2e8f0] bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#0b111d]">{item.title}</span>
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Message Template */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Message Content &amp; Merge Tags
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                Tags: {'{student_name}'}, {'{assessment_url}'}
              </span>
            </div>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3.5 bg-white border border-[#e2e8f0] focus:border-[#ea580c] focus:ring-1 focus:ring-[#ea580c] rounded-lg text-sm text-[#0b111d] outline-none transition-colors resize-none shadow-xs"
            />
          </div>

          {/* Success Banner */}
          {sent && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-3 text-xs text-emerald-800 shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <div>
                <strong className="block font-bold">Broadcast nudge dispatched successfully!</strong>
                <span>Nudge notifications are being queued and delivered to targeted students.</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
              Directly throttled to prevent spam complaints
            </span>
            <button
              onClick={handleSend}
              disabled={sending}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
            >
              {sending ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  <span>Dispatching…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Broadcast Nudge</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Recent Broadcast History */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-[#0b111d]">Recent Broadcast History</h2>
          <div className="divide-y divide-[#e2e8f0] text-xs">
            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  WA
                </div>
                <div>
                  <p className="font-semibold text-slate-800">Final Year Diagnostic Reminder #1</p>
                  <p className="text-slate-500 text-[11px]">Sent to 32 students · Delivered 100%</p>
                </div>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">Yesterday, 3:45 PM</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                  EM
                </div>
                <div>
                  <p className="font-semibold text-slate-800">CareerVoice Portal Kickoff Invitation</p>
                  <p className="text-slate-500 text-[11px]">Sent to 120 students · Delivered 99.2%</p>
                </div>
              </div>
              <span className="text-slate-500 font-mono text-[11px]">3 days ago</span>
            </div>
          </div>
        </div>
      </div>
    </PlacementLayout>
  );
}
