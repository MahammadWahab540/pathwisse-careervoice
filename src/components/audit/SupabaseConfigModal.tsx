import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle2, AlertCircle, Copy, Check, ExternalLink, X, Shield } from 'lucide-react';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({ isOpen, onClose }) => {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch('/api/supabase/status')
        .then((res) => res.json())
        .then((data) => {
          setStatus(data);
          setIsLoading(false);
        })
        .catch(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copySchema = () => {
    if (status?.schemaSql) {
      navigator.clipboard.writeText(status.schemaSql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-left space-y-4 max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-700 font-bold">
                Backend-as-a-Service
              </span>
              <h3 className="text-sm font-bold text-[#0b111e]">Supabase Database & Auth</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#0b111e] flex items-center gap-1.5">
              Connection Status
            </span>
            {isLoading ? (
              <span className="text-[10px] text-slate-500 font-mono">Checking connection...</span>
            ) : status?.connected ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Connected & Active
              </span>
            ) : status?.configured ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-amber-600" /> Credentials Present, Schema Pending
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                Awaiting Configuration
              </span>
            )}
          </div>
          <p className="text-xs text-slate-600 font-medium">
            {status?.message || 'Connecting to Supabase...'}
          </p>
        </div>

        {/* Setup Instructions */}
        <div className="space-y-2 text-xs text-slate-600 font-medium leading-relaxed">
          <h4 className="font-bold text-[#0b111e] uppercase tracking-wider text-[11px]">
            Supabase Connection Steps:
          </h4>
          <ol className="list-decimal pl-4 space-y-1.5">
            <li>
              Go to your{' '}
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noreferrer"
                className="text-[#1f3861] font-bold underline inline-flex items-center gap-0.5"
              >
                Supabase Dashboard <ExternalLink className="w-2.5 h-2.5" />
              </a>{' '}
              and copy your <strong>Project URL</strong> and <strong>anon key</strong>.
            </li>
            <li>
              Add them in the AI Studio <strong>Settings &gt; Environment Secrets</strong>:
              <ul className="list-disc pl-4 mt-1 font-mono text-[11px] text-slate-700 space-y-0.5">
                <li><code className="text-[#1f3861] font-bold">SUPABASE_URL</code></li>
                <li><code className="text-[#1f3861] font-bold">SUPABASE_ANON_KEY</code></li>
              </ul>
            </li>
            <li>
              Run the SQL schema below in your <strong>Supabase SQL Editor</strong> to create the tables.
            </li>
          </ol>
        </div>

        {/* Schema Copy Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              SQL Schema for Supabase Editor
            </span>
            <button
              onClick={copySchema}
              className="text-[11px] font-bold text-[#1f3861] hover:text-[#182c4d] flex items-center gap-1 cursor-pointer bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg transition"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy SQL
                </>
              )}
            </button>
          </div>
          <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl text-[10px] font-mono overflow-x-auto max-h-40 border border-slate-800">
            {status?.schemaSql || '-- Loading schema...'}
          </pre>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 px-4 rounded-full bg-[#1f3861] hover:bg-[#182c4d] text-white font-bold text-xs sm:text-sm shadow-sm transition active:scale-[0.98] cursor-pointer"
        >
          Done
        </button>
      </motion.div>
    </div>
  );
};
