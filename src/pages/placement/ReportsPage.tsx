import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import {
  FileText,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Award,
  BarChart2,
  Users,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface ReportItem {
  id: string;
  title: string;
  category: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  format: string;
  recommendedFor: string;
}

export function ReportsPage() {
  const { collegeContext } = useAuth();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedId, setDownloadedId] = useState<string | null>(null);

  const reports: ReportItem[] = [
    {
      id: 'cohort-summary',
      title: 'Cohort Career Direction & Readiness Summary',
      category: 'Diagnostic Overview',
      description:
        'Comprehensive aggregate distribution of verified target roles, readiness scores, and primary skill gap insights across all active placement campaigns.',
      icon: BarChart2,
      badge: 'Core Report',
      format: 'PDF Report (A4)',
      recommendedFor: 'T&P Leadership & Deans',
    },
    {
      id: 'accreditation-dossier',
      title: 'NIRF & NAAC Employability Evidence Dossier',
      category: 'Accreditation Compliance',
      description:
        'Formal verified documentation of student diagnostic career assessments, department participation ratios, and competency evidence suitable for regulatory submission.',
      icon: Award,
      badge: 'Accreditation',
      format: 'Formal PDF Dossier',
      recommendedFor: 'IQAC & Accreditation Committees',
    },
    {
      id: 'dept-matrix',
      title: 'Department-Wise Competency Matrix',
      category: 'Department Analysis',
      description:
        'Side-by-side comparative readiness analysis across Engineering disciplines (CSE, IT, ECE, Mech, Civil) highlighting strengths and high-priority training interventions.',
      icon: Building2,
      badge: 'Comparative',
      format: 'Excel (.xlsx) / CSV',
      recommendedFor: 'Heads of Departments (HODs)',
    },
    {
      id: 'recruiter-shortlist',
      title: 'Recruiter-Ready Student Shortlist',
      category: 'Placement Drives',
      description:
        'Filtered roster of placement-ready students categorized by verified domain fit, demonstrated problem-solving skills, and verified technical readiness scores.',
      icon: Users,
      badge: 'Placement Drive',
      format: 'CSV Roster',
      recommendedFor: 'Visiting Corporate Recruiters',
    },
  ];

  const handleDownload = (report: ReportItem) => {
    setDownloadingId(report.id);
    setTimeout(() => {
      setDownloadingId(null);
      setDownloadedId(report.id);
      setTimeout(() => setDownloadedId(null), 3000);
    }, 1200);
  };

  return (
    <PlacementLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-[#0b111d]">
              Placement &amp; Accreditation Reports
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Data
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Export diagnostic cohort summaries, accreditation compliance packs, and department benchmark reports for {collegeContext?.collegeName ?? 'your institution'}.
          </p>
        </div>

        {/* Institution Context Banner */}
        <div className="bg-white border border-[#e2e8f0] rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-600">
            <div className="flex items-center gap-1.5 font-semibold text-slate-900">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>{collegeContext?.collegeName ?? 'Partner Institution'}</span>
            </div>
            <div className="flex items-center gap-1.5 font-mono">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{collegeContext?.targetBatch ?? '2026'} Passing Out Cohort</span>
            </div>
            <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>CareerVoice Diagnostic Standard 2.0</span>
            </div>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {reports.map((report) => {
            const Icon = report.icon;
            const isDownloading = downloadingId === report.id;
            const isDownloaded = downloadedId === report.id;

            return (
              <div
                key={report.id}
                className="bg-white border border-[#e2e8f0] hover:border-slate-300 rounded-xl p-6 shadow-xs flex flex-col justify-between transition-all"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-50 border border-orange-100 flex items-center justify-center text-[#ea580c]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      {report.badge}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      {report.category}
                    </span>
                    <h3 className="font-bold text-base text-[#0b111d] mt-0.5">
                      {report.title}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {report.description}
                  </p>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Format: <strong className="text-slate-700 font-mono">{report.format}</strong></span>
                    <span>For: <strong className="text-slate-700">{report.recommendedFor}</strong></span>
                  </div>
                </div>

                <div className="pt-5 mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/placement/reports/${report.id}`)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-[#1f3861] bg-[#f0f4fa] hover:bg-[#e4ecf7] border border-[#d6e2ee] transition-all cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => handleDownload(report)}
                    disabled={isDownloading}
                    className={`flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                      isDownloaded
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : report.id === 'cohort-summary'
                        ? 'bg-[#ea580c] hover:bg-[#c2410c] text-white'
                        : 'bg-white hover:bg-slate-50 text-slate-800 border border-[#e2e8f0]'
                    }`}
                  >
                    {isDownloading ? (
                      <span className="animate-pulse">Generating…</span>
                    ) : isDownloaded ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Done</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Export CSV</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </PlacementLayout>
  );
}
