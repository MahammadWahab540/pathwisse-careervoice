import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileUp, Link2, ShieldCheck } from 'lucide-react';
import type { AdaptiveEvidenceSubmission, EvidenceUploadRequestArgs } from '../../ai/qalamTools';

interface EvidenceUploadRequestCardProps {
  data: EvidenceUploadRequestArgs;
  onSubmit?: (submission: AdaptiveEvidenceSubmission) => void;
}

export const EvidenceUploadRequestCard: React.FC<EvidenceUploadRequestCardProps> = ({ data, onSubmit }) => {
  const [fileName, setFileName] = useState('');
  const [url, setUrl] = useState('');
  const [note, setNote] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = () => {
    if (!fileName && !url && !note.trim()) return;
    onSubmit?.({
      skillName: data.skillName,
      ...(fileName ? { fileName } : {}),
      ...(url.trim() ? { url: url.trim() } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm font-black text-emerald-900">Evidence added</p>
          <p className="mt-1 text-[11px] font-medium leading-relaxed text-emerald-800">Qalam can use this proof when the audit is evaluated.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-3 text-left">
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-amber-50 text-amber-700"><FileUp className="h-4 w-4" /></span>
          <p className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-700">Proof needed</p>
        </div>
        <h3 className="text-lg font-black tracking-tight text-[#0b111e]">Show evidence for {data.skillName}</h3>
        <p className="mt-1 text-[11px] font-medium leading-relaxed text-slate-600">{data.prompt || data.reason}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {data.acceptedEvidence.map((item) => (
          <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-bold text-slate-600">{item}</span>
        ))}
      </div>

      <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 transition hover:border-[#1f3861] hover:bg-white">
        <FileUp className="h-4 w-4 shrink-0 text-[#1f3861]" />
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-600">{fileName || 'Choose proof file'}</span>
        <input
          type="file"
          className="sr-only"
          onChange={(event) => setFileName(event.target.files?.[0]?.name || '')}
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.txt,.zip"
        />
      </label>

      <div className="relative">
        <Link2 className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="GitHub, portfolio, demo or certificate URL"
          className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-[11px] font-semibold text-slate-800 outline-none transition focus:border-[#1f3861]"
        />
      </div>

      <textarea
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional: tell Qalam what this proves"
        rows={2}
        className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-[11px] font-semibold text-slate-800 outline-none transition focus:border-[#1f3861]"
      />

      <button
        type="button"
        onClick={submit}
        disabled={!fileName && !url.trim() && !note.trim()}
        className="w-full rounded-2xl bg-[#1f3861] px-4 py-2.5 text-xs font-black text-white shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
      >
        Attach evidence to this audit
      </button>
      {data.required === false && <p className="text-center text-[9px] font-semibold text-slate-400">Optional. You can continue the conversation without uploading.</p>}
    </div>
  );
};
