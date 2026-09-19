import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { Button, Badge, Card, EmptyState } from '../../components/ui';
import { ArrowLeft, Download, FileText, Calendar, CheckCircle2, ShieldCheck } from 'lucide-react';

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();

  return (
    <PlacementLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 selection:bg-[#1f3861] selection:text-white">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <button
            type="button"
            onClick={() => navigate('/placement/reports')}
            className="flex items-center gap-1.5 font-semibold text-[#1f3861] hover:text-[#0b111d] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Reports</span>
          </button>
          <span>/</span>
          <span className="text-[#0b111d] font-medium truncate max-w-[200px]">
            Report {reportId}
          </span>
        </div>

        {/* Report Overview Card */}
        <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant="navy" size="sm">
                  ACCREDITATION LEDGER
                </Badge>
                <span className="text-xs font-mono text-[#94a3b8] tabular-nums">ID: {reportId}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[#0b111d] tracking-tight">
                NIRF / NAAC Employability Audit Extract
              </h1>
              <p className="text-xs text-[#64748b]">
                Comprehensive institutional diagnostic evidence export for regulatory reporting.
              </p>
            </div>

            <Button
              variant="navy"
              size="md"
              leftIcon={<Download className="w-4 h-4" />}
              onClick={() => alert(`Exporting Report ${reportId}`)}
            >
              Export Report Data (CSV)
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] space-y-2 text-xs text-[#334155]">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0b111d]">Report Type:</span>
              <span>Accreditation Verification & Outcome Ledger</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0b111d]">Generated At:</span>
              <span className="font-mono tabular-nums">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#0b111d]">Verification Hash:</span>
              <span className="font-mono text-[#64748b]">sha256-verified-cv-ledger</span>
            </div>
          </div>
        </div>
      </div>
    </PlacementLayout>
  );
}
