import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlacementLayout } from '../../layouts/PlacementLayout';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Clock,
  Mail,
  Send,
  Download,
  Filter,
  ArrowUpDown,
  Check,
} from 'lucide-react';

interface Student {
  id: string;
  name: string;
  rollNo?: string;
  phone?: string;
  department?: string;
  academicYear?: string;
  status: 'completed' | 'started' | 'invited';
  targetRole?: string;
  readinessScore?: number | null;
  completedAt?: string | null;
}

const STATUS_CONFIG: Record<
  Student['status'],
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200/80',
    icon: CheckCircle2,
  },
  started: {
    label: 'In Progress',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200/80',
    icon: Clock,
  },
  invited: {
    label: 'Invited',
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
    icon: Mail,
  },
};

export function StudentsPage() {
  const navigate = useNavigate();
  const { collegeContext } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Student['status']>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [remindedIds, setRemindedIds] = useState<Set<string>>(new Set());

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const collegeId = collegeContext?.collegeId;
      const res = await fetch(
        `/api/college/dashboard${collegeId ? `?collegeId=${collegeId}` : ''}`
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const json = await res.json();
      const raw = Array.isArray(json?.students) ? json.students : [];
      setStudents(raw);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load students.');
    } finally {
      setLoading(false);
    }
  }, [collegeContext?.collegeId]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleRemind = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRemindedIds((prev) => new Set([...prev, studentId]));
    setTimeout(() => {
      setRemindedIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }, 3000);
  };

  const departments = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.department) set.add(s.department);
    });
    return Array.from(set);
  }, [students]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        !q ||
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.rollNo ?? '').toLowerCase().includes(q) ||
        (s.department ?? '').toLowerCase().includes(q) ||
        (s.targetRole ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchDept = deptFilter === 'all' || s.department === deptFilter;
      return matchSearch && matchStatus && matchDept;
    });
  }, [students, search, statusFilter, deptFilter]);

  // Statistics counters
  const totalCount = students.length;
  const completedCount = students.filter((s) => s.status === 'completed').length;
  const startedCount = students.filter((s) => s.status === 'started').length;
  const invitedCount = students.filter((s) => s.status === 'invited').length;

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const headers = ['Name', 'Roll Number', 'Department', 'Status', 'Target Role', 'Readiness Score'];
    const rows = filtered.map((s) => [
      `"${s.name || ''}"`,
      `"${s.rollNo || ''}"`,
      `"${s.department || ''}"`,
      `"${s.status}"`,
      `"${s.targetRole || ''}"`,
      s.readinessScore ?? '',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `careervoice_students_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <PlacementLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-[#0b111d]">
                Student Directory
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {totalCount} Total
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Monitor individual student progress, verified career directions, and diagnostic readiness scores.
            </p>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={handleExportCSV}
              disabled={filtered.length === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-[#e2e8f0] shadow-xs disabled:opacity-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </button>
            <button
              onClick={fetchStudents}
              title="Refresh"
              className="p-2 bg-white hover:bg-slate-50 border border-[#e2e8f0] text-slate-600 rounded-lg shadow-xs transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'all'
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-[#e2e8f0] hover:border-slate-300'
            }`}
          >
            <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
              Total Cohort
            </p>
            <p className={`text-2xl font-bold mt-1 font-mono ${statusFilter === 'all' ? 'text-white' : 'text-[#0b111d]'}`}>
              {totalCount}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter('completed')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'completed'
                ? 'bg-emerald-700 border-emerald-700 text-white'
                : 'bg-white border-[#e2e8f0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'completed' ? 'text-emerald-100' : 'text-slate-500'}`}>
                Completed
              </p>
              <CheckCircle2 className={`w-3.5 h-3.5 ${statusFilter === 'completed' ? 'text-emerald-200' : 'text-emerald-600'}`} />
            </div>
            <p className={`text-2xl font-bold mt-1 font-mono ${statusFilter === 'completed' ? 'text-white' : 'text-emerald-700'}`}>
              {completedCount}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter('started')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'started'
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'bg-white border-[#e2e8f0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'started' ? 'text-amber-100' : 'text-slate-500'}`}>
                In Progress
              </p>
              <Clock className={`w-3.5 h-3.5 ${statusFilter === 'started' ? 'text-amber-200' : 'text-amber-600'}`} />
            </div>
            <p className={`text-2xl font-bold mt-1 font-mono ${statusFilter === 'started' ? 'text-white' : 'text-amber-700'}`}>
              {startedCount}
            </p>
          </div>

          <div
            onClick={() => setStatusFilter('invited')}
            className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs ${
              statusFilter === 'invited'
                ? 'bg-slate-700 border-slate-700 text-white'
                : 'bg-white border-[#e2e8f0] hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <p className={`text-xs font-semibold uppercase tracking-wider ${statusFilter === 'invited' ? 'text-slate-200' : 'text-slate-500'}`}>
                Needs Action
              </p>
              <Mail className={`w-3.5 h-3.5 ${statusFilter === 'invited' ? 'text-slate-300' : 'text-slate-400'}`} />
            </div>
            <p className={`text-2xl font-bold mt-1 font-mono ${statusFilter === 'invited' ? 'text-white' : 'text-slate-700'}`}>
              {invitedCount}
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg flex-1 shadow-xs">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, roll number, department, or role…"
              className="flex-1 text-sm bg-transparent outline-none text-[#0b111d] placeholder:text-slate-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {departments.length > 0 && (
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-medium text-slate-700 outline-none shadow-xs"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            )}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="px-3.5 py-2.5 bg-white border border-[#e2e8f0] rounded-lg text-xs font-medium text-slate-700 outline-none shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="started">In Progress</option>
              <option value="invited">Invited</option>
            </select>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 bg-white border border-[#e2e8f0] rounded-xl shadow-xs">
            <Loader2 className="w-7 h-7 animate-spin text-[#ea580c] mb-3" />
            <span className="text-sm font-medium text-slate-600">Loading student directory…</span>
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="bg-red-50/80 border border-red-200 rounded-xl p-5 flex items-start gap-3.5 shadow-xs">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-900">Could not load students</h3>
              <p className="text-xs text-red-700 mt-1">{error}</p>
              <button
                onClick={fetchStudents}
                className="mt-3 text-xs font-semibold text-red-700 hover:text-red-900 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && students.length === 0 && (
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-12 flex flex-col items-center gap-4 text-center shadow-xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-[#0b111d]">No student records found</h3>
            <p className="text-sm text-slate-600 max-w-sm">
              Create a campaign and distribute invite links to start tracking student diagnostic assessments.
            </p>
            <button
              onClick={() => navigate('/placement/campaigns/new')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-[#ea580c] hover:bg-[#c2410c] shadow-xs active:scale-[0.98] transition-all"
            >
              Create Placement Campaign
            </button>
          </div>
        )}

        {/* No Results for filter */}
        {!loading && !error && students.length > 0 && filtered.length === 0 && (
          <div className="bg-white border border-[#e2e8f0] rounded-xl p-10 flex flex-col items-center gap-3 text-center shadow-xs">
            <Search className="w-7 h-7 text-slate-300" />
            <h3 className="text-sm font-bold text-[#0b111d]">No students match your filter criteria</h3>
            <p className="text-xs text-slate-500">Try adjusting your search query or selected filters.</p>
            <button
              onClick={() => {
                setSearch('');
                setStatusFilter('all');
                setDeptFilter('all');
              }}
              className="text-xs font-semibold text-[#ea580c] hover:underline"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Student Table */}
        {!loading && !error && filtered.length > 0 && (
          <div className="bg-white border border-[#e2e8f0] rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/90 border-b border-[#e2e8f0] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-3.5">Student</th>
                    <th className="px-5 py-3.5 hidden sm:table-cell">Department</th>
                    <th className="px-5 py-3.5 hidden md:table-cell">Verified Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-center">Score</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filtered.map((student) => {
                    const statusConf = STATUS_CONFIG[student.status];
                    const StatusIcon = statusConf.icon;
                    const hasReminded = remindedIds.has(student.id);

                    return (
                      <tr
                        key={student.id}
                        onClick={() => navigate(`/placement/students/${student.id}`)}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                      >
                        {/* Student Name & Roll No */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#f0f4fa] border border-[#d6e2ee] flex items-center justify-center text-xs font-bold text-[#1f3861] flex-shrink-0">
                              {(student.name ?? '?')[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-[#0b111d] truncate">
                                {student.name || 'Unnamed Student'}
                              </p>
                              {student.rollNo && (
                                <p className="text-xs text-slate-500 font-mono truncate">
                                  {student.rollNo}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-3.5 hidden sm:table-cell">
                          <span className="text-xs text-slate-600 font-medium truncate block max-w-[180px]">
                            {student.department || '—'}
                          </span>
                        </td>

                        {/* Career Direction */}
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-xs text-slate-800 font-medium truncate block max-w-[200px]">
                            {student.targetRole || 'Not finalized'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusConf.bg} ${statusConf.text} ${statusConf.border}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            {statusConf.label}
                          </span>
                        </td>

                        {/* Score */}
                        <td className="px-5 py-3.5 text-center">
                          {student.readinessScore !== null && student.readinessScore !== undefined ? (
                            <span
                              className={`inline-block px-2 py-0.5 rounded-md font-mono text-xs font-bold tabular-nums ${
                                student.readinessScore >= 80
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : student.readinessScore >= 60
                                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {student.readinessScore}%
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 font-mono">—</span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3.5 text-right">
                          {student.status !== 'completed' ? (
                            <button
                              type="button"
                              onClick={(e) => handleRemind(student.id, e)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium shadow-2xs transition-all cursor-pointer ${
                                hasReminded
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-[#e2e8f0]'
                              }`}
                            >
                              {hasReminded ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Nudge Sent</span>
                                </>
                              ) : (
                                <>
                                  <Send className="w-3 h-3 text-slate-400" />
                                  <span>Remind</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/placement/students/${student.id}`);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-[#1f3861] bg-[#f0f4fa] hover:bg-[#e4ecf7] border border-[#d6e2ee] transition-all cursor-pointer"
                            >
                              View Student
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="px-5 py-3 bg-slate-50 border-t border-[#e2e8f0] flex items-center justify-between text-xs text-slate-500">
              <span>
                Showing <strong className="text-slate-700 font-mono">{filtered.length}</strong> of{' '}
                <strong className="text-slate-700 font-mono">{students.length}</strong> students
              </span>
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="text-xs text-[#ea580c] font-semibold hover:underline"
                >
                  Show all
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </PlacementLayout>
  );
}
