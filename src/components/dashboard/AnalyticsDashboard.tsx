import React, { useEffect, useState } from 'react';
import { Activity, Users, Phone, Mic, ShieldCheck, CheckCircle2, TrendingUp, RefreshCw, BarChart2, Layers } from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/analytics/stats');
      const data = await res.json();
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error('Analytics Fetch Error:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !stats) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs">
        Loading product insights...
      </div>
    );
  }

  const funnel = stats.funnel || {};
  const voiceVsTap = stats.voiceVsTap || { voice: 0, tap: 0 };

  const funnelSteps = [
    { label: '1. Landing Viewed', count: funnel.landingViewed || 1, icon: <Users className="w-4 h-4 text-cyan-400" /> },
    { label: '2. Audit Started', count: funnel.auditStarted || 1, icon: <Activity className="w-4 h-4 text-sky-400" /> },
    { label: '3. Phone Submitted', count: funnel.phoneSubmitted || 1, icon: <Phone className="w-4 h-4 text-indigo-400" /> },
    { label: '4. OTP Verified', count: funnel.otpVerified || 1, icon: <ShieldCheck className="w-4 h-4 text-emerald-400" /> },
    { label: '5. Voice Session Started', count: funnel.voiceSessionStarted || 1, icon: <Mic className="w-4 h-4 text-pink-400" /> },
    { label: '6. Audit Completed', count: funnel.auditCompleted || 1, icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
    { label: '7. Pro Upgrade Clicked', count: funnel.upgradeClicked || 0, icon: <TrendingUp className="w-4 h-4 text-amber-400" /> },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 text-left space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#e1e7ef] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e1e7ef] border border-[#1f3861]/20 text-[11px] font-bold text-[#1f3861] mb-1">
            <BarChart2 className="w-3.5 h-3.5 text-[#1f3861]" />
            Product usage overview
          </div>
          <h1 className="text-xl font-bold text-[#0b111e]">Pathwisse Product Analytics</h1>
        </div>

        <button
          onClick={fetchStats}
          className="p-2 px-3 rounded-full bg-[#f8fafc] border border-[#e1e7ef] hover:border-[#1f3861] text-[#344256] hover:text-[#0b111e] transition flex items-center gap-1 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#1f3861]" />
          Refresh
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#e1e7ef] shadow-xs">
          <span className="text-[10px] text-[#344256] uppercase font-bold block mb-1">Total Events</span>
          <span className="text-2xl font-mono font-bold text-[#1f3861]">{stats.totalEvents}</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e1e7ef] shadow-xs">
          <span className="text-[10px] text-[#344256] uppercase font-bold block mb-1">Active Sessions</span>
          <span className="text-2xl font-mono font-bold text-[#1f3861]">{stats.totalSessions}</span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e1e7ef] shadow-xs">
          <span className="text-[10px] text-[#344256] uppercase font-bold block mb-1">Voice vs Text Ratio</span>
          <span className="text-xl font-mono font-bold text-emerald-700">
            {voiceVsTap.voice} 🎙 / {voiceVsTap.tap} ⌨
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white border border-[#e1e7ef] shadow-xs">
          <span className="text-[10px] text-[#344256] uppercase font-bold block mb-1">Funnel Completion</span>
          <span className="text-2xl font-mono font-bold text-[#1f3861]">
            {Math.round(((funnel.auditCompleted || 0) / (funnel.landingViewed || 1)) * 100)}%
          </span>
        </div>
      </div>

      {/* Funnel Visualizer */}
      <div className="p-5 rounded-2xl bg-white border border-[#e1e7ef] shadow-sm space-y-4">
        <h3 className="text-xs font-bold text-[#1f3861] uppercase tracking-wider flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-[#1f3861]" />
          Career Audit Conversion Funnel
        </h3>

        <div className="space-y-2">
          {funnelSteps.map((step) => {
            const pct = Math.round((step.count / (funnel.landingViewed || 1)) * 100);

            return (
              <div key={step.label} className="p-2.5 rounded-xl bg-[#f8fafc] border border-[#e1e7ef] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {step.icon}
                    <span className="text-[#0b111e] font-bold">{step.label}</span>
                  </div>
                  <span className="font-mono font-bold text-[#1f3861]">
                    {step.count} ({pct}%)
                  </span>
                </div>
                <div className="w-full bg-[#e1e7ef] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#1f3861] transition-all duration-500"
                    style={{ width: `${Math.max(5, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw Event Inspector */}
      <div className="p-5 rounded-2xl bg-white border border-[#e1e7ef] shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-[#0b111e] uppercase tracking-wider">
          Recent activity
        </h3>

        <div className="max-h-64 overflow-y-auto space-y-2 pr-2 font-mono text-[11px]">
          {(stats.recentEvents || []).map((evt: any) => (
            <div key={evt.id} className="p-2 rounded-lg bg-[#f8fafc] border border-[#e1e7ef] flex items-center justify-between">
              <div>
                <span className="text-[#1f3861] font-bold">{evt.eventName}</span>
                <span className="text-[#344256] ml-2">[{evt.screenName || 'Audit'}]</span>
              </div>
              <span className="text-[#344256] text-[10px] font-medium">{new Date(evt.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
