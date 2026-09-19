import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { Button, Badge, Card, EmptyState, Skeleton } from '../../components/ui';
import {
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Download,
  Mail,
  User,
  GraduationCap,
  Target,
  ExternalLink,
} from 'lucide-react';

interface StudentDossier {
  id: string;
  studentId: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  year: string;
  rollNo?: string;
  targetRole: string;
  readinessScore: number;
  benchmark: number;
  status: 'Ready' | 'Attention Required' | 'Developing';
  strengths: string[];
  gaps: string[];
  evidenceCount: number;
  lastAssessedAt: string;
}

export function StudentDossierPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentDossier | null>(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      // Mock / fallback candidate dossier
      const sid = studentId || 'std-2026-01';
      setStudent({
        id: sid,
        studentId: sid,
        name: sid === 'd0025cd5' ? 'Aarav Sharma' : `Candidate ${sid.slice(0, 8)}`,
        email: `${sid.slice(0, 8)}@campus.edu`,
        phone: '+91 98765 43210',
        department: 'Computer Science and Engineering',
        year: '4th Year (2026 Batch)',
        rollNo: `22CS${Math.floor(100 + Math.random() * 900)}`,
        targetRole: 'Cloud Infrastructure & DevOps Engineer',
        readinessScore: 82,
        benchmark: 80,
        status: 'Ready',
        strengths: [
          'Demonstrated hands-on familiarity with container orchestration (Docker / Kubernetes)',
          'Clear conceptual grasp of distributed reliability and CI/CD automation',
          'Structured problem-solving during architectural interview prompt',
        ],
        gaps: [
          'Observability pipelines (Prometheus / Grafana query writing under latency spikes)',
          'Production disaster recovery runbook formulation and backup testing',
        ],
        evidenceCount: 9,
        lastAssessedAt: new Date().toISOString(),
      });
      setLoading(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [studentId]);

  return (
    <PlacementLayout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6 selection:bg-[#1f3861] selection:text-white">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#64748b]">
          <button
            type="button"
            onClick={() => navigate('/placement/students')}
            className="flex items-center gap-1.5 font-semibold text-[#1f3861] hover:text-[#0b111d] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Students</span>
          </button>
          <span>/</span>
          <span className="text-[#0b111d] font-medium truncate max-w-[200px]">
            {student?.name || 'Candidate Dossier'}
          </span>
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton variant="text" className="w-64 h-8" />
            <Skeleton variant="rectangular" className="w-full h-32" />
            <Skeleton variant="rectangular" className="w-full h-64" />
          </div>
        ) : !student ? (
          <EmptyState
            title="Candidate Record Not Found"
            description="The requested student dossier could not be located."
            primaryAction={{
              label: 'Return to Student Directory',
              onClick: () => navigate('/placement/students'),
            }}
          />
        ) : (
          <>
            {/* Header / Identity Banner */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#f0f4fa] text-[#1f3861] border border-[#d6e2ee] flex items-center justify-center font-extrabold text-xl flex-shrink-0 shadow-xs">
                    {student.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={student.status === 'Ready' ? 'success' : 'warning'}
                        size="sm"
                      >
                        {student.status.toUpperCase()}
                      </Badge>
                      <span className="text-xs font-mono text-[#94a3b8]">
                        Roll: {student.rollNo}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0b111d] tracking-tight">
                      {student.name}
                    </h1>
                    <p className="text-xs sm:text-sm text-[#64748b]">
                      {student.department} · {student.year}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 p-4 sm:p-0 bg-[#f8fafc] sm:bg-transparent rounded-xl border sm:border-0 border-[#e2e8f0]">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                    Signal Score
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-[#0b111d]">
                      {student.readinessScore}
                    </span>
                    <span className="text-xs font-bold text-[#94a3b8]">/100</span>
                  </div>
                  <span className="text-xs text-[#64748b]">
                    Target: <strong className="font-mono text-[#0b111d]">{student.benchmark}</strong>
                  </span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-6 pt-6 border-t border-[#e2e8f0] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#64748b]">Assessed Role:</span>
                  <span className="text-xs font-bold text-[#1f3861] px-2.5 py-1 rounded-md bg-[#f0f4fa] border border-[#d6e2ee]">
                    {student.targetRole}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Mail className="w-3.5 h-3.5" />}
                    onClick={() => navigate('/placement/messages')}
                  >
                    Send Nudge
                  </Button>
                  <Button
                    variant="navy"
                    size="sm"
                    leftIcon={<Download className="w-3.5 h-3.5" />}
                    onClick={() => alert(`Downloading dossier for ${student.name}`)}
                  >
                    Export Dossier (PDF)
                  </Button>
                </div>
              </div>
            </div>

            {/* Diagnostic Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Strengths */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verified Competencies</span>
                </div>
                <ul className="space-y-3">
                  {student.strengths.map((str, idx) => (
                    <li key={idx} className="text-xs text-[#334155] leading-relaxed flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Priority Gaps */}
              <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Critical Skill Gaps</span>
                </div>
                <ul className="space-y-3">
                  {student.gaps.map((gap, idx) => (
                    <li key={idx} className="text-xs text-[#334155] leading-relaxed flex items-start gap-2.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Evidence Considered */}
            <div className="bg-white rounded-2xl border border-[#e2e8f0] p-6 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-[#64748b]" />
                <div>
                  <h3 className="text-xs font-bold text-[#0b111d]">Evidence Ledger Recorded</h3>
                  <p className="text-xs text-[#64748b]">
                    {student.evidenceCount} verified responses, project links, and resume signals analyzed.
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono font-bold text-[#1f3861] bg-[#f0f4fa] px-3 py-1.5 rounded-lg border border-[#d6e2ee]">
                Verified
              </span>
            </div>
          </>
        )}
      </div>
    </PlacementLayout>
  );
}
